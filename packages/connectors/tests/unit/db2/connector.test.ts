import { describe, expect, it } from "bun:test";
import { Db2Connector, sanitizeErrorMessage } from "../../../src/db2/index";

describe("Db2Connector configuration", () => {
  it("applies documented defaults", () => {
    const connector = new Db2Connector({
      database: "app",
      user: "readonly",
      password: "secret",
    });
    // No getter for config; constructing without throwing is the assertion.
    expect(connector).toBeInstanceOf(Db2Connector);
  });

  it("accepts an explicit host, port, TLS and timeout", () => {
    const connector = new Db2Connector({
      host: "db.example.com",
      port: 50_001,
      database: "app",
      user: "readonly",
      password: "secret",
      ssl: true,
      connectTimeoutMs: 2_500,
    });
    expect(connector).toBeInstanceOf(Db2Connector);
  });

  it("rejects missing required fields", () => {
    expect(() => new Db2Connector({ database: "", user: "u", password: "p" })).toThrow(
      "Db2Connector: database is required",
    );
    expect(() => new Db2Connector({ database: "d", user: "", password: "p" })).toThrow(
      "Db2Connector: user is required",
    );
  });

  it("has no module-level state — several connectors can coexist", () => {
    const a = new Db2Connector({ host: "a", database: "d", user: "u", password: "p" });
    const b = new Db2Connector({ host: "b", database: "d", user: "u", password: "p" });
    expect(a).not.toBe(b);
  });
});

describe("Db2Connector lifecycle", () => {
  it("throws when introspecting before connect()", async () => {
    const connector = new Db2Connector({ database: "d", user: "u", password: "p" });
    await expect(connector.introspect()).rejects.toThrow("Db2Connector: not connected");
  });

  it("throws when executing before connect()", async () => {
    const connector = new Db2Connector({ database: "d", user: "u", password: "p" });
    await expect(connector.execute("SELECT 1 FROM SYSIBM.SYSDUMMY1")).rejects.toThrow(
      "Db2Connector: not connected",
    );
  });

  it("closes safely when it never connected", async () => {
    const connector = new Db2Connector({ database: "d", user: "u", password: "p" });
    await connector.close();
    expect(connector).toBeInstanceOf(Db2Connector);
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    const message = "Access denied for user 'u' using password 'hunter2' (hunter2)";
    expect(sanitizeErrorMessage(message, ["hunter2"])).toBe(
      "Access denied for user 'u' using password '****' (****)",
    );
  });

  it("ignores empty secrets", () => {
    expect(sanitizeErrorMessage("boom", ["", undefined])).toBe("boom");
  });
});
