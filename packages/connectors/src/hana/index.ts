import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { SapHanaConnectorOptions } from "../types.js";
import { HanaConnector } from "./connector.js";
import type { HanaConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  HanaConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { HanaConnector };

/** Builds a SAP HANA connector from a URL/DSN or an explicit config. */
export function create(options: SapHanaConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["hana"]);
    return new HanaConnector({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      ssl: parsed.ssl,
    } as HanaConnectionConfig);
  }
  return new HanaConnector(options.connection);
}
