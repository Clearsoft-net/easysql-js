import type { Connector } from "@easysql/common";
import type { LibSqlConnectorOptions } from "../types.js";
import { LibSqlConnector } from "./connector.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  Connector,
  IntrospectResult,
  LibSqlConnectionConfig,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { LibSqlConnector };

/** Builds a libSQL/Turso connector from a URL or an explicit config. */
export function create(options: LibSqlConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    return new LibSqlConnector({ url: options.connection });
  }
  return new LibSqlConnector(options.connection);
}
