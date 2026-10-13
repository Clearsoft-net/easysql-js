import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { PostgresConnectorOptions } from "../types.js";
import { PostgresConnector } from "./connector.js";
import type { PostgresConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  IntrospectResult,
  PostgresConnectionConfig,
  PostgresProvider,
  PostgresTransport,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { PostgresConnector };

/**
 * Builds a PostgreSQL connector. The `provider` selects which catalog queries
 * are safe and the `transport` how the server is reached (TCP, or Neon over
 * HTTP/WebSockets).
 */
export function create(options: PostgresConnectorOptions): Connector {
  const provider = options.provider ?? "postgres";
  const transport = options.transport ?? "tcp";
  const connection = options.connection;

  if (typeof connection === "string") {
    // A Neon connection string is passed through verbatim; a TCP string is
    // validated so a URL meant for another engine is rejected early.
    if (transport === "tcp") parsedConnection(connection, ["postgresql"]);
    return new PostgresConnector({
      connectionString: connection,
      provider,
      transport,
    } as PostgresConnectionConfig);
  }

  return new PostgresConnector({
    ...connection,
    provider,
    transport,
  } as PostgresConnectionConfig);
}
