/**
 * Integration test against a real PostgreSQL instance.
 *
 * Runs only when EASYSQL_TEST_POSTGRES_URL is set, e.g.
 *   postgresql://user:pass@127.0.0.1:5432/easysql_test
 * The database must already exist. The test creates and drops only its own
 * `easysql_test_*` fixtures, so introspection can be asserted against a known
 * schema; every other table in that database is left alone. Skipped with an
 * explicit message otherwise.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import pg from "pg";
import type { PostgresConnectionConfig } from "../../src/postgres/index";
import { PostgresConnector } from "../../src/postgres/index";
import { failureOf } from "./failure";
import { decodeTestUrl, skipSuite } from "./support";

const url = process.env.EASYSQL_TEST_POSTGRES_URL;
const enabled = Boolean(url);

/** Dropped child-first: `easysql_test_orders` references `easysql_test_users`. */
const FIXTURES = ["easysql_test_orders", "easysql_test_users"];

const DDL = [
  `CREATE TABLE easysql_test_users (
     id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     email text NOT NULL,
     nickname text DEFAULT 'anonymous',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE easysql_test_orders (
     id integer NOT NULL PRIMARY KEY,
     user_id integer NOT NULL REFERENCES easysql_test_users (id),
     total numeric(10,2) NOT NULL DEFAULT 0
   )`,
];

function configFromUrl(raw: string): PostgresConnectionConfig {
  const { host, port, user, password, database } = decodeTestUrl(raw);
  return { host, port: port ?? 5432, user, password, database };
}

describe.skipIf(!enabled)("PostgresConnector integration", () => {
  let connector: PostgresConnector;
  let admin: pg.Client | undefined;

  beforeAll(async () => {
    // Fixtures go in through the driver so the assertions below stay about
    // introspection, not about the connector's own execute().
    admin = new pg.Client(configFromUrl(url as string));
    await admin.connect();
    for (const table of FIXTURES) await admin.query(`DROP TABLE IF EXISTS ${table}`);
    for (const statement of DDL) await admin.query(statement);

    connector = new PostgresConnector(configFromUrl(url as string));
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
    for (const table of FIXTURES) await admin?.query(`DROP TABLE IF EXISTS ${table}`);
    await admin?.end();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("postgresql");
  });

  it("maps column metadata, keys and defaults", async () => {
    const { tables } = await connector.introspect();
    const orders = tables.find((t) => t.name === "easysql_test_orders");
    const users = tables.find((t) => t.name === "easysql_test_users");

    expect(orders?.columns.map((c) => c.name)).toEqual(["id", "user_id", "total"]);
    expect(orders?.columns.find((c) => c.name === "user_id")).toMatchObject({
      dataType: "integer",
      nullable: false,
      primaryKey: false,
      foreignKey: { table: "easysql_test_users", column: "id" },
      ordinal: 2,
    });
    expect(orders?.columns.find((c) => c.name === "total")).toMatchObject({
      dataType: "numeric(10,2)",
      nullable: false,
      defaultValue: "0",
    });
    expect(users?.columns.find((c) => c.name === "id")).toMatchObject({
      dataType: "integer",
      nullable: false,
      primaryKey: true,
      ordinal: 1,
    });
    expect(users?.columns.find((c) => c.name === "nickname")).toMatchObject({ nullable: true });
    // PostgreSQL hands defaults over as expressions (`'anonymous'::text`).
    expect(users?.columns.find((c) => c.name === "nickname")?.defaultValue).toContain("anonymous");
    expect(users?.columns.find((c) => c.name === "email")).toMatchObject({
      dataType: "text",
      nullable: false,
    });
    expect(users?.columns.find((c) => c.name === "created_at")).toMatchObject({
      dataType: "timestamp with time zone",
      nullable: false,
    });
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.n).toBe(1);
  });

  it("surfaces the driver error without leaking the password", async () => {
    const failure = await failureOf(connector, "SELECT * FROM easysql_test_missing_table");

    expect(failure.message).toContain("easysql_test_missing_table");
    expect(failure.message).not.toContain(configFromUrl(url as string).password);
  });
});

skipSuite("PostgresConnector", "EASYSQL_TEST_POSTGRES_URL", enabled);
