import type { Connector } from "@easysql/common";
import { loadDriver } from "./driver-loading.js";
import { ConnectorEngine, type CreateConnectorOptions } from "./types.js";

/**
 * Create a connector for the selected database engine. The engine module (and
 * its third-party driver) is dynamically imported only when this function runs,
 * so installing `@easysql/connectors` never pulls in every database driver.
 *
 * Each engine owns its own normalisation and construction in its `create()`
 * export, so adding an engine only adds one line to the table below.
 */
export async function createConnector(options: CreateConnectorOptions): Promise<Connector> {
  switch (options.engine) {
    case ConnectorEngine.MySQL:
      return (await loadDriver("mysql2", () => import("./mysql/index.js"))).create(options);
    case ConnectorEngine.PostgreSQL:
      return (await loadDriver("pg", () => import("./postgres/index.js"))).create(options);
    case ConnectorEngine.ClickHouse:
      return (await loadDriver("@clickhouse/client", () => import("./clickhouse/index.js"))).create(
        options,
      );
    case ConnectorEngine.SQLite:
      return (await loadDriver("node:sqlite", () => import("./sqlite/index.js"))).create(options);
    case ConnectorEngine.SqlServer:
      return (await loadDriver("mssql", () => import("./sqlserver/index.js"))).create(options);
    case ConnectorEngine.Oracle:
      return (await loadDriver("oracledb", () => import("./oracle/index.js"))).create(options);
    case ConnectorEngine.Firebird:
      return (await loadDriver("node-firebird", () => import("./firebird/index.js"))).create(
        options,
      );
    case ConnectorEngine.Db2:
      return (await loadDriver("ibm_db", () => import("./db2/index.js"))).create(options);
    case ConnectorEngine.DuckDB:
      return (await loadDriver("@duckdb/node-api", () => import("./duckdb/index.js"))).create(
        options,
      );
    case ConnectorEngine.LibSql:
      return (await loadDriver("@libsql/client", () => import("./libsql/index.js"))).create(
        options,
      );
    case ConnectorEngine.CloudflareD1:
      return (await loadDriver("fetch", () => import("./d1/index.js"))).create(options);
    case ConnectorEngine.Snowflake:
      return (await loadDriver("snowflake-sdk", () => import("./snowflake/index.js"))).create(
        options,
      );
    case ConnectorEngine.BigQuery:
      return (
        await loadDriver("@google-cloud/bigquery", () => import("./bigquery/index.js"))
      ).create(options);
    case ConnectorEngine.Trino:
      return (await loadDriver("trino-client", () => import("./trino/index.js"))).create(options);
    case ConnectorEngine.SapHana:
      return (await loadDriver("@sap/hana-client", () => import("./hana/index.js"))).create(
        options,
      );
  }
}
