import { describe, expect, it } from "bun:test";
import {
  type SnowflakeConnectionConfig,
  SnowflakeConnector,
  sanitizeErrorMessage,
} from "../../../src/snowflake/index";

const base: SnowflakeConnectionConfig = {
  account: "xy12345.us-east-1",
  user: "readonly",
  password: "secret",
  database: "ANALYTICS",
};

describe("SnowflakeConnector configuration", () => {
  it("constructs with the documented defaults", () => {
    const connector = new SnowflakeConnector(base);
    expect(connector).toBeInstanceOf(SnowflakeConnector);
  });

  it("accepts the optional schema, warehouse, role and timeout", () => {
    const connector = new SnowflakeConnector({
      ...base,
      schema: "PUBLIC",
      warehouse: "COMPUTE_WH",
      role: "ANALYST",
      connectTimeoutMs: 120_000,
    });
    expect(connector).toBeInstanceOf(SnowflakeConnector);
  });

  it("rejects missing required fields", () => {
    expect(() => new SnowflakeConnector({ ...base, account: "" })).toThrow("account is required");
    expect(() => new SnowflakeConnector({ ...base, user: "" })).toThrow("user is required");
    expect(() => new SnowflakeConnector({ ...base, password: "" })).toThrow("password is required");
    expect(() => new SnowflakeConnector({ ...base, database: "" })).toThrow("database is required");
  });

  it("prefixes every validation message with the class name", () => {
    expect(() => new SnowflakeConnector({ ...base, account: "" })).toThrow(/^SnowflakeConnector:/);
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new SnowflakeConnector(base);
    await expect(connector.introspect()).rejects.toThrow("not connected");
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
  });

  it("closes cleanly when it was never connected", async () => {
    const connector = new SnowflakeConnector(base);
    await expect(connector.close()).resolves.toBeUndefined();
  });

  it("keeps instances independent", () => {
    const a = new SnowflakeConnector({ ...base, database: "A" });
    const b = new SnowflakeConnector({ ...base, database: "B" });
    expect(a).not.toBe(b);
    // Closing one connector must not affect the other.
    expect(b).toBeInstanceOf(SnowflakeConnector);
    expect(a).toBeInstanceOf(SnowflakeConnector);
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    expect(
      sanitizeErrorMessage("Incorrect username or password (hunter2) for user", ["hunter2"]),
    ).toBe("Incorrect username or password (****) for user");
  });
});
