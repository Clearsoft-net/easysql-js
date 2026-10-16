/**
 * DuckDB connector: local schema introspection and query execution.
 *
 * Uses the official `@duckdb/node-api` client (an optional peer dependency).
 * The driver exposes promise-returning methods, so the lifecycle mirrors
 * {@link SqliteConnector} but is awaited. The database is opened explicitly
 * with {@link DuckDbConnector.connect} and released with
 * {@link DuckDbConnector.close}. No state survives a connection.
 */

import type { DuckDBConnection, DuckDBValue } from "@duckdb/node-api";
import { DuckDBInstance } from "@duckdb/node-api";
import { BaseConnector } from "../base-connector.js";
import { toNullableNumber, toOrdinal } from "../internal.js";
import type { ColumnRow, RawQueryResult, TableRow } from "../types.js";
import { columnsQuery, constraintsQuery, tablesQuery } from "./queries.js";
import type {
  ConstraintRow,
  DuckDbConnectionConfig,
  DuckDbHandles,
  IntrospectResult,
  RawColumn,
  RawTable,
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
      const tablesQ = tablesQuery();
      const tableRows = await readAll<TableRow>(connection, tablesQ.text, tablesQ.values);

      const constraintsQ = constraintsQuery();
      const constraintRows = await readAll<ConstraintRow>(
        connection,
        constraintsQ.text,
        constraintsQ.values,
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
        const columnsQ = columnsQuery(row.table_name);
        const columns = await readAll<ColumnRow>(connection, columnsQ.text, columnsQ.values);

        tables.push({
          name: row.table_name,
          columns: columns.map((column) =>
            toRawColumn(
              column,
              primaryKeys.get(row.table_name) ?? new Set(),
              foreignKeys.get(row.table_name) ?? new Map(),
            ),
          ),
          rowsApprox: toNullableNumber(row.rows_approx),
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
  values?: unknown[],
): Promise<T[]> {
  const reader = await connection.runAndReadAll(
    sql,
    values ? (values as DuckDBValue[]) : undefined,
  );
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
    nullable: primaryKey ? false : row.is_nullable === true,
    primaryKey,
    defaultValue: row.column_default,
    foreignKey: foreignKeys.get(row.column_name) ?? null,
    ordinal: toOrdinal(row.ordinal),
  };
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
