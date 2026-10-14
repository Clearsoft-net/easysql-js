/**
 * Integration test against a real Snowflake account.
 *
 * Runs only when EASYSQL_TEST_SNOWFLAKE_URL is set, e.g.
 *   snowflake://USER:PASSWORD@xy12345.us-east-1/ANALYTICS/PUBLIC?warehouse=COMPUTE_WH
 * The database and schema must already exist and the role must be able to read
 * INFORMATION_SCHEMA. Skipped with an explicit message otherwise, so CI without
 * credentials stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { SnowflakeConnectionConfig } from "../../src/snowflake/index";
import { SnowflakeConnector } from "../../src/snowflake/index";

const url = process.env.EASYSQL_TEST_SNOWFLAKE_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): SnowflakeConnectionConfig {
  const parsed = new URL(raw);
  const [database, schema] = parsed.pathname.replace(/^\//, "").split("/");
  return {
    account: parsed.hostname,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: database ? decodeURIComponent(database) : "",
    ...(schema ? { schema: decodeURIComponent(schema) } : {}),
    ...(parsed.searchParams.get("warehouse")
      ? { warehouse: parsed.searchParams.get("warehouse") as string }
      : {}),
    ...(parsed.searchParams.get("role") ? { role: parsed.searchParams.get("role") as string } : {}),
  };
}

describe.skipIf(!enabled)("SnowflakeConnector integration", () => {
  let connector: SnowflakeConnector;

  beforeAll(async () => {
    connector = new SnowflakeConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("snowflake");
    for (const table of first.tables) {
      expect(table.rowsApprox).toBeNull();
      for (const column of table.columns) {
        expect(typeof column.ordinal).toBe("number");
        expect(typeof column.primaryKey).toBe("boolean");
      }
    }
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.columns).toContain("N");
    expect(result.rowCount).toBe(1);
    expect(Number(result.rows[0]?.N)).toBe(1);
  });

  it("redacts the password from driver errors", async () => {
    const bad = new SnowflakeConnector({
      ...configFromUrl(url as string),
      password: "definitely-not-the-password",
    });
    await expect(bad.connect()).rejects.toThrow();
  });
});

describe.skipIf(enabled)("SnowflakeConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_SNOWFLAKE_URL", () => {
    expect(enabled).toBe(false);
  });
});
