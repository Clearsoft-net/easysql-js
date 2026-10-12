import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Configuration for a local SQLite database. */
export interface SqliteConnectionConfig {
  /** File path, or `":memory:"` for an in-memory database. */
  file: string;
  /**
   * Opens the database read-only. Defaults to `true`.
   * An in-memory database must set `readonly: false`.
   */
  readonly?: boolean;
}

export interface IntrospectResult extends RawSchema {
  engine: "sqlite";
}
