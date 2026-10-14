import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { SnowflakeConnectorOptions } from "../types.js";
import { SnowflakeConnector } from "./connector.js";
import type { SnowflakeConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
  SnowflakeConnectionConfig,
} from "./types.js";
export { SnowflakeConnector };

/** Builds a Snowflake connector from a URL/DSN or an explicit config. */
export function create(options: SnowflakeConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["snowflake"]);
    return new SnowflakeConnector({
      account: parsed.host,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
    } as SnowflakeConnectionConfig);
  }
  return new SnowflakeConnector(options.connection);
}
