/**
 * Unit tests for {@link DuckDbConnector}.
 *
 * DuckDB is embedded, so these run against a real in-memory database; no
 * server or fixture file is required. The lifecycle mirrors the SQLite
 * connector but every call is awaited.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDbConnector } from "../../../src/duckdb/index";

const dirs: string[] = [];

function fixtureFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "easysql-duckdb-"));
  dirs.push(dir);
  return join(dir, "fixture.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("DuckDbConnector configuration", () => {
  it("rejects a missing file", () => {
    expect(() => new DuckDbConnector({ file: "" })).toThrow("DuckDbConnector: file is required");
  });

  it("defaults to read-only", () => {
    const connector = new DuckDbConnector({ file: "/tmp/whatever.db" });
    expect(connector).toBeInstanceOf(DuckDbConnector);
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await expect(connector.introspect()).rejects.toThrow("not connected");
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
  });

  it("closes safely when never connected", () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    expect(() => connector.close()).not.toThrow();
  });
});

describe("DuckDbConnector introspection", () => {
  it("introspects tables, columns, keys and row counts", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await connector.connect();
    try {
      await connector.execute(
        "CREATE TABLE roles (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL UNIQUE, active BOOLEAN DEFAULT true)",
      );
      await connector.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255) NOT NULL, role_id INTEGER REFERENCES roles(id), bio TEXT)",
      );
      await connector.execute("INSERT INTO roles (id, name) VALUES (1, 'admin')");
      await connector.execute("INSERT INTO users (id, email, role_id) VALUES (1, 'a@b.c', 1)");

      const schema = await connector.introspect();

      expect(schema.engine).toBe("duckdb");
      expect(schema.tables.map((t) => t.name)).toEqual(["roles", "users"]);

      const users = schema.tables.find((t) => t.name === "users");
      expect(users?.rowsApprox).toBe(1);
      expect(users?.columns.map((c) => c.name)).toEqual(["id", "email", "role_id", "bio"]);
      expect(users?.columns.map((c) => c.ordinal)).toEqual([1, 2, 3, 4]);
      expect(users?.columns.find((c) => c.name === "id")?.primaryKey).toBe(true);
      expect(users?.columns.find((c) => c.name === "id")?.nullable).toBe(false);
      expect(users?.columns.find((c) => c.name === "role_id")?.foreignKey).toEqual({
        table: "roles",
        column: "id",
      });
      expect(users?.columns.find((c) => c.name === "bio")?.nullable).toBe(true);

      const roles = schema.tables.find((t) => t.name === "roles");
      expect(roles?.columns.find((c) => c.name === "name")?.nullable).toBe(false);
      // DuckDB reports the expression as written, e.g. `CAST('t' AS BOOLEAN)`.
      expect(roles?.columns.find((c) => c.name === "active")?.defaultValue).toContain("BOOLEAN");
    } finally {
      connector.close();
    }
  });

  it("is deterministic across runs", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await connector.connect();
    try {
      await connector.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
      const first = await connector.introspect();
      const second = await connector.introspect();
      expect(first).toEqual(second);
    } finally {
      connector.close();
    }
  });

  it("excludes DuckDB's internal catalog tables", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await connector.connect();
    try {
      await connector.execute("CREATE TABLE only_user_table (id INTEGER)");
      const schema = await connector.introspect();
      expect(schema.tables.map((t) => t.name)).toEqual(["only_user_table"]);
    } finally {
      connector.close();
    }
  });
});

describe("DuckDbConnector execution", () => {
  it("executes a select and returns typed rows", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await connector.connect();
    try {
      const result = await connector.execute("SELECT 1 AS n, 'x' AS s");
      expect(result.columns).toEqual(["n", "s"]);
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toEqual({ n: 1, s: "x" });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      connector.close();
    }
  });

  it("returns JSON-serialisable rows for aggregate and DML statements", async () => {
    const connector = new DuckDbConnector({ file: ":memory:", readonly: false });
    await connector.connect();
    try {
      await connector.execute("CREATE TABLE t (id INTEGER, v TEXT)");
      await connector.execute("INSERT INTO t VALUES (1, 'a'), (2, 'b')");
      const count = await connector.execute("SELECT COUNT(*) AS c FROM t");
      expect(count.rows[0]).toEqual({ c: 2 });
      expect(() => JSON.stringify(count.rows)).not.toThrow();
    } finally {
      connector.close();
    }
  });

  it("supports several open connections at once", async () => {
    const a = new DuckDbConnector({ file: ":memory:", readonly: false });
    const b = new DuckDbConnector({ file: ":memory:", readonly: false });
    await a.connect();
    await b.connect();
    try {
      await a.execute("CREATE TABLE a (x INTEGER)");
      await b.execute("CREATE TABLE b (y INTEGER)");
      await expect(a.execute("SELECT * FROM b")).rejects.toThrow();
      await expect(b.execute("SELECT * FROM a")).rejects.toThrow();
    } finally {
      a.close();
      b.close();
    }
  });

  it("rejects writes when opened read-only", async () => {
    const file = fixtureFile();
    const writer = new DuckDbConnector({ file, readonly: false });
    await writer.connect();
    await writer.execute("CREATE TABLE t (id INTEGER)");
    writer.close();

    const reader = new DuckDbConnector({ file, readonly: true });
    await reader.connect();
    try {
      await expect(reader.execute("INSERT INTO t VALUES (1)")).rejects.toThrow();
      const result = await reader.execute("SELECT COUNT(*) AS c FROM t");
      expect(result.rows[0]).toEqual({ c: 0 });
    } finally {
      reader.close();
    }
  });
});
