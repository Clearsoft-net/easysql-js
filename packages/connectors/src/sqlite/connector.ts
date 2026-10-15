/**
 * SQLite connector: local schema introspection and query execution.
 *
 * Uses Node's built-in `node:sqlite` (available in Node >= 22.5 and Bun), so
 * the package has no native dependency. The database is opened explicitly with
 * {@link SqliteConnector.connect} and released with
 * {@link SqliteConnector.close}. No state survives a connection.
 */

import { DatabaseSync } from "node:sqlite";
import { SyncBaseConnector } from "../base-connector.js";
import { foreignKeyListQuery, rowCountQuery, tableInfoQuery, tablesQuery } from "./queries.js";
import type {
  ColumnRow,
  ForeignKeyRow,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
  SqliteConnectionConfig,
} from "./types.js";

export class SqliteConnector extends SyncBaseConnector<DatabaseSync> {
  private readonly config: Required<Pick<SqliteConnectionConfig, "file" | "readonly">>;

  constructor(config: SqliteConnectionConfig) {
    super([]);
    if (!config.file) throw new Error("SqliteConnector: file is required");
    this.config = {
      file: config.file,
      readonly: config.readonly ?? true,
    };
  }

  /** Opens the database. Safe to call more than once. */
  protected openHandle(): DatabaseSync {
    return new DatabaseSync(this.config.file, { readOnly: this.config.readonly });
  }

  /** Closes the database and clears it. Safe to call when not connected. */
  protected closeHandle(db: DatabaseSync): void {
    db.close();
  }

  /** Runs `sql`, reporting the affected-row count for statements with no projection. */
  protected runQuery(db: DatabaseSync, sql: string): RawQueryResult {
    const statement = db.prepare(sql);
    const columns = statement.columns().map((column) => column.name);
    if (columns.length === 0) {
      return { columns: [], rows: [], rowCount: Number(statement.run().changes) };
    }
    return { columns, rows: statement.all() as unknown as Record<string, unknown>[] };
  }

  /** Introspects the database and returns the raw schema. */
  introspect(): IntrospectResult {
    const db = this.requireHandle();
    try {
      const tableRows = db.prepare(tablesQuery().text).all() as { name: string }[];

      const tables: RawTable[] = [];
      for (const { name } of tableRows) {
        const columns = db.prepare(tableInfoQuery(name)).all() as unknown as ColumnRow[];
        const foreignKeys = db
          .prepare(foreignKeyListQuery(name))
          .all() as unknown as ForeignKeyRow[];

        const fkByColumn = new Map<string, { table: string; column: string }>();
        for (const fk of foreignKeys) {
          fkByColumn.set(fk.from, { table: fk.table, column: fk.to });
        }

        tables.push({
          name,
          columns: columns.map((column) => toRawColumn(column, fkByColumn)),
          rowsApprox: countRows(db, name),
        });
      }

      return { engine: "sqlite", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

function toRawColumn(
  row: ColumnRow,
  fkByColumn: Map<string, { table: string; column: string }>,
): RawColumn {
  return {
    name: row.name,
    dataType: row.type || "BLOB",
    // A primary key is never nullable; PRAGMA reports notnull=0 for an
    // INTEGER PRIMARY KEY, so it is excluded explicitly.
    nullable: row.notnull === 0 && row.pk === 0,
    primaryKey: row.pk > 0,
    defaultValue: row.dflt_value,
    foreignKey: fkByColumn.get(row.name) ?? null,
    ordinal: row.cid,
  };
}

function countRows(db: DatabaseSync, table: string): number | null {
  try {
    const row = db.prepare(rowCountQuery(table).text).get() as { c: number } | undefined;
    return row?.c ?? null;
  } catch {
    return null;
  }
}
