/**
 * Integration test against a real Firebird instance.
 *
 * Runs only when EASYSQL_TEST_FIREBIRD_URL is set, e.g.
 *   firebird://SYSDBA:masterkey@127.0.0.1:3050//data/easysql_test.fdb
 * The database must already exist. The test is skipped with an explicit
 * message otherwise, so CI without a server stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { FirebirdConnectionConfig } from "../../src/firebird/index";
import { FirebirdConnector } from "../../src/firebird/index";
import { decodeTestUrl, skipSuite } from "./support";

const url = process.env.EASYSQL_TEST_FIREBIRD_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): FirebirdConnectionConfig {
  const { host, port, user, password, database, searchParams } = decodeTestUrl(raw);
  const role = searchParams.get("role");
  // Firebird paths are absolute; `//data/x.fdb` yields `/data/x.fdb` once the
  // leading slash of the pathname is dropped.
  return {
    host: host || "localhost",
    port: port ?? 3050,
    user,
    password,
    database: decodeURIComponent(database),
    ...(role ? { role } : {}),
  };
}

describe.skipIf(!enabled)("FirebirdConnector integration", () => {
  let connector: FirebirdConnector;

  beforeAll(async () => {
    connector = new FirebirdConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("firebird");
    for (const table of first.tables) {
      for (const column of table.columns) {
        expect(column.name).toBe(column.name.trim());
        expect(column.ordinal).toBeGreaterThan(0);
      }
    }
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n FROM RDB$DATABASE");
    expect(result.rowCount).toBe(1);
    expect(Number(result.rows[0]?.n)).toBe(1);
  });

  it("introspects a table it creates", async () => {
    const name = "EASYSQL_FIREBIRD_PROBE";
    try {
      await connector.execute(`DROP TABLE ${name}`);
    } catch {
      // The probe table only exists on a re-run against the same database.
    }
    await connector.execute(
      `CREATE TABLE ${name} (id INTEGER NOT NULL PRIMARY KEY, label VARCHAR(50))`,
    );

    try {
      const schema = await connector.introspect();
      const table = schema.tables.find((candidate) => candidate.name === name);
      expect(table).toBeDefined();
      expect(table?.columns.map((column) => column.name)).toEqual(["ID", "LABEL"]);
      expect(table?.columns.find((column) => column.name === "ID")?.primaryKey).toBe(true);
      expect(table?.columns.find((column) => column.name === "ID")?.nullable).toBe(false);
      expect(table?.columns.find((column) => column.name === "LABEL")?.nullable).toBe(true);
    } finally {
      await connector.execute(`DROP TABLE ${name}`);
    }
  });
});

skipSuite("FirebirdConnector", "EASYSQL_TEST_FIREBIRD_URL", enabled);
