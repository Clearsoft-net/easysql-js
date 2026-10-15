/**
 * Integration test against a real IBM Db2 instance.
 *
 * Runs only when EASYSQL_TEST_DB2_URL is set, e.g.
 *   db2://user:pass@127.0.0.1:50000/easysql_test
 * The database must already exist and the connecting user's current schema must
 * contain the tables under test. Skipped with an explicit message otherwise, so
 * CI without a database stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Db2ConnectionConfig } from "../../src/db2/index";
import { Db2Connector } from "../../src/db2/index";
import { decodeTestUrl, skipSuite } from "./support";

const url = process.env.EASYSQL_TEST_DB2_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): Db2ConnectionConfig {
  const { host, port, user, password, database } = decodeTestUrl(raw);
  return { host, port: port ?? 50_000, user, password, database };
}

describe.skipIf(!enabled)("Db2Connector integration", () => {
  let connector: Db2Connector;

  beforeAll(async () => {
    connector = new Db2Connector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("db2");
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute('SELECT 1 AS "n" FROM SYSIBM.SYSDUMMY1');
    expect(result.rowCount).toBe(1);
    expect(result.columns).toEqual(["n"]);
    expect(result.rows[0]?.n).toBe(1);
  });
});

skipSuite("Db2Connector", "EASYSQL_TEST_DB2_URL", enabled);
