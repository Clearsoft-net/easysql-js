/**
 * Integration test against a remote Turso/libSQL database.
 *
 * Runs only when EASYSQL_TEST_LIBSQL_URL is set, e.g.
 *   libsql://my-db.turso.io
 * EASYSQL_TEST_LIBSQL_TOKEN supplies the auth token for Turso Cloud. The test
 * is skipped with an explicit message otherwise, so CI without a database stays
 * green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { LibSqlConnectionConfig } from "../../src/libsql/index";
import { LibSqlConnector } from "../../src/libsql/index";

const url = process.env.EASYSQL_TEST_LIBSQL_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): LibSqlConnectionConfig {
  return {
    url: raw,
    authToken: process.env.EASYSQL_TEST_LIBSQL_TOKEN,
    readonly: true,
  };
}

describe.skipIf(!enabled)("LibSqlConnector integration", () => {
  let connector: LibSqlConnector;

  beforeAll(async () => {
    connector = new LibSqlConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(() => {
    connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("libsql");
    expect(Array.isArray(first.tables)).toBe(true);
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.columns).toEqual(["n"]);
    expect(result.rowCount).toBe(1);
    expect(Number(result.rows[0]?.n)).toBe(1);
  });
});

describe.skipIf(enabled)("LibSqlConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_LIBSQL_URL", () => {
    expect(enabled).toBe(false);
  });
});
