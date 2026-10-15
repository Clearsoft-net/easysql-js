import type { Connector, ConnectorEngine as SchemaEngine } from "@easysql/common";
import type { BigQueryConnectionConfig } from "./bigquery/types.js";
import type { ClickhouseConnectionConfig } from "./clickhouse/types.js";
import type { D1ConnectionConfig } from "./d1/types.js";
import type { Db2ConnectionConfig } from "./db2/types.js";
import type { DuckDbConnectionConfig } from "./duckdb/types.js";
import type { FirebirdConnectionConfig } from "./firebird/types.js";
import type { HanaConnectionConfig } from "./hana/types.js";
import type { LibSqlConnectionConfig } from "./libsql/types.js";
import type { MysqlConnectionConfig } from "./mysql/types.js";
import type { OracleConnectionConfig } from "./oracle/types.js";
import type {
  PostgresConnectionConfig,
  PostgresProvider,
  PostgresTransport,
} from "./postgres/types.js";
import type { SnowflakeConnectionConfig } from "./snowflake/types.js";
import type { SqliteConnectionConfig } from "./sqlite/types.js";
import type { SqlServerConnectionConfig } from "./sqlserver/types.js";
import type { TrinoConnectionConfig } from "./trino/types.js";

export type { Connector, QueryResult } from "@easysql/common";
export type { PostgresProvider, PostgresTransport } from "./postgres/types.js";

/**
 * Engines implemented by this package. MariaDB is served by the MySQL engine,
 * while Redshift, CockroachDB and Neon are providers of the PostgreSQL engine.
 * The `satisfies` clause pins every value to `@easysql/common`'s engine
 * vocabulary, so this list and the schema vocabulary cannot drift apart
 * silently.
 */
export const ConnectorEngine = {
  MySQL: "mysql",
  PostgreSQL: "postgresql",
  ClickHouse: "clickhouse",
  SQLite: "sqlite",
  SqlServer: "sqlserver",
  Oracle: "oracle",
  Firebird: "firebird",
  Db2: "db2",
  DuckDB: "duckdb",
  LibSql: "libsql",
  CloudflareD1: "d1",
  Snowflake: "snowflake",
  BigQuery: "bigquery",
  Trino: "trino",
  SapHana: "hana",
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
  /** A `postgresql://` string, host/port, a Unix socket, or a Neon connection string. */
  connection: NetworkConnectionConfig;
  /** Defaults to `postgres`. `neon` enables the HTTP and WebSocket transports. */
  provider?: PostgresProvider;
  /** Defaults to `tcp`. `http` and `websocket` require `provider: "neon"`. */
  transport?: PostgresTransport;
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

export interface SqlServerConnectorOptions {
  engine: typeof ConnectorEngine.SqlServer;
  connection: string | SqlServerConnectionConfig;
}

export interface OracleConnectorOptions {
  engine: typeof ConnectorEngine.Oracle;
  connection: string | OracleConnectionConfig;
}

export interface FirebirdConnectorOptions {
  engine: typeof ConnectorEngine.Firebird;
  connection: string | FirebirdConnectionConfig;
}

export interface Db2ConnectorOptions {
  engine: typeof ConnectorEngine.Db2;
  connection: string | Db2ConnectionConfig;
}

export interface DuckDbConnectorOptions {
  engine: typeof ConnectorEngine.DuckDB;
  connection: string | DuckDbConnectionConfig;
}

export interface LibSqlConnectorOptions {
  engine: typeof ConnectorEngine.LibSql;
  connection: string | LibSqlConnectionConfig;
}

export interface D1ConnectorOptions {
  engine: typeof ConnectorEngine.CloudflareD1;
  /** D1 is reached over its REST API, so it always needs explicit credentials. */
  connection: D1ConnectionConfig;
}

export interface SnowflakeConnectorOptions {
  engine: typeof ConnectorEngine.Snowflake;
  connection: string | SnowflakeConnectionConfig;
}

export interface BigQueryConnectorOptions {
  engine: typeof ConnectorEngine.BigQuery;
  connection: string | BigQueryConnectionConfig;
}

export interface TrinoConnectorOptions {
  engine: typeof ConnectorEngine.Trino;
  connection: string | TrinoConnectionConfig;
}

export interface SapHanaConnectorOptions {
  engine: typeof ConnectorEngine.SapHana;
  connection: string | HanaConnectionConfig;
}

export type CreateConnectorOptions =
  | MysqlConnectorOptions
  | PostgresConnectorOptions
  | ClickhouseConnectorOptions
  | SqliteConnectorOptions
  | SqlServerConnectorOptions
  | OracleConnectorOptions
  | FirebirdConnectorOptions
  | Db2ConnectorOptions
  | DuckDbConnectorOptions
  | LibSqlConnectorOptions
  | D1ConnectorOptions
  | SnowflakeConnectorOptions
  | BigQueryConnectorOptions
  | TrinoConnectorOptions
  | SapHanaConnectorOptions;

/** Creates and returns a database connector. Drivers load only for the selected engine. */
export type ConnectorFactory = (options: CreateConnectorOptions) => Promise<Connector>;

/**
 * Internal — the raw projection an engine's query primitive returns, before the
 * shared result assembly turns it into a {@link QueryResult}. `rowCount` is only
 * set by engines that report an affected-row count distinct from `rows.length`
 * (DDL/DML, or drivers that expose their own count).
 */
export interface RawQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount?: number;
}

/**
 * Internal — one row of an engine's table-listing query. `rows_approx` is absent
 * for engines with no cheap estimate (HANA, Snowflake, …); `table_id` and
 * `schema_name` are only set by the batched SQL Server listing, which needs the
 * object id to group its columns.
 */
export interface TableRow {
  table_name: string;
  rows_approx?: string | number | bigint | null;
  table_id?: number;
  schema_name?: string;
}

/**
 * Internal — a connection after a string/URL was normalised into explicit
 * fields. Consumed by the engine `create()` factories only; never re-exported
 * from the package barrel.
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

/** Engine-specific configuration types, re-exported for consumers. */
export type {
  BigQueryConnectionConfig,
  ClickhouseConnectionConfig,
  D1ConnectionConfig,
  Db2ConnectionConfig,
  DuckDbConnectionConfig,
  FirebirdConnectionConfig,
  HanaConnectionConfig,
  LibSqlConnectionConfig,
  MysqlConnectionConfig,
  OracleConnectionConfig,
  PostgresConnectionConfig,
  SnowflakeConnectionConfig,
  SqliteConnectionConfig,
  SqlServerConnectionConfig,
  TrinoConnectionConfig,
};
