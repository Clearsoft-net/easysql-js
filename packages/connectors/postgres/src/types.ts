import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Explicit connection configuration for a PostgreSQL server. */
export interface PostgresConnectionConfig {
  host: string;
  /** Defaults to 5432. */
  port?: number;
  user: string;
  password: string;
  database: string;
  /** When true, connects over TLS (rejectUnauthorized: false). Defaults to false. */
  ssl?: boolean;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "postgresql";
}
