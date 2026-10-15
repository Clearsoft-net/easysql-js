/**
 * Cloudflare D1 connector types.
 *
 * D1 has no npm driver: the database is reached over Cloudflare's REST API
 * (`/accounts/{account_id}/d1/database/{database_id}/query`) with the global
 * `fetch`, so a connection is nothing more than an account/database pair plus
 * an API token.
 */

import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Configuration for a Cloudflare D1 database reached over the REST API. */
export interface D1ConnectionConfig {
  accountId: string;
  databaseId: string;
  apiToken: string;
  /** Override for testing or a proxy. Defaults to https://api.cloudflare.com/client/v4 */
  baseUrl?: string;
}

export type IntrospectResult = EngineSchema<"d1">;

/** Internal — error entry of a Cloudflare API response envelope. */
export interface D1Error {
  code?: number;
  message?: string;
  source?: { pointer?: string };
}

/** Internal — result metadata returned alongside D1 query rows. */
export interface D1Meta {
  changes?: number;
  rows_read?: number;
  rows_written?: number;
  duration?: number;
}

/** Internal — one result object inside a D1 query response. */
export interface D1QueryResult {
  results?: unknown;
  meta?: D1Meta;
  success?: boolean;
}

/** Internal — parsed envelope of a D1 REST query response. */
export interface D1ResponseBody {
  errors?: D1Error[] | null;
  result?: D1QueryResult[] | null;
  success?: boolean;
}

export type { PragmaColumnRow, PragmaForeignKeyRow } from "../types.js";
