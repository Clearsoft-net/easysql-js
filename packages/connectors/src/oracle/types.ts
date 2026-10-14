import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/**
 * Explicit connection configuration for an Oracle Database server.
 *
 * Either an Easy Connect `connectString` or a `host` plus `serviceName` pair is
 * required. `oracledb` runs in its default Thin mode (pure JavaScript), so no
 * Oracle Client libraries need to be installed.
 */
export interface OracleConnectionConfig {
  /** Easy Connect string, e.g. "localhost/FREEPDB1" or "host:1521/service". */
  connectString?: string;
  host?: string;
  /** Defaults to 1521. */
  port?: number;
  serviceName?: string;
  user: string;
  password: string;
  /** Connection timeout in milliseconds. Defaults to 10000. */
  connectTimeoutMs?: number;
}

export interface IntrospectResult extends RawSchema {
  engine: "oracle";
}

/** Column metadata returned by `connection.execute`. */
export interface OracleColumnMetadata {
  name: string;
}

/** Subset of the `execute()` result this connector reads. */
export interface OracleExecuteResult<T> {
  rows?: T[];
  metaData?: OracleColumnMetadata[];
  rowsAffected?: number;
}

export interface OracleExecuteOptions {
  /** `driver.OUT_FORMAT_OBJECT` fetches rows as objects keyed by column name. */
  outFormat?: number;
  /** Commit each statement, matching the autocommit behaviour of the other engines. */
  autoCommit?: boolean;
}

export interface OracleConnection {
  execute<T = Record<string, unknown>>(
    sql: string,
    binds?: Record<string, unknown> | unknown[],
    options?: OracleExecuteOptions,
  ): Promise<OracleExecuteResult<T>>;
  close(): Promise<void>;
}

export interface OracleGetConnectionOptions {
  user?: string;
  password?: string;
  connectString?: string;
  /** Timeout in seconds, as node-oracledb defines it. */
  connectTimeout?: number;
}

/** The `oracledb` Thin-mode API surface this connector relies on. */
export interface OracleDriver {
  readonly OUT_FORMAT_OBJECT: number;
  getConnection(options: OracleGetConnectionOptions): Promise<OracleConnection>;
}

export interface TableRow {
  table_name: string;
  rows_approx: number | string | null;
}

export interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  nullable: string;
  data_default: string | null;
  column_id: number | null;
}

export interface ConstraintColumnRow {
  table_name: string;
  column_name: string;
}

export interface ForeignKeyRow extends ConstraintColumnRow {
  foreign_table: string;
  foreign_column: string;
}
