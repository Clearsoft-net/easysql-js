import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Configuration for a local libSQL file or a remote Turso database. */
export interface LibSqlConnectionConfig {
  /** `libsql://`, `https://`, `wss://` or `file:` URL. */
  url: string;
  /** Auth token for Turso Cloud. */
  authToken?: string;
  /**
   * Local file URL (`file:...`) opens read-only by default. Enforced with
   * `PRAGMA query_only = ON` on the client's single pooled connection; remote
   * URLs ignore it, because every remote statement is its own request.
   */
  readonly?: boolean;
}

export interface IntrospectResult extends RawSchema {
  engine: "libsql";
}

export type { PragmaColumnRow, PragmaForeignKeyRow } from "../types.js";
