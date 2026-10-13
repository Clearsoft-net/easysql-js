import { type Connector, parseConnectionUrl } from "@easysql/common";
import type { ClickhouseConnectionConfig } from "./clickhouse/types.js";
import type { MysqlConnectionConfig } from "./mysql/types.js";
import type { PostgresConnectionConfig } from "./postgres/types.js";
import {
  type ClickhouseConnectorOptions,
  ConnectorEngine,
  type CreateConnectorOptions,
  type MysqlConnectorOptions,
  type NetworkConnectionConfig,
  type NormalizedConnection,
  type PostgresConnectorOptions,
  type SqliteConnectorOptions,
} from "./types.js";

/**
 * Create a connector for the selected database engine. The engine module (and
 * its third-party driver) is dynamically imported only when this function runs.
 */
export async function createConnector(options: CreateConnectorOptions): Promise<Connector> {
  switch (options.engine) {
    case ConnectorEngine.MySQL:
      return createMysql(options);
    case ConnectorEngine.PostgreSQL:
      return createPostgres(options);
    case ConnectorEngine.ClickHouse:
      return createClickhouse(options);
    case ConnectorEngine.SQLite:
      return createSqlite(options);
  }
}

async function createMysql(options: MysqlConnectorOptions): Promise<Connector> {
  const config = normalizeNetwork(options.connection, ["mysql", "mariadb"]);
  const { MysqlConnector } = await loadDriver("mysql2", () => import("./mysql/index.js"));
  return new MysqlConnector({
    ...config,
    user: config.user ?? "",
    password: config.password ?? "",
    database: config.database ?? "",
  } as MysqlConnectionConfig);
}

async function createPostgres(options: PostgresConnectorOptions): Promise<Connector> {
  const config = normalizeNetwork(options.connection, ["postgresql"]);
  const { PostgresConnector } = await loadDriver("pg", () => import("./postgres/index.js"));
  return new PostgresConnector({
    ...config,
    user: config.user ?? "",
    password: config.password ?? "",
    database: config.database ?? "",
  } as PostgresConnectionConfig);
}

async function createClickhouse(options: ClickhouseConnectorOptions): Promise<Connector> {
  const config = normalizeNetwork(options.connection, ["clickhouse"]);
  const { ClickhouseConnector } = await loadDriver(
    "@clickhouse/client",
    () => import("./clickhouse/index.js"),
  );
  return new ClickhouseConnector({
    ...config,
    host: config.host ?? "",
    user: config.user ?? "default",
    password: config.password ?? "",
    database: config.database ?? "default",
  } as ClickhouseConnectionConfig);
}

async function createSqlite(options: SqliteConnectorOptions): Promise<Connector> {
  const { SqliteConnector } = await loadDriver("node:sqlite", () => import("./sqlite/index.js"));
  if (typeof options.connection === "string") {
    const file = options.connection.startsWith("sqlite:")
      ? parseConnectionUrl(options.connection).database
      : options.connection;
    return new SqliteConnector({ file });
  }
  return new SqliteConnector(options.connection);
}

function normalizeNetwork(
  connection: NetworkConnectionConfig,
  allowedSchemes: string[],
): NormalizedConnection {
  if (typeof connection !== "string") return connection;
  const parsed = parseConnectionUrl(connection);
  if (!allowedSchemes.includes(parsed.type)) {
    throw new Error(
      `Expected a ${allowedSchemes.join("/")} connection string, received '${parsed.type}'.`,
    );
  }
  return {
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: parsed.ssl,
  };
}

async function loadDriver<T>(name: string, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (isMissingModule(error)) {
      throw new Error(
        `Connector dependency '${name}' is unavailable. Install the optional driver for the selected engine and ensure the runtime supports it.`,
        { cause: error },
      );
    }
    throw error;
  }
}

function isMissingModule(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    code === "ERR_UNKNOWN_BUILTIN_MODULE"
  );
}
