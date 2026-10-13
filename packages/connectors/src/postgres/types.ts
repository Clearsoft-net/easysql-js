import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Explicit connection configuration for a PostgreSQL server. */
export interface PostgresConnectionConfig {
  host?: string;
  /** Optional local Unix socket directory/path, if supported by the platform. */
  socket?: string;
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
