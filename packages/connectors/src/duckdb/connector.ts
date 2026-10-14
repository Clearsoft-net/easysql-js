/**
 * DuckDB connector: local schema introspection and query execution.
 *
 * Uses the official `@duckdb/node-api` client (an optional peer dependency).
 * The driver exposes promise-returning methods, so the lifecycle mirrors
 * {@link SqliteConnector} but is awaited. The database is opened explicitly
 * with {@link DuckDbConnector.connect} and released with
 * {@link DuckDbConnector.close}. No state survives a connection.
 */

import type { DuckDBConnection } from "@duckdb/node-api";
import { DuckDBInstance } from "@duckdb/node-api";
import { BaseConnector } from "../base-connector.js";
import type {
  ColumnRow,
  ConstraintRow,
  DuckDbConnectionConfig,
  DuckDbHandles,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

export class DuckDbConnector extends BaseConnector<DuckDbHandles> {
  private readonly config: Required<DuckDbConnectionConfig>;

  constructor(config: DuckDbConnectionConfig) {
    super([]);
    if (!config.file) throw new Error("DuckDbConnector: file is required");
    this.config = {
      file: config.file,
      readonly: config.readonly ?? true,
    };
  }

  /** Opens the database. Safe to call more than once. */
  protected async openHandle(): Promise<DuckDbHandles> {
    const instance = await DuckDBInstance.create(
      this.config.file === ":memory:" ? undefined : this.config.file,
      // Read-only is a file-database setting; an in-memory database has
      // nothing to protect and DuckDB rejects the combination.
      this.config.readonly && this.config.file !== ":memory:" ? { access_mode: "READ_ONLY" } : {},
    );
    const connection = await instance.connect();
    return { instance, connection };
  }

  /** Closes the database. Safe to call when not connected. */
  protected async closeHandle({ instance, connection }: DuckDbHandles): Promise<void> {
    try {
      connection.closeSync();
      instance.closeSync();
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Introspects the database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const { connection } = this.requireHandle();
    try {
      const tableRows = await readAll<TableRow>(
        connection,
        `SELECT table_name, estimated_size
         FROM duckdb_tables()
         WHERE NOT internal
           AND database_name = current_database()
           AND schema_name = current_schema()
         ORDER BY table_name`,
      );

      const constraintRows = await readAll<ConstraintRow>(
        connection,
        `SELECT table_name,
                constraint_type,
                constraint_column_names,
                referenced_table,
                referenced_column_names
         FROM duckdb_constraints()
         WHERE database_name = current_database()
           AND schema_name = current_schema()
         ORDER BY table_name, constraint_index`,
      );

      const primaryKeys = new Map<string, Set<string>>();
      const foreignKeys = new Map<string, Map<string, { table: string; column: string }>>();
      for (const constraint of constraintRows) {
        const table = constraint.table_name;
        if (constraint.constraint_type === "PRIMARY KEY") {
          primaryKeys.set(table, new Set(constraint.constraint_column_names));
          continue;
        }
        if (constraint.constraint_type !== "FOREIGN KEY" || !constraint.referenced_table) continue;
        const byColumn = foreignKeys.get(table) ?? new Map();
        const referenced = constraint.referenced_column_names ?? [];
        constraint.constraint_column_names.forEach((column, index) => {
          const referencedColumn = referenced[index];
          if (referencedColumn) {
            byColumn.set(column, {
              table: constraint.referenced_table as string,
              column: referencedColumn,
            });
          }
        });
        foreignKeys.set(table, byColumn);
      }

      const tables: RawTable[] = [];
      for (const row of tableRows) {
        const columns = await readAll<ColumnRow>(
          connection,
          `SELECT column_name,
                  column_index,
                  data_type,
                  is_nullable,
                  column_default
           FROM duckdb_columns()
           WHERE database_name = current_database()
             AND schema_name = current_schema()
             AND table_name = ?
           ORDER BY column_index`,
          [row.table_name],
        );

        tables.push({
          name: row.table_name,
          columns: columns.map((column) =>
            toRawColumn(
              column,
              primaryKeys.get(row.table_name) ?? new Set(),
              foreignKeys.get(row.table_name) ?? new Map(),
            ),
          ),
          rowsApprox: toNullableNumber(row.estimated_size),
        });
      }

      return { engine: "duckdb", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs `sql` and reports its columns and raw rows. */
  protected async runQuery({ connection }: DuckDbHandles, sql: string): Promise<RawQueryResult> {
    const reader = await connection.runAndReadAll(sql);
    const columns = reader.columnNames();
    if (columns.length === 0) return { columns: [], rows: [], rowCount: reader.rowsChanged };
    return {
      columns,
      // `normalizeRow` runs here so bigint values are made JSON-safe before
      // the base class projects each row onto the reported columns.
      rows: (reader.getRowObjectsJS() as Record<string, unknown>[]).map(normalizeRow),
    };
  }
}

/** Runs a statement and materialises its rows. */
async function readAll<T>(
  connection: DuckDBConnection,
  sql: string,
  values?: (string | number)[],
): Promise<T[]> {
  const reader = await connection.runAndReadAll(sql, values);
  return reader.getRowObjectsJS() as T[];
}

function toRawColumn(
  row: ColumnRow,
  primaryKeys: Set<string>,
  foreignKeys: Map<string, { table: string; column: string }>,
): RawColumn {
  const primaryKey = primaryKeys.has(row.column_name);
  return {
    name: row.column_name,
    dataType: row.data_type,
    // A primary key is never nullable; DuckDB reports NOT NULL separately,
    // but the constraint is authoritative.
    nullable: primaryKey ? false : row.is_nullable,
    primaryKey,
    defaultValue: row.column_default,
    foreignKey: foreignKeys.get(row.column_name) ?? null,
    ordinal: row.column_index,
  };
}

function toNullableNumber(value: number | bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * DuckDB returns BIGINT/HUGEINT values as `bigint`, which JSON cannot
 * serialise. Keep exactness where a `number` would lose it.
 */
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) out[key] = normalizeValue(value);
  return out;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value !== "bigint") return value;
  const asNumber = Number(value);
  return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
}
