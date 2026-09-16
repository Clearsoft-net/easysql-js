import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Explicit connection configuration for a MySQL/MariaDB server. */
export interface MysqlConnectionConfig {
  host: string;
  /** Defaults to 3306. */
  port?: number;
  user: string;
  password: string;
  database: string;
  /** When true, connects over TLS. Defaults to false. */
  ssl?: boolean;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "mysql" | "mariadb";
}
