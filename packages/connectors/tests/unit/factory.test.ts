import { describe, expect, it } from "bun:test";
import { ConnectorEngine, createConnector } from "../../src/index.js";

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

  it("rejects a connection string for the wrong engine", async () => {
    await expect(
      createConnector({
        engine: ConnectorEngine.MySQL,
        connection: "postgresql://user:secret@localhost/app",
      }),
    ).rejects.toThrow("Expected a mysql/mariadb connection string");
  });
});
