import { describe, expect, it } from "bun:test";
import { ClickhouseConnector, sanitizeErrorMessage } from "../src/index";

describe("ClickhouseConnector configuration", () => {
  it("constructs with documented defaults", () => {
    const connector = new ClickhouseConnector({
      host: "ch.example.com",
      user: "default",
      password: "",
      database: "analytics",
    });
    expect(connector).toBeInstanceOf(ClickhouseConnector);
  });

  it("rejects missing required fields", () => {
    expect(
      () => new ClickhouseConnector({ host: "", user: "u", password: "p", database: "d" }),
    ).toThrow("host is required");
    expect(
      () => new ClickhouseConnector({ host: "h", user: "", password: "p", database: "d" }),
    ).toThrow("user is required");
    expect(
      () => new ClickhouseConnector({ host: "h", user: "u", password: "p", database: "" }),
    ).toThrow("database is required");
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new ClickhouseConnector({
      host: "h",
      user: "u",
      password: "p",
      database: "d",
    });
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
    await expect(connector.introspect()).rejects.toThrow("not connected");
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    expect(sanitizeErrorMessage("authentication failed (hunter2)", ["hunter2"])).toBe(
      "authentication failed (****)",
    );
  });
});
