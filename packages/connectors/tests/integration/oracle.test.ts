/**
 * Integration test against a real Oracle Database instance.
 *
 * Runs only when EASYSQL_TEST_ORACLE_URL is set, e.g.
 *   oracle://user:pass@127.0.0.1:1521/FREEPDB1
 * The user/schema must already exist. Skipped with an explicit message
 * otherwise; no Oracle Client libraries are needed (Thin mode).
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { OracleConnectionConfig } from "../../src/oracle/index";
import { OracleConnector } from "../../src/oracle/index";
import { decodeTestUrl, skipSuite } from "./support";

const url = process.env.EASYSQL_TEST_ORACLE_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): OracleConnectionConfig {
  const { host, port, user, password, database } = decodeTestUrl(raw);
  return { host, port: port ?? 1521, serviceName: database, user, password };
}

describe.skipIf(!enabled)("OracleConnector integration", () => {
  let connector: OracleConnector;

  beforeAll(async () => {
    connector = new OracleConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("oracle");
  });

  it("executes a select and returns rows", async () => {
    // Oracle folds unquoted identifiers to upper case, so the column is "N".
    const result = await connector.execute("SELECT 1 AS n FROM dual");
    expect(result.rowCount).toBe(1);
    expect(result.columns).toEqual(["N"]);
    expect(result.rows[0]?.N).toBe(1);
  });
});

skipSuite("OracleConnector", "EASYSQL_TEST_ORACLE_URL", enabled);
