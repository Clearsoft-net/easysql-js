import type { Connector } from "@easysql/common";
import { filePath } from "../normalize.js";
import type { SqliteConnectorOptions } from "../types.js";
import { SqliteConnector } from "./connector.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
  SqliteConnectionConfig,
} from "./types.js";
export { SqliteConnector };

/** Builds a SQLite connector from a filename, `":memory:"`, a URL or a config. */
export function create(options: SqliteConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    return new SqliteConnector({ file: filePath(options.connection, "sqlite") });
  }
  return new SqliteConnector(options.connection);
}
