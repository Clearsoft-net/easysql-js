import { describe, expect, it } from "bun:test";
import { PostgresConnector, sanitizeErrorMessage } from "../src/index";

describe("PostgresConnector configuration", () => {
  it("constructs with documented defaults", () => {
    const connector = new PostgresConnector({
      host: "db.example.com",
      user: "readonly",
      password: "secret",
      database: "app",
    });
    expect(connector).toBeInstanceOf(PostgresConnector);
  });

  it("rejects missing required fields", () => {
    expect(
      () => new PostgresConnector({ host: "", user: "u", password: "p", database: "d" }),
    ).toThrow("host is required");
    expect(
      () => new PostgresConnector({ host: "h", user: "", password: "p", database: "d" }),
    ).toThrow("user is required");
    expect(
      () => new PostgresConnector({ host: "h", user: "u", password: "p", database: "" }),
    ).toThrow("database is required");
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new PostgresConnector({
      host: "h",
      user: "u",
      password: "p",
      database: "d",
    });
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    expect(
      sanitizeErrorMessage("password authentication failed for 'u' (hunter2)", ["hunter2"]),
    ).toBe("password authentication failed for 'u' (****)");
  });
});
