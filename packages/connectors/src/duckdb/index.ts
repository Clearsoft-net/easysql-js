import type { Connector } from "@easysql/common";
import { filePath } from "../normalize.js";
import type { DuckDbConnectorOptions } from "../types.js";
import { DuckDbConnector } from "./connector.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  DuckDbConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { DuckDbConnector };

/** Builds a DuckDB connector from a file path/URL or an explicit config. */
export function create(options: DuckDbConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    return new DuckDbConnector({ file: filePath(options.connection, "duckdb") });
  }
  return new DuckDbConnector(options.connection);
}
