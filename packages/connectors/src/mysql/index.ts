import type { Connector } from "@easysql/common";
import { normalizeNetwork } from "../normalize.js";
import type { MysqlConnectorOptions } from "../types.js";
import { MysqlConnector } from "./connector.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  IntrospectResult,
  MysqlConnectionConfig,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { MysqlConnector };

/** Builds a MySQL/MariaDB connector from a URL/DSN or an explicit config. */
export function create(options: MysqlConnectorOptions): Connector {
  const config = normalizeNetwork(options.connection, ["mysql", "mariadb"]);
  return new MysqlConnector({
    ...config,
    user: config.user ?? "",
    password: config.password ?? "",
    database: config.database ?? "",
  });
}
