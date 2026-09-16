/**
 * Integration test against a real MySQL/MariaDB instance.
 *
 * Runs only when EASYSQL_TEST_MYSQL_URL is set, e.g.
 *   mysql://user:pass@127.0.0.1:3306/easysql_test
 * The database must already exist. The test is skipped with an explicit
 * message otherwise, so CI without a database stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { MysqlConnectionConfig } from "../src/index";
import { MysqlConnector } from "../src/index";

const url = process.env.EASYSQL_TEST_MYSQL_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): MysqlConnectionConfig {
  const parsed = new URL(raw);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  };
}

describe.skipIf(!enabled)("MysqlConnector integration", () => {
  let connector: MysqlConnector;

  beforeAll(async () => {
    connector = new MysqlConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("mysql");
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.n).toBe(1);
  });
});

describe.skipIf(enabled)("MysqlConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_MYSQL_URL", () => {
    expect(enabled).toBe(false);
  });
});
