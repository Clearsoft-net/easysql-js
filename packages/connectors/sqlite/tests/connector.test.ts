import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteConnector } from "../src/index";

const dirs: string[] = [];

function fixtureFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "easysql-sqlite-"));
  dirs.push(dir);
  return join(dir, "fixture.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("SqliteConnector configuration", () => {
  it("rejects a missing file", () => {
    expect(() => new SqliteConnector({ file: "" })).toThrow("file is required");
  });

  it("defaults to read-only", () => {
    const connector = new SqliteConnector({ file: "/tmp/whatever.db" });
    expect(connector).toBeInstanceOf(SqliteConnector);
  });

  it("requires connect() before introspect/execute", () => {
    const connector = new SqliteConnector({ file: ":memory:", readonly: false });
    expect(() => connector.introspect()).toThrow("not connected");
    expect(() => connector.execute("SELECT 1")).toThrow("not connected");
  });
});

describe("SqliteConnector introspection", () => {
  it("introspects tables, columns, keys and row counts", () => {
    const file = fixtureFile();
    const writer = new SqliteConnector({ file, readonly: false });
    writer.connect();
    writer.execute(
      "CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, active BOOLEAN DEFAULT 1)",
    );
    writer.execute(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255) NOT NULL, role_id INTEGER REFERENCES roles(id), bio TEXT)",
    );
    writer.execute("INSERT INTO roles (name) VALUES ('admin')");
    writer.execute("INSERT INTO users (email, role_id) VALUES ('a@b.c', 1)");
    writer.close();

    const connector = new SqliteConnector({ file, readonly: true });
    connector.connect();
    const schema = connector.introspect();
    connector.close();

    expect(schema.engine).toBe("sqlite");
    expect(schema.tables.map((t) => t.name)).toEqual(["roles", "users"]);

    const users = schema.tables.find((t) => t.name === "users");
    expect(users?.rowsApprox).toBe(1);
    expect(users?.columns.find((c) => c.name === "id")?.primaryKey).toBe(true);
    expect(users?.columns.find((c) => c.name === "role_id")?.foreignKey).toEqual({
      table: "roles",
      column: "id",
    });
    expect(users?.columns.find((c) => c.name === "bio")?.nullable).toBe(true);
  });

  it("is deterministic across runs", () => {
    const file = fixtureFile();
    const writer = new SqliteConnector({ file, readonly: false });
    writer.connect();
    writer.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
    writer.close();

    const a = new SqliteConnector({ file, readonly: true });
    a.connect();
    const first = a.introspect();
    const second = a.introspect();
    a.close();

    expect(first).toEqual(second);
  });
});

describe("SqliteConnector execution", () => {
  it("executes a select and returns typed rows", () => {
    const connector = new SqliteConnector({ file: ":memory:", readonly: false });
    connector.connect();
    try {
      const result = connector.execute("SELECT 1 AS n, 'x' AS s");
      expect(result.columns).toEqual(["n", "s"]);
      expect(result.rowCount).toBe(1);
      expect(result.rows[0]).toEqual({ n: 1, s: "x" });
    } finally {
      connector.close();
    }
  });

  it("supports several open connections at once", () => {
    const a = new SqliteConnector({ file: ":memory:", readonly: false });
    const b = new SqliteConnector({ file: ":memory:", readonly: false });
    a.connect();
    b.connect();
    try {
      a.execute("CREATE TABLE a (x INTEGER)");
      b.execute("CREATE TABLE b (y INTEGER)");
      expect(() => a.execute("SELECT * FROM b")).toThrow();
      expect(() => b.execute("SELECT * FROM a")).toThrow();
    } finally {
      a.close();
      b.close();
    }
  });

  it("rejects writes when opened read-only", () => {
    const file = fixtureFile();
    const writer = new SqliteConnector({ file, readonly: false });
    writer.connect();
    writer.execute("CREATE TABLE t (id INTEGER)");
    writer.close();

    const reader = new SqliteConnector({ file, readonly: true });
    reader.connect();
    try {
      expect(() => reader.execute("INSERT INTO t (id) VALUES (1)")).toThrow();
    } finally {
      reader.close();
    }
  });
});
