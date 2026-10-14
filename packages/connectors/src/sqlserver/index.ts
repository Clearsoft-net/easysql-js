import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { SqlServerConnectorOptions } from "../types.js";
import { SqlServerConnector } from "./connector.js";
import type { SqlServerConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  Connector,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
  SqlServerConnectionConfig,
} from "./types.js";
export { SqlServerConnector };

/** Builds a SQL Server connector from a URL/DSN or an explicit config. */
export function create(options: SqlServerConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["sqlserver"]);
    return new SqlServerConnector({
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl: parsed.ssl,
    } as SqlServerConnectionConfig);
  }
  return new SqlServerConnector(options.connection);
}
