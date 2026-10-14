/**
 * Integration test against a real Cloudflare D1 database over the REST API.
 *
 * Runs only when EASYSQL_TEST_D1_ACCOUNT_ID, EASYSQL_TEST_D1_DATABASE_ID and
 * EASYSQL_TEST_D1_API_TOKEN are all set. The API token needs D1 Read (and
 * D1 Write for the mutation assertions) permission on the account. The test is
 * skipped with an explicit message otherwise, so CI without D1 credentials
 * stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { D1ConnectionConfig } from "../../src/d1/index";
import { D1Connector } from "../../src/d1/index";

const accountId = process.env.EASYSQL_TEST_D1_ACCOUNT_ID;
const databaseId = process.env.EASYSQL_TEST_D1_DATABASE_ID;
const apiToken = process.env.EASYSQL_TEST_D1_API_TOKEN;
const enabled = Boolean(accountId && databaseId && apiToken);

const table = "easysql_d1_integration";

function configFromEnv(): D1ConnectionConfig {
  return {
    accountId: accountId as string,
    databaseId: databaseId as string,
    apiToken: apiToken as string,
    baseUrl: process.env.EASYSQL_TEST_D1_BASE_URL,
  };
}

describe.skipIf(!enabled)("D1Connector integration", () => {
  let connector: D1Connector;

  beforeAll(async () => {
    connector = new D1Connector(configFromEnv());
    await connector.connect();
    await connector.execute(`DROP TABLE IF EXISTS ${table}`);
    await connector.execute(
      `CREATE TABLE ${table} (
         id INTEGER PRIMARY KEY,
         email TEXT NOT NULL,
         role_id INTEGER,
         active BOOLEAN DEFAULT 1,
         FOREIGN KEY (role_id) REFERENCES ${table} (id)
       )`,
    );
  });

  afterAll(async () => {
    try {
      await connector?.execute(`DROP TABLE IF EXISTS ${table}`);
    } finally {
      connector?.close();
    }
  });

  it("executes a select and returns typed rows", async () => {
    const result = await connector.execute("SELECT 1 AS n, 'x' AS s");
    expect(result.columns).toEqual(["n", "s"]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toEqual({ n: 1, s: "x" });
  });

  it("reports affected rows for a statement without a result set", async () => {
    const inserted = await connector.execute(
      `INSERT INTO ${table} (id, email, role_id) VALUES (1, 'a@b.c', 1), (2, 'd@e.f', 1)`,
    );
    expect(inserted.columns).toEqual([]);
    expect(inserted.rows).toEqual([]);
    expect(inserted.rowCount).toBe(2);
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("d1");
    expect(first.tables.map((t) => t.name)).toContain(table);

    const introspected = first.tables.find((t) => t.name === table);
    expect(introspected?.rowsApprox).toBeNull();
    expect(introspected?.columns.map((c) => c.name)).toEqual(["id", "email", "role_id", "active"]);
    expect(introspected?.columns.find((c) => c.name === "id")?.primaryKey).toBe(true);
    expect(introspected?.columns.find((c) => c.name === "email")?.nullable).toBe(false);
    expect(introspected?.columns.find((c) => c.name === "role_id")?.foreignKey).toEqual({
      table,
      column: "id",
    });
    expect(introspected?.columns.find((c) => c.name === "id")?.ordinal).toBe(0);
  });

  it("clears state on close", async () => {
    const disposable = new D1Connector(configFromEnv());
    await disposable.connect();
    disposable.close();
    await expect(disposable.execute("SELECT 1")).rejects.toThrow("not connected");
  });
});

describe.skipIf(enabled)("D1Connector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_D1_* credentials", () => {
    expect(enabled).toBe(false);
  });
});
