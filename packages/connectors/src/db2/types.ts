import type { ConnStr } from "ibm_db";
import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

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

export type IntrospectResult = EngineSchema<"db2">;

/**
 * Internal — `ibm_db` accepts the documented connection-string keywords as an
 * object and serialises them itself; `SECURITY` is only needed for TLS.
 */
export interface Db2ConnStr extends ConnStr {
  SECURITY?: string;
}

/** Internal — the lazily loaded `ibm_db` module. */
export type IbmDbModule = typeof import("ibm_db");
