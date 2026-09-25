/**
 * Connection-string parsing for the connector engines.
 *
 * Supports:
 *   mysql://user:pass@host:port/db
 *   mariadb://user:pass@host:port/db
 *   postgresql://user:pass@host:port/db
 *   clickhouse://user:pass@host:8123/db      (HTTP interface)
 *   clickhouses://user:pass@host:8443/db     (HTTPS interface)
 *   sqlite:///absolute/path/to.db
 *
 * The returned object keeps the password in memory only; callers decide
 * whether it is ever persisted (it should not be).
 */

import type { ConnectorEngine } from "./schema.js";

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
};

function parseSqliteUrl(raw: string): ParsedConnection {
  let file = raw.replace(/^sqlite:\/\//, "");
  if (file.startsWith("localhost/")) {
    file = file.slice("localhost".length);
  }
  if (file.endsWith("/") && file.length > 1) file = file.slice(0, -1);
  if (file.length === 0) {
    throw new Error("SQLite URL must include a file path (e.g. sqlite:///tmp/db.db).");
  }
  return {
    type: "sqlite",
    host: "",
    port: 0,
    user: "",
    password: "",
    database: file,
    ssl: false,
  };
}

export function parseConnectionUrl(raw: string): ParsedConnection {
  if (raw.startsWith("sqlite:")) {
    return parseSqliteUrl(raw);
  }
  const url = new URL(raw);
  const protocol = url.protocol.replace(":", "");
  let type: ConnectorEngine;
  switch (protocol) {
    case "mysql":
      type = "mysql";
      break;
    case "mariadb":
      type = "mariadb";
      break;
    case "postgres":
    case "postgresql":
      type = "postgresql";
      break;
    case "clickhouse":
    case "clickhouses":
      type = "clickhouse";
      break;
    default:
      throw new Error(
        `Unsupported protocol '${protocol}'. Use mysql://, postgresql://, clickhouse://, or sqlite:///path/to.db`,
      );
  }

  const host = url.hostname || "127.0.0.1";
  const port = url.port
    ? Number.parseInt(url.port, 10)
    : protocol === "clickhouses"
      ? 8443
      : DEFAULT_PORTS[type];
  const user = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  const database = (url.pathname || "/").replace(/^\//, "");
  // ClickHouse uses the HTTP interface: 8123 plain / 8443 TLS. `clickhouses://`
  // implies TLS; `?ssl=true` / `?secure=true` force it on the plain scheme.
  const ssl =
    protocol === "clickhouses" ||
    (protocol === "clickhouse" &&
      (url.searchParams.get("ssl") === "true" || url.searchParams.get("secure") === "true")) ||
    (url.searchParams.get("sslmode") === "require" || protocol === "mysql"
      ? url.searchParams.get("ssl") === "true"
      : false);

  if (!user) throw new Error("Missing database user in connection URL.");
  if (!database) throw new Error("Missing database name in connection URL.");

  return { type, host, port, user, password, database, ssl };
}

/** Merges partial overrides onto a base connection, applying defaults. */
export function mergeConnection(
  base: Partial<ParsedConnection>,
  overrides: Partial<ParsedConnection>,
): ParsedConnection {
  const type = overrides.type ?? base.type ?? "mysql";
  if (type === "sqlite") {
    const database = overrides.database ?? base.database;
    if (!database) throw new Error("SQLite file path is required.");
    return { type, host: "", port: 0, user: "", password: "", database, ssl: false };
  }
  const port = overrides.port ?? base.port ?? DEFAULT_PORTS[type];
  const host = overrides.host ?? base.host ?? "127.0.0.1";
  const user = overrides.user ?? base.user;
  const database = overrides.database ?? base.database;
  if (!user) throw new Error("Database user is required.");
  if (!database) throw new Error("Database name is required.");
  return {
    type,
    host,
    port,
    user,
    password: overrides.password ?? base.password ?? "",
    database,
    ssl: overrides.ssl ?? base.ssl ?? false,
  };
}
