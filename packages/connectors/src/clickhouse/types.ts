import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Explicit connection configuration for a ClickHouse server (HTTP interface). */
export interface ClickhouseConnectionConfig {
  host: string;
  /** HTTP interface port. Defaults to 8123, or 8443 when `ssl` is true. */
  port?: number;
  user: string;
  password: string;
  database: string;
  /** When true, connects over HTTPS. Defaults to false. */
  ssl?: boolean;
  /** Request timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "clickhouse";
}
