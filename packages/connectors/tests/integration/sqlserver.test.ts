/**
 * Integration test against a real SQL Server instance.
 *
 * Runs only when EASYSQL_TEST_SQLSERVER_URL is set, e.g.
 *   sqlserver://sa:pass@127.0.0.1:1433/easysql_test
 * The database must already exist. The test is skipped with an explicit
 * message otherwise, so CI without a database stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { SqlServerConnectionConfig } from "../../src/sqlserver/index";
import { SqlServerConnector } from "../../src/sqlserver/index";

const url = process.env.EASYSQL_TEST_SQLSERVER_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): SqlServerConnectionConfig {
  const parsed = new URL(raw);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 1433,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    // The stock local/CI image uses a self-signed certificate.
    trustServerCertificate: true,
  };
}

describe.skipIf(!enabled)("SqlServerConnector integration", () => {
  let connector: SqlServerConnector;

  beforeAll(async () => {
    connector = new SqlServerConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("sqlserver");
    expect(Array.isArray(first.tables)).toBe(true);
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.rowCount).toBe(1);
    expect(result.columns).toEqual(["n"]);
    expect(result.rows[0]?.n).toBe(1);
  });
});

describe.skipIf(enabled)("SqlServerConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_SQLSERVER_URL", () => {
    expect(enabled).toBe(false);
  });
});
