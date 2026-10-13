import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/**
 * PostgreSQL-compatible providers. The provider only changes how the server is
 * reached and which catalog queries are safe; the engine stays `postgresql`.
 */
export type PostgresProvider = "postgres" | "neon" | "cockroachdb" | "redshift";

/**
 * How the client reaches the server:
 * - `tcp` — the PostgreSQL wire protocol over TCP or a Unix socket (`pg`).
 * - `http` — one-shot queries over HTTPS (Neon serverless driver).
 * - `websocket` — a session over WebSockets (Neon serverless driver).
 */
export type PostgresTransport = "tcp" | "http" | "websocket";

/** Explicit connection configuration for a PostgreSQL server. */
export interface PostgresConnectionConfig {
  host?: string;
  /** Optional local Unix socket directory/path, if supported by the platform. */
  socket?: string;
  /** Defaults to 5432. */
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  /** When true, connects over TLS (rejectUnauthorized: false). Defaults to false. */
  ssl?: boolean;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
  /**
   * Full `postgresql://` connection string. Required for the Neon `http` and
   * `websocket` transports; optional for `tcp`, where it replaces
   * host/port/user/password/database.
   */
  connectionString?: string;
  /** Managed provider. Defaults to `postgres`. */
  provider?: PostgresProvider;
  /** Transport. Defaults to `tcp`. */
  transport?: PostgresTransport;
}

export interface IntrospectResult extends RawSchema {
  engine: "postgresql";
}

/** Internal — column row of the `pg_attribute`/`pg_catalog` introspection query. */
export interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_primary: boolean;
  foreign_table: string | null;
  foreign_column: string | null;
  ordinal: number;
}

/** Internal — table row of the `pg_class`/`pg_namespace` introspection query. */
export interface TableRow {
  table_name: string;
  rows_approx: string | number | null;
}
