import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Explicit connection configuration for a Microsoft SQL Server instance. */
export interface SqlServerConnectionConfig {
  host?: string;
  /** Defaults to 1433. */
  port?: number;
  user: string;
  password: string;
  database: string;
  /** Encrypt the connection. Defaults to true. */
  encrypt?: boolean;
  /** Accept self-signed certificates. Defaults to false. */
  trustServerCertificate?: boolean;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "sqlserver";
}

/** Internal — row shape of the `sys.tables`/`sys.partitions` query. */
export interface TableRow {
  table_id: number;
  schema_name: string;
  table_name: string;
  rows_approx: string | number | null;
}

/** Internal — row shape of the `sys.columns` introspection query. */
export interface ColumnRow {
  table_id: number;
  schema_name: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  default_value: string | null;
  is_primary_key: number | boolean;
  foreign_table: string | null;
  foreign_column: string | null;
  ordinal: number;
}
