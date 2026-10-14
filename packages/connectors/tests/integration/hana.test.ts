/**
 * Integration test against a real SAP HANA instance.
 *
 * Runs only when EASYSQL_TEST_HANA_URL is set, e.g.
 *   hana://user:pass@127.0.0.1:30015
 * The connecting user's current schema must contain the tables under test.
 * Skipped with an explicit message otherwise, so CI without a database stays
 * green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { HanaConnectionConfig } from "../../src/hana/index";
import { HanaConnector } from "../../src/hana/index";

const url = process.env.EASYSQL_TEST_HANA_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): HanaConnectionConfig {
  const parsed = new URL(raw);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 30_015,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  };
}

describe.skipIf(!enabled)("HanaConnector integration", () => {
  let connector: HanaConnector;

  beforeAll(async () => {
    connector = new HanaConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("hana");
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute('SELECT 1 AS "n" FROM DUMMY');
    expect(result.rowCount).toBe(1);
    expect(result.columns).toEqual(["n"]);
    expect(result.rows[0]?.n).toBe(1);
  });
});

describe.skipIf(enabled)("HanaConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_HANA_URL", () => {
    expect(enabled).toBe(false);
  });
});
