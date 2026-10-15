import type { EngineSchema } from "../types.js";

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

export type IntrospectResult = EngineSchema<"sqlserver">;

export type { ColumnRow, TableRow } from "../types.js";
