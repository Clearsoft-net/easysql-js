import type { Connector } from "@easysql/common";
import { parsedConnection } from "../normalize.js";
import type { BigQueryConnectorOptions } from "../types.js";
import { BigQueryConnector } from "./connector.js";
import type { BigQueryConnectionConfig } from "./types.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  BigQueryConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { BigQueryConnector };

/** Builds a BigQuery connector from a URL/DSN or an explicit config. */
export function create(options: BigQueryConnectorOptions): Connector {
  if (typeof options.connection === "string") {
    const parsed = parsedConnection(options.connection, ["bigquery"]);
    return new BigQueryConnector({
      projectId: parsed.host,
      dataset: parsed.database || undefined,
    } as BigQueryConnectionConfig);
  }
  return new BigQueryConnector(options.connection);
}
