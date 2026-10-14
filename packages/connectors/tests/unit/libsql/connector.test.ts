/**
 * Unit tests for {@link LibSqlConnector}.
 *
 * `@libsql/client` opens a local `file:` database in-process, so the
 * introspection and execution paths are exercised against a real temporary
 * SQLite file — no server required.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LibSqlConnector, sanitizeErrorMessage } from "../../../src/libsql/index";

const dirs: string[] = [];

function fixtureFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "easysql-libsql-"));
  dirs.push(dir);
  return join(dir, "fixture.db");
}

function fileUrl(path: string): string {
  return `file:${path}`;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("LibSqlConnector configuration", () => {
  it("rejects a missing url", () => {
    expect(() => new LibSqlConnector({ url: "" })).toThrow("LibSqlConnector: url is required");
  });

  it("accepts a remote Turso url and an auth token", () => {
    const connector = new LibSqlConnector({
      url: "libsql://example.turso.io",
      authToken: "secret",
    });
    expect(connector).toBeInstanceOf(LibSqlConnector);
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new LibSqlConnector({ url: "file::memory:" });
    await expect(connector.introspect()).rejects.toThrow(
      "LibSqlConnector: not connected — call connect() first",
    );
    await expect(connector.execute("SELECT 1")).rejects.toThrow(
      "LibSqlConnector: not connected — call connect() first",
    );
  });
});

describe("LibSqlConnector introspection", () => {
  it("introspects tables, columns, keys and row counts", async () => {
    const url = fileUrl(fixtureFile());
    const writer = new LibSqlConnector({ url, readonly: false });
    await writer.connect();
    await writer.execute(
      "CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, active BOOLEAN DEFAULT 1)",
    );
    await writer.execute(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255) NOT NULL, role_id INTEGER REFERENCES roles(id), bio TEXT)",
    );
    await writer.execute("INSERT INTO roles (name) VALUES ('admin')");
    await writer.execute("INSERT INTO users (email, role_id) VALUES ('a@b.c', 1)");
    writer.close();

    const connector = new LibSqlConnector({ url, readonly: true });
    await connector.connect();
    const schema = await connector.introspect();
    connector.close();

    expect(schema.engine).toBe("libsql");
    expect(schema.tables.map((t) => t.name)).toEqual(["roles", "users"]);

    const users = schema.tables.find((t) => t.name === "users");
    expect(users?.rowsApprox).toBe(1);
    expect(users?.columns.map((c) => c.name)).toEqual(["id", "email", "role_id", "bio"]);
    expect(users?.columns.map((c) => c.ordinal)).toEqual([0, 1, 2, 3]);
    expect(users?.columns.find((c) => c.name === "id")?.primaryKey).toBe(true);
    expect(users?.columns.find((c) => c.name === "role_id")?.foreignKey).toEqual({
      table: "roles",
      column: "id",
    });
    expect(users?.columns.find((c) => c.name === "bio")?.nullable).toBe(true);
    expect(users?.columns.find((c) => c.name === "email")?.nullable).toBe(false);

    const roles = schema.tables.find((t) => t.name === "roles");
    expect(roles?.columns.find((c) => c.name === "active")?.defaultValue).toBe("1");
  });

  it("is deterministic across runs", async () => {
    const url = fileUrl(fixtureFile());
    const writer = new LibSqlConnector({ url, readonly: false });
    await writer.connect();
    await writer.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)");
    writer.close();

    const a = new LibSqlConnector({ url, readonly: true });
    await a.connect();
    const first = await a.introspect();
    const second = await a.introspect();
    a.close();

    expect(first).toEqual(second);
  });

  it("skips SQLite internal tables", async () => {
    const url = fileUrl(fixtureFile());
    const writer = new LibSqlConnector({ url, readonly: false });
    await writer.connect();
    await writer.execute("CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, v TEXT)");
    writer.close();

    const reader = new LibSqlConnector({ url, readonly: true });
    await reader.connect();
    const schema = await reader.introspect();
    reader.close();

    expect(schema.tables.map((t) => t.name)).toEqual(["t"]);
  });
});

describe("LibSqlConnector execution", () => {
  it("executes a select and returns typed rows", async () => {
    const connector = new LibSqlConnector({ url: "file::memory:", readonly: false });
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

  it("reports affected rows for a write", async () => {
    const connector = new LibSqlConnector({ url: "file::memory:", readonly: false });
    await connector.connect();
    try {
      await connector.execute("CREATE TABLE t (id INTEGER)");
      const result = await connector.execute("INSERT INTO t (id) VALUES (1), (2)");
      expect(result.rowCount).toBe(2);
      expect(result.columns).toEqual([]);
    } finally {
      connector.close();
    }
  });

  it("rejects writes when opened read-only", async () => {
    const url = fileUrl(fixtureFile());
    const writer = new LibSqlConnector({ url, readonly: false });
    await writer.connect();
    await writer.execute("CREATE TABLE t (id INTEGER)");
    writer.close();

    const reader = new LibSqlConnector({ url, readonly: true });
    await reader.connect();
    try {
      await expect(reader.execute("INSERT INTO t (id) VALUES (1)")).rejects.toThrow(
        /readonly|query_only/i,
      );
      const result = await reader.execute("SELECT COUNT(*) AS c FROM t");
      expect(result.rows[0]).toEqual({ c: 0 });
    } finally {
      reader.close();
    }
  });

  it("is idempotent and safe to close twice", async () => {
    const connector = new LibSqlConnector({ url: "file::memory:", readonly: false });
    await connector.connect();
    await connector.connect();
    connector.close();
    connector.close();
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of the auth token", () => {
    expect(sanitizeErrorMessage("auth failed for token hunter2", ["hunter2"])).toBe(
      "auth failed for token ****",
    );
  });
});
