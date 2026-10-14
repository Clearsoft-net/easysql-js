/**
 * Integration test against a real Trino coordinator.
 *
 * Runs only when EASYSQL_TEST_TRINO_URL is set, e.g.
 *   http://user@127.0.0.1:8080
 * EASYSQL_TEST_TRINO_CATALOG and EASYSQL_TEST_TRINO_SCHEMA (defaults `tpch` and
 * `tiny`) select the session catalog and schema. The test is skipped with an
 * explicit message otherwise, so CI without a coordinator stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { TrinoConnectionConfig } from "../../src/trino/index";
import { TrinoConnector } from "../../src/trino/index";

const url = process.env.EASYSQL_TEST_TRINO_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): TrinoConnectionConfig {
  const parsed = new URL(raw);
  const ssl = parsed.protocol === "https:";
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : ssl ? 443 : 8080,
    user: decodeURIComponent(parsed.username) || "easysql",
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    ssl,
    catalog: process.env.EASYSQL_TEST_TRINO_CATALOG ?? "tpch",
    schema: process.env.EASYSQL_TEST_TRINO_SCHEMA ?? "tiny",
  };
}

describe.skipIf(!enabled)("TrinoConnector integration", () => {
  let connector: TrinoConnector;

  beforeAll(async () => {
    connector = new TrinoConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(() => {
    connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("trino");
    expect(Array.isArray(first.tables)).toBe(true);
  });

  it("reports ordinal columns and no key metadata", async () => {
    const schema = await connector.introspect();
    for (const table of schema.tables) {
      expect(table.rowsApprox).toBeNull();
      expect(table.columns.map((c) => c.ordinal)).toEqual(
        table.columns.map((_, index) => index + 1),
      );
      for (const column of table.columns) {
        expect(column.primaryKey).toBe(false);
        expect(column.foreignKey).toBeNull();
      }
    }
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.columns).toEqual(["n"]);
    expect(result.rowCount).toBe(1);
    expect(Number(result.rows[0]?.n)).toBe(1);
  });
});

describe.skipIf(enabled)("TrinoConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_TRINO_URL", () => {
    expect(enabled).toBe(false);
  });
});
