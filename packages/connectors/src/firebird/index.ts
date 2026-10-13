import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { FirebirdConnectorOptions } from "../types.js";
import { FirebirdConnector } from "./connector.js";
import type { FirebirdConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  FirebirdConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { FirebirdConnector };

/** Builds a Firebird connector from a URL/DSN or an explicit config. */
export function create(options: FirebirdConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["firebird"]);
    return new FirebirdConnector({
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
    } as FirebirdConnectionConfig);
  }
  return new FirebirdConnector(options.connection);
}
