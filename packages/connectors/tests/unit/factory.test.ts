import { describe, expect, it } from "bun:test";
import { ClickhouseConnector } from "../../src/clickhouse/index.js";
import { ConnectorEngine, type CreateConnectorOptions, createConnector } from "../../src/index.js";
import { MysqlConnector } from "../../src/mysql/index.js";
import { PostgresConnector } from "../../src/postgres/index.js";

/** Same shape as `MysqlConnectorOptions.connection`, reused by the stub tests. */
const network = { host: "db.example.com", user: "reader", password: "secret", database: "app" };

/** Minimal valid configuration per engine — constructing must not open a connection. */
const CONFIGS: Array<[string, CreateConnectorOptions]> = [
  [
    "mysql",
    {
      engine: ConnectorEngine.MySQL,
      connection: { host: "localhost", user: "u", password: "p", database: "d" },
    },
  ],
  [
    "postgresql",
    {
      engine: ConnectorEngine.PostgreSQL,
      connection: { host: "localhost", user: "u", password: "p", database: "d" },
    },
  ],
  [
    "clickhouse",
    {
      engine: ConnectorEngine.ClickHouse,
      connection: { host: "localhost", user: "default", password: "", database: "d" },
    },
  ],
  ["sqlite", { engine: ConnectorEngine.SQLite, connection: { file: ":memory:", readonly: false } }],
  [
    "sqlserver",
    {
      engine: ConnectorEngine.SqlServer,
      connection: { host: "localhost", user: "sa", password: "p", database: "d" },
    },
  ],
  [
    "oracle",
    {
      engine: ConnectorEngine.Oracle,
      connection: { host: "localhost", serviceName: "FREEPDB1", user: "u", password: "p" },
    },
  ],
  [
    "firebird",
    {
      engine: ConnectorEngine.Firebird,
      connection: { host: "localhost", database: "/data/d.fdb", user: "u", password: "p" },
    },
  ],
  [
    "db2",
    {
      engine: ConnectorEngine.Db2,
      connection: { host: "localhost", database: "d", user: "u", password: "p" },
    },
  ],
  ["duckdb", { engine: ConnectorEngine.DuckDB, connection: { file: ":memory:" } }],
  ["libsql", { engine: ConnectorEngine.LibSql, connection: { url: "file::memory:" } }],
  [
    "d1",
    {
      engine: ConnectorEngine.CloudflareD1,
      connection: { accountId: "acc", databaseId: "db", apiToken: "token" },
    },
  ],
  [
    "snowflake",
    {
      engine: ConnectorEngine.Snowflake,
      connection: { account: "acc", user: "u", password: "p", database: "d" },
    },
  ],
  ["bigquery", { engine: ConnectorEngine.BigQuery, connection: { projectId: "project" } }],
  ["trino", { engine: ConnectorEngine.Trino, connection: { host: "localhost", user: "trino" } }],
  [
    "hana",
    {
      engine: ConnectorEngine.SapHana,
      connection: { host: "localhost", user: "u", password: "p" },
    },
  ],
];

