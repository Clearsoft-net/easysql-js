import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Configuration for a Trino coordinator. */
export interface TrinoConnectionConfig {
  /** Coordinator hostname, or a full `http(s)://host:port` URL. */
  host: string;
  /** Coordinator port. Defaults to `8080`. */
  port?: number;
  /** Trino user, sent as the `X-Trino-User` header. */
  user: string;
  /** Password for HTTP Basic authentication. */
  password?: string;
  /** TLS. Defaults to `false`. */
  ssl?: boolean;
  /** Default catalog for the session. */
  catalog?: string;
  /** Default schema for the session. */
  schema?: string;
  /** Connection timeout in milliseconds. Defaults to `10000`. */
  connectTimeoutMs?: number;
}

export type IntrospectResult = EngineSchema<"trino">;

/** Internal — one page of a Trino query response, as returned by the REST API. */
export interface QueryPage {
  columns?: { name: string; type: string }[];
  data?: unknown[];
  nextUri?: string;
  error?: { errorName?: string; message: string };
}

/**
 * Internal — the subset of `trino-client`'s internal HTTP client this connector
 * drives.
 *
 * The driver's public `query()` iterator drops the rows carried by the initial
 * `POST /v1/statement` response (its first `next()` jumps straight to
 * `nextUri`), and the client protocol explicitly allows that first response to
 * carry data. Paginating through the driver's `request()` method instead keeps
 * every page and still lets the driver maintain its session/catalog/schema
 * header bookkeeping.
 */
export interface TrinoHttpClient {
  request<T>(config: { method?: string; url: string; data?: unknown }): Promise<T>;
}

/** Internal — row shape of the `information_schema.columns` query. */
export type { ColumnRow } from "../types.js";

/** Internal — result of draining every page of one Trino query. */
export interface Collected {
  columns: string[];
  rows: Record<string, unknown>[];
}
