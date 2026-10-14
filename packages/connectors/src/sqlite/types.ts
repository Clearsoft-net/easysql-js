import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Configuration for a local SQLite database. */
export interface SqliteConnectionConfig {
  /** File path, or `":memory:"` for an in-memory database. */
  file: string;
  /**
   * Opens the database read-only. Defaults to `true`.
   * An in-memory database must set `readonly: false`.
   */
  readonly?: boolean;
  // SQLite is local-only: these fields reject network configuration at compile time.
  host?: never;
  port?: never;
  socket?: never;
}

export interface IntrospectResult extends RawSchema {
  engine: "sqlite";
}

/** Internal — `PRAGMA table_info` row. */
export interface ColumnRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/** Internal — `PRAGMA foreign_key_list` row. */
export interface ForeignKeyRow {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
}
