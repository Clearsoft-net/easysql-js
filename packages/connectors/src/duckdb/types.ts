import type { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import type { RawSchema } from "@easysql/common";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Configuration for a local DuckDB database. */
export interface DuckDbConnectionConfig {
  /** File path, or `":memory:"` for an in-memory database. */
  file: string;
  /**
   * Opens the database read-only. Defaults to `true`.
   * An in-memory database must set `readonly: false`.
   */
  readonly?: boolean;
}

export interface IntrospectResult extends RawSchema {
  engine: "duckdb";
}

/** Internal — `duckdb_columns()` row returned by the driver. */
export interface ColumnRow {
  column_name: string;
  column_index: number;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
}

export type { TableRow } from "../types.js";

/** Internal — `duckdb_constraints()` row returned by the driver. */
export interface ConstraintRow {
  table_name: string;
  constraint_type: string;
  constraint_column_names: string[];
  referenced_table: string | null;
  referenced_column_names: string[] | null;
}

/** Internal — the instance/connection pair that forms a DuckDB handle. */
export interface DuckDbHandles {
  instance: DuckDBInstance;
  connection: DuckDBConnection;
}
