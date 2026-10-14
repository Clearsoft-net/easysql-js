/**
 * Connection-string normalisation shared by the engine `create()` factories.
 *
 * A connector accepts either an engine's conventional URL/DSN string or an
 * explicit config object; these helpers turn the string form into explicit
 * fields and reject a URL meant for a different engine.
 */

import { parseConnectionUrl } from "@easysql/common";
import type { NetworkConnectionConfig, NormalizedConnection } from "./types.js";

/** Parses a connection string and rejects a URL meant for another engine. */
export function parsedConnection(raw: string, allowedSchemes: string[]) {
  const parsed = parseConnectionUrl(raw);
  if (!allowedSchemes.includes(parsed.type)) {
    throw new Error(
      `Expected a ${allowedSchemes.join("/")} connection string, received '${parsed.type}'.`,
    );
  }
  return parsed;
}

/** Normalizes a URL/DSN string or an explicit network config. */
export function normalizeNetwork(
  connection: NetworkConnectionConfig,
  allowedSchemes: string[],
): NormalizedConnection {
  if (typeof connection !== "string") return connection;
  const parsed = parsedConnection(connection, allowedSchemes);
  return {
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: parsed.ssl,
  };
}

/** Resolves a file path from either a bare path or a `<engine>://` URL. */
export function filePath(connection: string, engine: string): string {
  return connection.startsWith(`${engine}:`) ? parseConnectionUrl(connection).database : connection;
}
