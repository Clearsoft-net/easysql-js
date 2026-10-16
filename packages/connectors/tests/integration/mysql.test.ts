/**
 * Integration test against a real MySQL/MariaDB instance.
 *
 * Runs only when EASYSQL_TEST_MYSQL_URL is set, e.g.
 *   mysql://user:pass@127.0.0.1:3306/easysql_test
 * The database must already exist. The test creates and drops only its own
 * `easysql_test_*` fixtures, so introspection can be asserted against a known
 * schema; every other table in that database is left alone. Skipped with an
 * explicit message otherwise, so CI without a database stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { type Connection, createConnection } from "mysql2/promise";
import type { MysqlConnectionConfig } from "../../src/mysql/index";
import { MysqlConnector } from "../../src/mysql/index";
import { failureOf } from "./failure";
import { decodeTestUrl, skipSuite } from "./support";

const url = process.env.EASYSQL_TEST_MYSQL_URL;
const enabled = Boolean(url);

/** Dropped child-first: `easysql_test_orders` references `easysql_test_users`. */
const FIXTURES = ["easysql_test_orders", "easysql_test_users"];

const DDL = [
  `CREATE TABLE easysql_test_users (
     id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     email VARCHAR(255) NOT NULL,
     nickname VARCHAR(64) NULL DEFAULT 'anonymous',
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE easysql_test_orders (
     id INT NOT NULL PRIMARY KEY,
     user_id INT NOT NULL,
     total DECIMAL(10,2) NOT NULL DEFAULT '0.00',
     CONSTRAINT fk_easysql_test_orders_user FOREIGN KEY (user_id) REFERENCES easysql_test_users (id)
   )`,
];

function configFromUrl(raw: string): MysqlConnectionConfig {
  const { host, port, user, password, database } = decodeTestUrl(raw);
  return { host, port: port ?? 3306, user, password, database };
}

describe.skipIf(!enabled)("MysqlConnector integration", () => {
  let connector: MysqlConnector;
  let admin: Connection | undefined;

  beforeAll(async () => {
    // Fixtures go in through the driver: `MysqlConnector.execute` answers
    // queries, and DDL returns a result header instead of rows.
    const { host, port, user, password, database } = configFromUrl(url as string);
    admin = await createConnection({ host, port, user, password, database });
    for (const table of FIXTURES) await admin.query(`DROP TABLE IF EXISTS ${table}`);
    for (const statement of DDL) await admin.query(statement);

    connector = new MysqlConnector(configFromUrl(url as string));
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
    expect(first.engine).toBe("mysql");
  });

  it("maps column metadata, keys and defaults", async () => {
    const { tables } = await connector.introspect();
    const orders = tables.find((t) => t.name === "easysql_test_orders");
    const users = tables.find((t) => t.name === "easysql_test_users");

    expect(orders?.columns.map((c) => c.name)).toEqual(["id", "user_id", "total"]);
    expect(orders?.columns.find((c) => c.name === "user_id")).toMatchObject({
      dataType: "int",
      nullable: false,
      primaryKey: false,
      foreignKey: { table: "easysql_test_users", column: "id" },
      ordinal: 2,
    });
    expect(orders?.columns.find((c) => c.name === "total")).toMatchObject({
      dataType: "decimal",
      nullable: false,
      defaultValue: "0.00",
    });
    expect(users?.columns.find((c) => c.name === "id")).toMatchObject({
      dataType: "int",
      nullable: false,
      primaryKey: true,
    });
    // MariaDB keeps the quotes around a string default, MySQL 8 does not.
    expect(users?.columns.find((c) => c.name === "nickname")).toMatchObject({ nullable: true });
    expect(users?.columns.find((c) => c.name === "nickname")?.defaultValue).toMatch(
      /^'?anonymous'?$/,
    );
    // `rows_approx` comes from information_schema.TABLE_ROWS, an InnoDB
    // estimate: pinning an exact value here would be flaky.
    expect(orders?.rowsApprox === null || typeof orders?.rowsApprox === "number").toBe(true);
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

skipSuite("MysqlConnector", "EASYSQL_TEST_MYSQL_URL", enabled);
