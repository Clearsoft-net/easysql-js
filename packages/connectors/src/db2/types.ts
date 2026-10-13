import type { RawSchema } from "@easysql/common";
import type { ConnStr } from "ibm_db";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Explicit connection configuration for an IBM Db2 server. */
export interface Db2ConnectionConfig {
  /** Host name or IP address. Defaults to localhost. */
  host?: string;
  /** Defaults to 50000. */
  port?: number;
  database: string;
  user: string;
  password: string;
  /** When true, connects over TLS (`SECURITY=SSL`). Defaults to false. */
  ssl?: boolean;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "db2";
}

/**
 * Internal — `ibm_db` accepts the documented connection-string keywords as an
 * object and serialises them itself; `SECURITY` is only needed for TLS.
 */
export interface Db2ConnStr extends ConnStr {
  SECURITY?: string;
}

/** Internal — `SYSCAT.TABLES` row returned by the driver. */
export interface TableRow {
  table_name: string;
  rows_approx: number | string | null;
}

/** Internal — `SYSCAT.COLUMNS` row returned by the driver. */
export interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  nulls: string;
  column_default: string | null;
  ordinal: number;
}

/** Internal — `SYSCAT.KEYCOLUSE` primary-key row returned by the driver. */
export interface KeyColumnRow {
  table_name: string;
  column_name: string;
}

/** Internal — foreign-key row returned by the driver. */
export interface ForeignKeyRow {
  table_name: string;
  column_name: string;
  ref_table: string;
  ref_column: string;
}

/** Internal — the lazily loaded `ibm_db` module. */
export type IbmDbModule = typeof import("ibm_db");
