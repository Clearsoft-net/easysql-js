import type { Connector } from "@easysql/common";
import { normalizeNetwork } from "../normalize.js";
import type { ClickhouseConnectorOptions } from "../types.js";
import { ClickhouseConnector } from "./connector.js";
import type { ClickhouseConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  ClickhouseConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { ClickhouseConnector };

/** Builds a ClickHouse connector from a URL/DSN or an explicit config. */
export function create(options: ClickhouseConnectorOptions): Connector {
  const config = normalizeNetwork(options.connection, ["clickhouse"]);
  return new ClickhouseConnector({
    ...config,
    host: config.host ?? "",
    user: config.user ?? "default",
    password: config.password ?? "",
    database: config.database ?? "default",
  } as ClickhouseConnectionConfig);
}
