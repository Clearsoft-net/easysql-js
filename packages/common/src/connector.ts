/**
 * Connector contract shared by every engine package.
 *
 * Engines differ in configuration and in whether their driver is synchronous
 * (SQLite) or asynchronous (MySQL, PostgreSQL), so the lifecycle methods return
 * `T | Promise<T>`. Every connector class implements this interface.
 */

import type { RawSchema } from "./schema.js";

/** Rows returned by {@link Connector.execute}. */
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

/**
 * A database connector: opens/closes a connection, reads local metadata and
 * executes validated SQL. Credentials never leave the process.
 */
export interface Connector {
  /** Opens the connection. Idempotent. */
  connect(): void | Promise<void>;
  /** Closes the connection. Safe to call when not connected. */
  close(): void | Promise<void>;
  /** Reads local metadata only — never returns rows. */
  introspect(): RawSchema | Promise<RawSchema>;
  /** Executes a validated SQL statement and returns typed rows. */
  execute(sql: string): QueryResult | Promise<QueryResult>;
}
