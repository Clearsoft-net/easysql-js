import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { Db2ConnectorOptions } from "../types.js";
import { Db2Connector } from "./connector.js";
import type { Db2ConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  Db2ConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { Db2Connector };

/** Builds a Db2 connector from a URL/DSN or an explicit config. */
export function create(options: Db2ConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["db2"]);
    return new Db2Connector({
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      ssl: parsed.ssl,
    } as Db2ConnectionConfig);
  }
  return new Db2Connector(options.connection);
}
