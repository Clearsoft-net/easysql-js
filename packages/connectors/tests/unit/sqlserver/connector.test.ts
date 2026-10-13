import { describe, expect, it } from "bun:test";
import { SqlServerConnector, sanitizeErrorMessage } from "../../../src/sqlserver/index";

interface ResolvedConfig {
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectTimeoutMs: number;
  host?: string;
  user: string;
  database: string;
}

/** Reads the resolved configuration the connector would hand to `mssql`. */
function resolvedConfig(connector: SqlServerConnector): ResolvedConfig {
  return (connector as unknown as { config: ResolvedConfig }).config;
}

describe("SqlServerConnector configuration", () => {
  it("applies documented defaults", () => {
    const connector = new SqlServerConnector({
      host: "db.example.com",
      user: "readonly",
      password: "secret",
      database: "app",
    });
    const config = resolvedConfig(connector);
    expect(config.port).toBe(1433);
    expect(config.encrypt).toBe(true);
    expect(config.trustServerCertificate).toBe(false);
    expect(config.connectTimeoutMs).toBe(10_000);
  });

  it("keeps explicit overrides", () => {
    const connector = new SqlServerConnector({
      host: "db.example.com",
      port: 1444,
      user: "readonly",
      password: "secret",
      database: "app",
      encrypt: false,
      trustServerCertificate: true,
      connectTimeoutMs: 2_500,
    });
    const config = resolvedConfig(connector);
    expect(config.port).toBe(1444);
    expect(config.encrypt).toBe(false);
    expect(config.trustServerCertificate).toBe(true);
    expect(config.connectTimeoutMs).toBe(2_500);
  });

  it("rejects missing required fields", () => {
    expect(
      () => new SqlServerConnector({ host: "", user: "u", password: "p", database: "d" }),
    ).toThrow("SqlServerConnector: host is required");
    expect(
      () => new SqlServerConnector({ host: "h", user: "", password: "p", database: "d" }),
    ).toThrow("SqlServerConnector: user is required");
    expect(
      () => new SqlServerConnector({ host: "h", user: "u", password: "p", database: "" }),
    ).toThrow("SqlServerConnector: database is required");
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new SqlServerConnector({
      host: "h",
      user: "u",
      password: "p",
      database: "d",
    });
    await expect(connector.introspect()).rejects.toThrow("not connected");
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
  });

  it("has no module-level state — several connectors can coexist", () => {
    const a = new SqlServerConnector({ host: "a", user: "u", password: "p", database: "d" });
    const b = new SqlServerConnector({ host: "b", user: "u", password: "p", database: "d" });
    expect(a).not.toBe(b);
    expect(resolvedConfig(a).host).toBe("a");
    expect(resolvedConfig(b).host).toBe("b");
  });

  it("closes cleanly when never connected", async () => {
    const connector = new SqlServerConnector({
      host: "h",
      user: "u",
      password: "p",
      database: "d",
    });
    await expect(connector.close()).resolves.toBeUndefined();
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    expect(
      sanitizeErrorMessage("Login failed for user 'sa' with password hunter2 (hunter2)", [
        "hunter2",
      ]),
    ).toBe("Login failed for user 'sa' with password **** (****)");
  });
});
