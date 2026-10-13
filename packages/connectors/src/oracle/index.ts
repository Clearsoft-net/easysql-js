import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { OracleConnectorOptions } from "../types.js";
import { OracleConnector } from "./connector.js";
import type { OracleConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  IntrospectResult,
  OracleConnectionConfig,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { OracleConnector };

/** Builds an Oracle connector from an Easy Connect string, URL or config. */
export function create(options: OracleConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    // Easy Connect strings (`host/service`) carry no credentials, so they are
    // passed through as-is and the caller supplies user/password separately.
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(options.connection)) {
      return new OracleConnector({ connectString: options.connection } as OracleConnectionConfig);
    }
    const parsed = parsedConnection(options.connection, ["oracle"]);
    return new OracleConnector({
      host: parsed.host,
      port: parsed.port,
      serviceName: parsed.database,
      user: parsed.user,
      password: parsed.password,
    } as OracleConnectionConfig);
  }
  return new OracleConnector(options.connection);
}
