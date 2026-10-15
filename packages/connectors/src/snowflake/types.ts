import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Explicit connection configuration for a Snowflake account. */
export interface SnowflakeConnectionConfig {
  /** Account identifier, e.g. "xy12345.us-east-1". */
  account: string;
  user: string;
  password: string;
  database: string;
  schema?: string;
  warehouse?: string;
  role?: string;
  connectTimeoutMs?: number; // default 60000 (cloud warehouses are slower to connect)
}

export interface IntrospectResult extends RawSchema {
  engine: "snowflake";
}

export type { TableRow } from "../types.js";

/** Internal — row shape of the `INFORMATION_SCHEMA.COLUMNS` query. */
export interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string | boolean;
  column_default: string | null;
  ordinal_position: string | number;
  primary_key: string | boolean | number | null;
  foreign_table: string | null;
  foreign_column: string | null;
}
