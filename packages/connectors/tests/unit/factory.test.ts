import { describe, expect, it } from "bun:test";
import { ClickhouseConnector } from "../../src/clickhouse/index.js";
import { ConnectorEngine, createConnector } from "../../src/index.js";
import { MysqlConnector } from "../../src/mysql/index.js";
import { PostgresConnector } from "../../src/postgres/index.js";

/** Same shape as `MysqlConnectorOptions.connection`, reused by the stub tests. */
const network = { host: "db.example.com", user: "reader", password: "secret", database: "app" };

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

  it("rejects a connection string for the wrong engine", async () => {
    await expect(
      createConnector({
        engine: ConnectorEngine.MySQL,
        connection: "postgresql://user:secret@localhost/app",
      }),
    ).rejects.toThrow("Expected a mysql/mariadb connection string");
  });
});
