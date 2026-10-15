import type { EngineSchema } from "../types.js";

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

export type IntrospectResult = EngineSchema<"sqlite">;

export type { PragmaColumnRow, PragmaForeignKeyRow } from "../types.js";
