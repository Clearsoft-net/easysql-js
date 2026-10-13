import type { Connector, ConnectorEngine as SchemaEngine } from "@easysql/common";
import type { SqliteConnectionConfig } from "./sqlite/types.js";

export type { Connector, QueryResult } from "@easysql/common";

/**
 * Supported engines implemented by this package. The `satisfies` clause pins
 * every value to `@easysql/common`'s engine vocabulary, so this list and the
 * schema vocabulary cannot drift apart silently.
 */
export const ConnectorEngine = {
  MySQL: "mysql",
  PostgreSQL: "postgresql",
  ClickHouse: "clickhouse",
  SQLite: "sqlite",
} as const satisfies Record<string, SchemaEngine>;

export type ConnectorEngineId = (typeof ConnectorEngine)[keyof typeof ConnectorEngine];

export interface TcpConnectionConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  connectTimeoutMs?: number;
  socket?: never;
  file?: never;
}

export interface SocketConnectionConfig {
  socket: string;
  user?: string;
  password?: string;
  database?: string;
  connectTimeoutMs?: number;
  host?: never;
  port?: never;
  file?: never;
}

export type NetworkConnectionConfig = string | TcpConnectionConfig | SocketConnectionConfig;

export interface MysqlConnectorOptions {
  engine: typeof ConnectorEngine.MySQL;
  connection: NetworkConnectionConfig;
}

export interface PostgresConnectorOptions {
  engine: typeof ConnectorEngine.PostgreSQL;
  connection: NetworkConnectionConfig;
  /** Provider identity is informational; only TCP is currently implemented. */
  provider?: "neon" | "cockroachdb";
  transport?: "tcp";
}

export interface ClickhouseConnectorOptions {
  engine: typeof ConnectorEngine.ClickHouse;
  connection: string | TcpConnectionConfig;
  /** ClickHouse currently uses its HTTP(S) interface. */
  transport?: "http";
}

export interface SqliteConnectorOptions {
  engine: typeof ConnectorEngine.SQLite;
  /** Filename, `":memory:"`, a `sqlite:///path/to.db` URL, or a config object. */
  connection: string | SqliteConnectionConfig;
}

export type CreateConnectorOptions =
  | MysqlConnectorOptions
  | PostgresConnectorOptions
  | ClickhouseConnectorOptions
  | SqliteConnectorOptions;

/** Creates and returns a database connector. Drivers load only for the selected engine. */
export type ConnectorFactory = (options: CreateConnectorOptions) => Promise<Connector>;

/**
 * Internal — a connection after a string/URL was normalised into explicit
 * fields. Consumed by `create-connector.ts` only; never re-exported from the
 * package barrel.
 */
export interface NormalizedConnection {
  host?: string;
  port?: number;
  socket?: string;
  file?: string;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  connectTimeoutMs?: number;
  readonly?: boolean;
}
