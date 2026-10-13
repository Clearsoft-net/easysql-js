import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Explicit connection configuration for an SAP HANA server. */
export interface HanaConnectionConfig {
  host: string;
  /** Defaults to 30015. */
  port?: number;
  user: string;
  password: string;
  /** When true, connects with the driver's `encrypt` option. Defaults to false. */
  ssl?: boolean;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "hana";
}

export interface TableRow {
  table_name: string;
}

export interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal: number;
}

export interface KeyColumnRow {
  table_name: string;
  column_name: string;
}

export interface ForeignKeyRow {
  table_name: string;
  column_name: string;
  ref_table: string;
  ref_column: string;
}

export interface RowCountRow {
  table_name: string;
  record_count: number | string | null;
}

export type HanaModule = typeof import("@sap/hana-client");
