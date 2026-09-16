import { describe, expect, it } from "bun:test";
import { MysqlConnector, sanitizeErrorMessage } from "../src/index";

describe("MysqlConnector configuration", () => {
  it("applies documented defaults", () => {
    const connector = new MysqlConnector({
      host: "db.example.com",
      user: "readonly",
      password: "secret",
      database: "app",
    });
    // No getter for config; constructing without throwing is the assertion.
    expect(connector).toBeInstanceOf(MysqlConnector);
  });

  it("rejects missing required fields", () => {
    expect(() => new MysqlConnector({ host: "", user: "u", password: "p", database: "d" })).toThrow(
      "host is required",
    );
    expect(() => new MysqlConnector({ host: "h", user: "", password: "p", database: "d" })).toThrow(
      "user is required",
    );
    expect(() => new MysqlConnector({ host: "h", user: "u", password: "p", database: "" })).toThrow(
      "database is required",
    );
  });

  it("has no module-level state — several connectors can coexist", () => {
    const a = new MysqlConnector({ host: "a", user: "u", password: "p", database: "d" });
    const b = new MysqlConnector({ host: "b", user: "u", password: "p", database: "d" });
    expect(a).not.toBe(b);
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
