/**
 * Connection-string parsing for the connector engines.
 *
 * Supports the conventional URL/DSN of each engine, for example:
 *   mysql://user:pass@host:3306/db
 *   mariadb://user:pass@host:3306/db
 *   postgresql://user:pass@host:5432/db
 *   clickhouse://user:pass@host:8123/db      (HTTP interface)
 *   clickhouses://user:pass@host:8443/db     (HTTPS interface)
 *   sqlite:///absolute/path/to.db
 *   duckdb:///absolute/path/to.db
 *   sqlserver://user:pass@host:1433/db
 *   oracle://user:pass@host:1521/service
 *   firebird://user:pass@host:3050/path/to.db
 *   db2://user:pass@host:50000/db
 *   snowflake://user:pass@account/db
 *   trino://user@host:8080/catalog
 *   hana://user:pass@host:30015
 *   libsql://host
 *   bigquery://project/dataset
 *
 * The returned object keeps the password in memory only; callers decide
 * whether it is ever persisted (it should not be).
 */

import type { ConnectorEngine } from "./types.js";

export interface ParsedConnection {
  type: ConnectorEngine;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

const DEFAULT_PORTS: Record<ConnectorEngine, number> = {
  mysql: 3306,
  mariadb: 3306,
  postgresql: 5432,
  clickhouse: 8123,
  sqlite: 0,
  sqlserver: 1433,
  oracle: 1521,
  firebird: 3050,
  db2: 50000,
  duckdb: 0,
  libsql: 0,
  d1: 0,
  snowflake: 443,
  bigquery: 443,
  trino: 8080,
  hana: 30015,
};

/** URL schemes accepted for each engine. */
const PROTOCOLS: Record<string, ConnectorEngine> = {
  mysql: "mysql",
  mariadb: "mariadb",
  postgres: "postgresql",
  postgresql: "postgresql",
  clickhouse: "clickhouse",
  clickhouses: "clickhouse",
  sqlserver: "sqlserver",
  mssql: "sqlserver",
  oracle: "oracle",
  firebird: "firebird",
  db2: "db2",
  duckdb: "duckdb",
  libsql: "libsql",
  turso: "libsql",
  d1: "d1",
  snowflake: "snowflake",
  bigquery: "bigquery",
  trino: "trino",
  hana: "hana",
};

/** Engines whose connection target is a filesystem path rather than a host. */
const FILE_ENGINES = new Set<ConnectorEngine>(["sqlite", "duckdb"]);

/** Display names of the file-backed engines, used in the file-path error. */
const FILE_ENGINE_LABELS: Partial<Record<ConnectorEngine, string>> = {
  sqlite: "SQLite",
  duckdb: "DuckDB",
};

/** Engines that identify their target without user credentials. */
const NO_USER_ENGINES = new Set<ConnectorEngine>(["bigquery", "libsql", "d1"]);

/** Engines where a database (or service/namespace) in the path is mandatory. */
const REQUIRES_DATABASE = new Set<ConnectorEngine>([
  "mysql",
  "mariadb",
  "postgresql",
  "clickhouse",
  "sqlserver",
  "db2",
  "firebird",
  "oracle",
  "snowflake",
]);

function parseFilePath(raw: string, type: ConnectorEngine): ParsedConnection {
  let file = raw.trim().replace(new RegExp(`^${type}://`), "");
  if (file.startsWith("localhost/")) {
    file = file.slice("localhost".length);
  }
  if (file.endsWith("/") && file.length > 1) file = file.slice(0, -1);
  if (file.length === 0) {
    throw new Error(`${type} URL must include a file path (e.g. ${type}:///tmp/db.db).`);
  }
  return {
    type,
    host: "",
    port: 0,
    user: "",
    password: "",
    database: file,
    ssl: false,
  };
}

export function parseConnectionUrl(raw: string): ParsedConnection {
  const scheme = /^([a-z0-9+.-]+):/i.exec(raw.trim())?.[1]?.toLowerCase();
  if (!scheme) {
    throw new Error(`Unsupported connection URL: '${raw}'.`);
  }
  if (scheme === "sqlite" || scheme === "duckdb") {
    return parseFilePath(raw, scheme);
  }

  const type = PROTOCOLS[scheme];
  if (!type) {
    throw new Error(
      `Unsupported protocol '${scheme}'. Use mysql://, postgresql://, clickhouse://, sqlite:///path/to.db, or another supported engine URL.`,
    );
  }

  const url = new URL(raw);
  const host = url.hostname || "127.0.0.1";
  const port = url.port
    ? Number.parseInt(url.port, 10)
    : scheme === "clickhouses"
      ? 8443
      : DEFAULT_PORTS[type];
  const user = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  const database = (url.pathname || "/").replace(/^\//, "");
  // ClickHouse uses the HTTP interface: 8123 plain / 8443 TLS. `clickhouses://`
  // implies TLS; `?ssl=true` / `?secure=true` / `?sslmode=require` force it on.
  const ssl =
    scheme === "clickhouses" ||
    url.searchParams.get("ssl") === "true" ||
    url.searchParams.get("secure") === "true" ||
    url.searchParams.get("sslmode") === "require";

  if (!NO_USER_ENGINES.has(type) && !user) {
    throw new Error("Missing database user in connection URL.");
  }
  if (REQUIRES_DATABASE.has(type) && !database) {
    throw new Error("Missing database name in connection URL.");
  }

  return { type, host, port, user, password, database, ssl };
}

/** Merges partial overrides onto a base connection, applying defaults. */
export function mergeConnection(
  base: Partial<ParsedConnection>,
  overrides: Partial<ParsedConnection>,
): ParsedConnection {
  const type = overrides.type ?? base.type ?? "mysql";
  if (FILE_ENGINES.has(type)) {
    const database = overrides.database ?? base.database;
    if (!database) throw new Error(`${FILE_ENGINE_LABELS[type] ?? type} file path is required.`);
    return { type, host: "", port: 0, user: "", password: "", database, ssl: false };
  }
  const port = overrides.port ?? base.port ?? DEFAULT_PORTS[type];
  const host = overrides.host ?? base.host ?? "127.0.0.1";
  const user = overrides.user ?? base.user;
  const database = overrides.database ?? base.database;
  if (!NO_USER_ENGINES.has(type) && !user) throw new Error("Database user is required.");
  if (REQUIRES_DATABASE.has(type) && !database) throw new Error("Database name is required.");
  return {
    type,
    host,
    port,
    user: user ?? "",
    password: overrides.password ?? base.password ?? "",
    database: database ?? "",
    ssl: overrides.ssl ?? base.ssl ?? false,
  };
}