describe("createConnector", () => {
  it("creates SQLite from a file config", async () => {
    const connector = await createConnector({
      engine: ConnectorEngine.SQLite,
      connection: { file: ":memory:", readonly: false },
    });
    await connector.connect();
    expect((await connector.execute("SELECT 42 AS answer")).rows[0]?.answer).toBe(42);
    await connector.close();
  });

  it("creates SQLite from a filename string", async () => {
    const connector = await createConnector({
      engine: ConnectorEngine.SQLite,
      connection: ":memory:",
    });
    expect(connector).toBeDefined();
    await connector.close();
  });

  it("creates MySQL from a connection string", async () => {
    const connector = await createConnector({
      engine: ConnectorEngine.MySQL,
      connection: "mysql://reader:secret@db.example.com:3307/app",
    });
    expect(connector).toBeInstanceOf(MysqlConnector);
  });

  it("creates PostgreSQL from a connection string and from an object config", async () => {
    const fromUrl = await createConnector({
      engine: ConnectorEngine.PostgreSQL,
      connection: "postgresql://reader:secret@pg.example.com:5433/app",
    });
    const fromObject = await createConnector({
      engine: ConnectorEngine.PostgreSQL,
      connection: network,
    });
    expect(fromUrl).toBeInstanceOf(PostgresConnector);
    expect(fromObject).toBeInstanceOf(PostgresConnector);
  });

  it("creates ClickHouse from a TLS connection string and from an object config", async () => {
    const fromUrl = await createConnector({
      engine: ConnectorEngine.ClickHouse,
      connection: "clickhouses://default:secret@ch.example.com/analytics",
    });
    const fromObject = await createConnector({
      engine: ConnectorEngine.ClickHouse,
      connection: { ...network, port: 8124 },
    });
    expect(fromUrl).toBeInstanceOf(ClickhouseConnector);
    expect(fromObject).toBeInstanceOf(ClickhouseConnector);
  });

  it("creates DuckDB from a config and runs a query end to end", async () => {
    const connector = await createConnector({
      engine: ConnectorEngine.DuckDB,
      connection: { file: ":memory:" },
    });
    await connector.connect();
    const result = await connector.execute("SELECT 7 AS answer");
    await connector.close();
    expect(Number(result.rows[0]?.answer)).toBe(7);
  });

  it("loads only the selected engine and returns the shared Connector shape", async () => {
    for (const [name, options] of CONFIGS) {
      const connector = await createConnector(options);
      for (const method of ["connect", "close", "introspect", "execute"] as const) {
        expect(typeof connector[method], `${name}.${method}`).toBe("function");
      }
      // Constructing must not have opened anything.
      await connector.close();
    }
  });

  it("rejects a connection string for the wrong engine", async () => {
    await expect(
      createConnector({
        engine: ConnectorEngine.MySQL,
        connection: "postgresql://user:secret@localhost/app",
      }),
    ).rejects.toThrow("Expected a mysql/mariadb connection string");
  });

  it("rejects a wrong-engine URL for the other network engines", async () => {
    const cases: CreateConnectorOptions[] = [
      {
        engine: ConnectorEngine.SqlServer,
        connection: "mysql://user:secret@localhost/app",
      },
      { engine: ConnectorEngine.Trino, connection: "mysql://user:secret@localhost/app" },
      { engine: ConnectorEngine.Db2, connection: "mysql://user:secret@localhost/app" },
      { engine: ConnectorEngine.SapHana, connection: "mysql://user:secret@localhost/app" },
    ];
    for (const options of cases) {
      await expect(createConnector(options)).rejects.toThrow(/Expected a .* connection string/);
    }
  });

  it("accepts the file-URL form for SQLite and DuckDB", async () => {
    const sqlite = await createConnector({
      engine: ConnectorEngine.SQLite,
      connection: "sqlite:///tmp/easysql-factory-test.db",
    });
    await sqlite.close();

    const duckdb = await createConnector({
      engine: ConnectorEngine.DuckDB,
      connection: "duckdb:///tmp/easysql-factory-test.duckdb",
    });
    await duckdb.close();
  });

  it("requires a connection string for the Neon HTTP transport", async () => {
    await expect(
      createConnector({
        engine: ConnectorEngine.PostgreSQL,
        provider: "neon",
        transport: "http",
        connection: { host: "localhost", user: "u", database: "d" },
      }),
    ).rejects.toThrow(/connectionString is required/);
  });

  it("rejects a non-Neon provider on the HTTP transport", async () => {
    await expect(
      createConnector({
        engine: ConnectorEngine.PostgreSQL,
        provider: "cockroachdb",
        transport: "http",
        connection: "postgresql://user:secret@localhost/app",
      }),
    ).rejects.toThrow(/only supported for the Neon provider/);
  });
});
