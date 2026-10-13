/**
 * Integration test for the embedded DuckDB engine.
 *
 * DuckDB runs in-process, so this needs no server: it exercises the connector
 * against a real database file, the way the SQLite unit test exercises SQLite.
 * The file is created in a temporary directory and removed afterwards.
 */

import { afterAll, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDbConnector } from "../../src/duckdb/index";

const dir = mkdtempSync(join(tmpdir(), "easysql-duckdb-integration-"));
const file = join(dir, "integration.db");

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("DuckDbConnector integration", () => {
  it("creates, introspects and queries a file database", async () => {
    const writer = new DuckDbConnector({ file, readonly: false });
    await writer.connect();
    try {
      await writer.execute("CREATE SCHEMA shop");
      await writer.execute("SET schema 'shop'");
      await writer.execute(
        "CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, total DECIMAL(12,2) NOT NULL, note TEXT)",
      );
      await writer.execute(
        "CREATE TABLE customers (id INTEGER PRIMARY KEY, name VARCHAR(120) NOT NULL)",
      );
      await writer.execute("INSERT INTO customers (id, name) VALUES (1, 'Ada'), (2, 'Grace')");
      await writer.execute("INSERT INTO orders VALUES (1, 1, 10.50, NULL), (2, 2, 3.25, 'rush')");
    } finally {
      writer.close();
    }

    expect(existsSync(file)).toBe(true);

    const reader = new DuckDbConnector({ file, readonly: true });
    await reader.connect();
    try {
      // Introspection follows the connection's current schema.
      await reader.execute("SET schema 'shop'");
      const schema = await reader.introspect();
      expect(schema.engine).toBe("duckdb");
      expect(schema.tables.map((table) => table.name)).toEqual(["customers", "orders"]);

      const orders = schema.tables.find((table) => table.name === "orders");
      expect(orders?.rowsApprox).toBe(2);
      expect(orders?.columns.map((column) => column.name)).toEqual([
        "id",
        "customer_id",
        "total",
        "note",
      ]);
      expect(orders?.columns.find((column) => column.name === "id")?.primaryKey).toBe(true);
      expect(orders?.columns.find((column) => column.name === "customer_id")?.nullable).toBe(false);
      expect(orders?.columns.find((column) => column.name === "total")?.dataType).toBe(
        "DECIMAL(12,2)",
      );

      const first = await reader.introspect();
      const second = await reader.introspect();
      expect(first).toEqual(second);

      const result = await reader.execute(
        "SELECT c.name AS customer, SUM(o.total) AS spend FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY c.name ORDER BY c.name",
      );
      expect(result.columns).toEqual(["customer", "spend"]);
      expect(result.rowCount).toBe(2);
      expect(result.rows[0]?.customer).toBe("Ada");

      await expect(
        reader.execute("INSERT INTO customers (id, name) VALUES (3, 'Linus')"),
      ).rejects.toThrow();
    } finally {
      reader.close();
    }
  });

  it("introspects an in-memory database without touching disk", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await connector.connect();
    try {
      await connector.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
      const schema = await connector.introspect();
      expect(schema.tables.map((table) => table.name)).toEqual(["t"]);
      const result = await connector.execute("SELECT 1 AS n");
      expect(result.rows[0]).toEqual({ n: 1 });
    } finally {
      connector.close();
    }
  });
});
