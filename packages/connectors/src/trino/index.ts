import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { TrinoConnectorOptions } from "../types.js";
import { TrinoConnector } from "./connector.js";
import type { TrinoConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  Connector,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
  TrinoConnectionConfig,
} from "./types.js";
export { TrinoConnector };

/** Builds a Trino connector from a URL/DSN or an explicit config. */
export function create(options: TrinoConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["trino"]);
    return new TrinoConnector({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password || undefined,
      ssl: parsed.ssl,
      catalog: parsed.database || undefined,
    } as TrinoConnectionConfig);
  }
  return new TrinoConnector(options.connection);
}
