/**
 * Integration test against a real PostgreSQL instance.
 *
 * Runs only when EASYSQL_TEST_POSTGRES_URL is set, e.g.
 *   postgresql://user:pass@127.0.0.1:5432/easysql_test
 * The database must already exist. Skipped with an explicit message otherwise.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { PostgresConnectionConfig } from "../src/index";
import { PostgresConnector } from "../src/index";

const url = process.env.EASYSQL_TEST_POSTGRES_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): PostgresConnectionConfig {
  const parsed = new URL(raw);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

describe.skipIf(!enabled)("PostgresConnector integration", () => {
  let connector: PostgresConnector;

  beforeAll(async () => {
    connector = new PostgresConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("postgresql");
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.n).toBe(1);
  });
});

describe.skipIf(enabled)("PostgresConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_POSTGRES_URL", () => {
    expect(enabled).toBe(false);
  });
});
