/**
 * SQLite connector: local schema introspection and query execution.
 *
 * Uses Node's built-in `node:sqlite` (available in Node >= 22.5 and Bun), so
 * the package has no native dependency. The database is opened explicitly with
 * {@link SqliteConnector.connect} and released with
 * {@link SqliteConnector.close}. No state survives a connection.
 */

import { DatabaseSync } from "node:sqlite";
import { sanitizeErrorMessage } from "@easysql/common";
import type {
  Connector,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawTable,
  SqliteConnectionConfig,
} from "./types.js";

interface ColumnRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface ForeignKeyRow {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
}

export class SqliteConnector implements Connector {
  private readonly config: Required<SqliteConnectionConfig>;
  private db: DatabaseSync | null = null;

  constructor(config: SqliteConnectionConfig) {
    if (!config.file) throw new Error("SqliteConnector: file is required");
    this.config = {
      file: config.file,
      readonly: config.readonly ?? true,
    };
  }

  /** Opens the database. Safe to call more than once. */
  connect(): void {
    if (this.db) return;
    try {
      this.db = new DatabaseSync(this.config.file, { readOnly: this.config.readonly });
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Closes the database and clears it. Safe to call when not connected. */
  close(): void {
    if (!this.db) return;
    const db = this.db;
    this.db = null;
    db.close();
  }

  /** Introspects the database and returns the raw schema. */
  introspect(): IntrospectResult {
    const db = this.requireDatabase();
    try {
      const tableRows = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[];

      const tables: RawTable[] = [];
      for (const { name } of tableRows) {
        const columns = db
          .prepare(`PRAGMA table_info(${quoteIdent(name)})`)
          .all() as unknown as ColumnRow[];
        const foreignKeys = db
          .prepare(`PRAGMA foreign_key_list(${quoteIdent(name)})`)
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

  /** Executes a validated SQL statement and returns typed rows. */
  execute(sql: string): QueryResult {
    const db = this.requireDatabase();
    const started = Date.now();
    try {
      const statement = db.prepare(sql);
      const columns = statement.columns().map((column) => column.name);
      if (columns.length === 0) {
        const info = statement.run();
        return {
          columns: [],
          rows: [],
          rowCount: Number(info.changes),
          durationMs: Date.now() - started,
        };
      }
      const rows = statement.all() as unknown as Record<string, unknown>[];
      return {
        columns,
        rows: rows.map((row) => pick(row, columns)),
        rowCount: rows.length,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  private requireDatabase(): DatabaseSync {
    if (!this.db) throw new Error("SqliteConnector: not connected — call connect() first");
    return this.db;
  }

  private wrap(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(sanitizeErrorMessage(message, []));
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
    const row = db.prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(table)}`).get() as
      | { c: number }
      | undefined;
    return row?.c ?? null;
  } catch {
    return null;
  }
}

/** Quotes an identifier with double quotes, doubling embedded quotes. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function pick(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of columns) out[column] = row[column];
  return out;
}
