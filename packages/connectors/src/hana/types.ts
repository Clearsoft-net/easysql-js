import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

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

export type IntrospectResult = EngineSchema<"hana">;

export interface RowCountRow {
  table_name: string;
  record_count: number | string | null;
}

export type HanaModule = typeof import("@sap/hana-client");
