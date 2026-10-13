import type { Connector } from "@easysql/common";
import type { D1ConnectorOptions } from "../types.js";
import { D1_DEFAULT_BASE_URL, D1Connector } from "./connector.js";

export { sanitizeErrorMessage } from "@easysql/common";
export type {
  Connector,
  D1ConnectionConfig,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawSchema,
  RawTable,
} from "./types.js";
export { D1_DEFAULT_BASE_URL, D1Connector };

/** Builds a Cloudflare D1 connector. D1 always needs explicit credentials. */
export function create(options: D1ConnectorOptions): Connector {
  return new D1Connector(options.connection);
}
