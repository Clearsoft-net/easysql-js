/**
 * Unit tests for {@link FirebirdConnector}.
 *
 * The connector is asynchronous, so the "not connected" guards are asserted
 * through rejected promises. `connect()` itself is only exercised against a
 * real server (see tests/integration/firebird.test.ts).
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FirebirdConnector } from "../../../src/firebird/index";

const SOURCE = readFileSync(join(import.meta.dir, "../../../src/firebird/connector.ts"), "utf8");

function baseConfig() {
  return { database: "/data/shop.fdb", user: "SYSDBA", password: "masterkey" };
}

describe("FirebirdConnector configuration", () => {
  it("rejects a missing database", () => {
    expect(() => new FirebirdConnector({ ...baseConfig(), database: "" })).toThrow(
      "FirebirdConnector: database is required",
    );
  });

  it("rejects a missing user", () => {
    expect(() => new FirebirdConnector({ ...baseConfig(), user: "" })).toThrow(
      "FirebirdConnector: user is required",
    );
  });

  it("rejects a missing password", () => {
    expect(() => new FirebirdConnector({ ...baseConfig(), password: "" })).toThrow(
      "FirebirdConnector: password is required",
    );
  });

  it("accepts a complete configuration", () => {
    expect(new FirebirdConnector(baseConfig())).toBeInstanceOf(FirebirdConnector);
  });

  it("documents the localhost, 3050 and 10000ms defaults", () => {
    expect(SOURCE).toContain('host: config.host || "localhost"');
    expect(SOURCE).toContain("port: config.port ?? 3050");
    expect(SOURCE).toContain("connectTimeoutMs: config.connectTimeoutMs ?? 10_000");
  });

  it("asks the driver for lowercase row keys", () => {
    // Row keys and reported column names must agree; the driver defaults to
    // preserving the SQL alias casing, so the connector opts into lowercasing.
    expect(SOURCE).toContain("lowercase_keys: true");
  });
});

describe("FirebirdConnector lifecycle", () => {
  it("requires connect() before introspect", async () => {
    const connector = new FirebirdConnector(baseConfig());
    await expect(connector.introspect()).rejects.toThrow("not connected");
  });

  it("requires connect() before execute", async () => {
    const connector = new FirebirdConnector(baseConfig());
    await expect(connector.execute("SELECT 1 FROM RDB$DATABASE")).rejects.toThrow("not connected");
  });

  it("closes safely when never connected", async () => {
    const connector = new FirebirdConnector(baseConfig());
    await expect(connector.close()).resolves.toBeUndefined();
  });

  it("rejects an unreachable server and redacts the password", async () => {
    const connector = new FirebirdConnector({
      host: "127.0.0.1",
      port: 1,
      database: "/data/shop.fdb",
      user: "SYSDBA",
      password: "sup3r-secret",
      connectTimeoutMs: 1_000,
    });

    let message = "";
    try {
      await connector.connect();
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain("sup3r-secret");
  });
});
