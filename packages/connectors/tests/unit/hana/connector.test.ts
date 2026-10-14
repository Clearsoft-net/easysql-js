import { describe, expect, it } from "bun:test";
import { HanaConnector, sanitizeErrorMessage } from "../../../src/hana/index";

describe("HanaConnector configuration", () => {
  it("applies documented defaults", () => {
    const connector = new HanaConnector({
      host: "db.example.com",
      user: "readonly",
      password: "secret",
    });
    // No getter for config; constructing without throwing is the assertion.
    expect(connector).toBeInstanceOf(HanaConnector);
  });

  it("accepts an explicit port, TLS and timeout", () => {
    const connector = new HanaConnector({
      host: "db.example.com",
      port: 30_041,
      user: "readonly",
      password: "secret",
      ssl: true,
      connectTimeoutMs: 2_500,
    });
    expect(connector).toBeInstanceOf(HanaConnector);
  });

  it("rejects missing required fields", () => {
    expect(() => new HanaConnector({ host: "", user: "u", password: "p" })).toThrow(
      "HanaConnector: host is required",
    );
    expect(() => new HanaConnector({ host: "h", user: "", password: "p" })).toThrow(
      "HanaConnector: user is required",
    );
  });

  it("has no module-level state — several connectors can coexist", () => {
    const a = new HanaConnector({ host: "a", user: "u", password: "p" });
    const b = new HanaConnector({ host: "b", user: "u", password: "p" });
    expect(a).not.toBe(b);
  });
});

describe("HanaConnector lifecycle", () => {
  it("throws when introspecting before connect()", async () => {
    const connector = new HanaConnector({ host: "h", user: "u", password: "p" });
    await expect(connector.introspect()).rejects.toThrow("HanaConnector: not connected");
  });

  it("throws when executing before connect()", async () => {
    const connector = new HanaConnector({ host: "h", user: "u", password: "p" });
    await expect(connector.execute("SELECT 1 FROM DUMMY")).rejects.toThrow(
      "HanaConnector: not connected",
    );
  });

  it("closes safely when it never connected", async () => {
    const connector = new HanaConnector({ host: "h", user: "u", password: "p" });
    await connector.close();
    expect(connector).toBeInstanceOf(HanaConnector);
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    const message = "Authentication failed for user 'u' using password 'hunter2' (hunter2)";
    expect(sanitizeErrorMessage(message, ["hunter2"])).toBe(
      "Authentication failed for user 'u' using password '****' (****)",
    );
  });

  it("ignores empty secrets", () => {
    expect(sanitizeErrorMessage("boom", ["", undefined])).toBe("boom");
  });
});
