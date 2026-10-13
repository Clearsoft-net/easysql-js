import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Explicit connection configuration for a MySQL/MariaDB server. */
export interface MysqlConnectionConfig {
  host?: string;
  /** Optional local Unix socket path. */
  socket?: string;
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

/** Internal — `information_schema.COLUMNS` row returned by the driver. */
export interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  column_key: string;
  referenced_table_name: string | null;
  referenced_column_name: string | null;
  ordinal_position: number;
}

/** Internal — `information_schema.TABLES` row returned by the driver. */
export interface TableRow {
  table_name: string;
  table_rows: number | null;
}
