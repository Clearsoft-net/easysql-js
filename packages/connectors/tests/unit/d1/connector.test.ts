/**
 * Unit tests for the Cloudflare D1 connector.
 *
 * D1 is reached over the REST API, so `globalThis.fetch` is replaced with a
 * stub for every test: the suite asserts the exact request shape (URL, headers,
 * body) and projects canned API responses into `QueryResult`/`IntrospectResult`
 * without touching the network.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { D1ConnectionConfig } from "../../../src/d1/index";
import { D1_DEFAULT_BASE_URL, D1Connector } from "../../../src/d1/index";

interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: { sql: string; params: unknown[] };
}

interface D1Stub {
  requests: CapturedRequest[];
  restore(): void;
}

/** Canned API response envelope. */
interface D1Envelope {
  success?: boolean;
  errors?: { code: number; message: string }[];
  result?: { results?: unknown; meta?: Record<string, unknown>; success?: boolean }[];
}

const config: D1ConnectionConfig = {
  accountId: "account-123",
  databaseId: "database-456",
  apiToken: "secret-token",
};

let stub: D1Stub;

/**
 * Replaces `globalThis.fetch` with a stub that answers each call with the next
 * envelope in `responses` (repeating the last one) and records every request.
 */
function stubFetch(responses: (D1Envelope | Response)[]): D1Stub {
  const requests: CapturedRequest[] = [];
  const original = globalThis.fetch;
  let index = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[key.toLowerCase()] = value;
    }
    requests.push({
      url,
      method: init?.method ?? "GET",
      headers,
      body: JSON.parse(String(init?.body ?? "{}")) as CapturedRequest["body"],
    });

    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (response instanceof Response) return response;
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return {
    requests,
    restore() {
      globalThis.fetch = original;
    },
  };
}

/** Builds a successful single-statement response. */
function rowsEnvelope(rows: Record<string, unknown>[], meta: Record<string, unknown> = {}) {
  return {
    success: true,
    errors: [],
    result: [{ results: rows, meta, success: true }],
  } satisfies D1Envelope;
}

beforeEach(() => {
  stub = stubFetch([rowsEnvelope([{ "1": 1 }])]);
});

afterEach(() => {
  stub.restore();
});

describe("D1Connector configuration", () => {
  it("constructs with documented defaults", () => {
    const connector = new D1Connector(config);
    expect(connector).toBeInstanceOf(D1Connector);
    expect(D1_DEFAULT_BASE_URL).toBe("https://api.cloudflare.com/client/v4");
  });

  it("rejects missing required fields", () => {
    expect(() => new D1Connector({ ...config, accountId: "" })).toThrow("accountId is required");
    expect(() => new D1Connector({ ...config, databaseId: "" })).toThrow("databaseId is required");
    expect(() => new D1Connector({ ...config, apiToken: "" })).toThrow("apiToken is required");
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new D1Connector(config);
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
    await expect(connector.introspect()).rejects.toThrow("not connected");
  });

  it("closes cleanly and requires connect() again", async () => {
    const connector = new D1Connector(config);
    await connector.connect();
    connector.close();
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
  });
});

describe("D1Connector REST request shape", () => {
  it("posts to the documented endpoint with bearer auth", async () => {
    const connector = new D1Connector(config);
    await connector.connect();

    expect(stub.requests).toHaveLength(1);
    const request = stub.requests[0];
    expect(request.url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-123/d1/database/database-456/query",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.authorization).toBe("Bearer secret-token");
    expect(request.headers["content-type"]).toBe("application/json");
    expect(request.body).toEqual({ sql: "SELECT 1", params: [] });
  });

  it("honours baseUrl and strips trailing slashes", async () => {
    const connector = new D1Connector({ ...config, baseUrl: "http://127.0.0.1:8787/v4/" });
    await connector.connect();
    expect(stub.requests[0]?.url).toBe(
      "http://127.0.0.1:8787/v4/accounts/account-123/d1/database/database-456/query",
    );
  });

  it("uses the default base URL when baseUrl is blank", async () => {
    const connector = new D1Connector({ ...config, baseUrl: "   " });
    await connector.connect();
    expect(stub.requests[0]?.url.startsWith(`${D1_DEFAULT_BASE_URL}/accounts/`)).toBe(true);
  });

  it("is idempotent across repeated connect() calls", async () => {
    const connector = new D1Connector(config);
    await connector.connect();
    await connector.connect();
    expect(stub.requests).toHaveLength(1);
  });
});

describe("D1Connector execution", () => {
  it("derives columns from the returned row keys in order", async () => {
    stub.restore();
    stub = stubFetch([rowsEnvelope([{ id: 1, email: "a@b.c" }])]);
    const connector = new D1Connector(config);
    await connector.connect();

    const result = await connector.execute("SELECT id, email FROM users");
    expect(result.columns).toEqual(["id", "email"]);
    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([{ id: 1, email: "a@b.c" }]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("uses meta.changes for statements that return no rows", async () => {
    stub.restore();
    stub = stubFetch([rowsEnvelope([], { changes: 3, rows_written: 6 })]);
    const connector = new D1Connector(config);
    await connector.connect();

    const result = await connector.execute("UPDATE users SET active = 1");
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(3);
  });

  it("falls back to meta.rows_written when meta.changes is absent", async () => {
    stub.restore();
    stub = stubFetch([rowsEnvelope([], { rows_written: 4 })]);
    const connector = new D1Connector(config);
    await connector.connect();

    const result = await connector.execute("INSERT INTO users (id) VALUES (1)");
    expect(result.rowCount).toBe(4);
  });

  it("reports zero rows when the statement returns nothing", async () => {
    stub.restore();
    stub = stubFetch([rowsEnvelope([])]);
    const connector = new D1Connector(config);
    await connector.connect();

    const result = await connector.execute("CREATE TABLE t (id INTEGER)");
    expect(result.rowCount).toBe(0);
    expect(result.columns).toEqual([]);
  });
});

describe("D1Connector introspection", () => {
  it("reads tables, columns and foreign keys through the PRAGMA statements", async () => {
    stub.restore();
    stub = stubFetch([
      // Consumed by the connect() reachability probe.
      rowsEnvelope([{ "1": 1 }]),
      rowsEnvelope([{ name: "roles" }, { name: "users" }]),
      rowsEnvelope([
        { cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 },
        { cid: 1, name: "name", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
      ]),
      rowsEnvelope([]),
      rowsEnvelope([
        { cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 },
        {
          cid: 1,
          name: "role_id",
          type: "INTEGER",
          notnull: 0,
          dflt_value: null,
          pk: 0,
        },
        { cid: 2, name: "bio", type: "TEXT", notnull: 0, dflt_value: "'n/a'", pk: 0 },
      ]),
      rowsEnvelope([{ id: 0, seq: 0, table: "roles", from: "role_id", to: "id" }]),
    ]);

    const connector = new D1Connector(config);
    await connector.connect();
    const schema = await connector.introspect();

    expect(schema.engine).toBe("d1");
    expect(schema.tables.map((table) => table.name)).toEqual(["roles", "users"]);

    const users = schema.tables.find((table) => table.name === "users");
    expect(users?.rowsApprox).toBeNull();
    expect(users?.columns.map((column) => column.name)).toEqual(["id", "role_id", "bio"]);
    expect(users?.columns[0]).toMatchObject({
      name: "id",
      dataType: "INTEGER",
      primaryKey: true,
      nullable: false,
      ordinal: 0,
    });
    expect(users?.columns[1]?.foreignKey).toEqual({ table: "roles", column: "id" });
    expect(users?.columns[1]?.nullable).toBe(true);
    expect(users?.columns[2]?.defaultValue).toBe("'n/a'");

    // requests[0] is the connect() probe; introspection starts at index 1.
    const requested = stub.requests.map((request) => request.body.sql);
    expect(requested[0]).toBe("SELECT 1");
    expect(requested[1]).toContain("FROM sqlite_master");
    expect(requested[2]).toBe('PRAGMA table_info("roles")');
    expect(requested[3]).toBe('PRAGMA foreign_key_list("roles")');
    expect(requested[4]).toBe('PRAGMA table_info("users")');
    expect(requested[5]).toBe('PRAGMA foreign_key_list("users")');
  });

  it("escapes embedded double quotes in identifiers", async () => {
    stub.restore();
    stub = stubFetch([
      // Consumed by the connect() reachability probe.
      rowsEnvelope([{ "1": 1 }]),
      rowsEnvelope([{ name: 'we"ird' }]),
      rowsEnvelope([{ cid: 0, name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 0 }]),
      rowsEnvelope([]),
    ]);

    const connector = new D1Connector(config);
    await connector.connect();
    await connector.introspect();

    expect(stub.requests[2]?.body.sql).toBe('PRAGMA table_info("we""ird")');
  });

  it("falls back to the table-valued functions when PRAGMA is rejected", async () => {
    stub.restore();
    stub = stubFetch([
      // Consumed by the connect() reachability probe.
      rowsEnvelope([{ "1": 1 }]),
      rowsEnvelope([{ name: "roles" }, { name: "users" }]),
      // PRAGMA table_info(roles) is rejected by the endpoint.
      { success: false, errors: [{ code: 7500, message: 'near "PRAGMA": syntax error' }] },
      // pragma_table_info(?) works.
      rowsEnvelope([{ cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 }]),
      // The remaining catalog reads use the fallback too.
      rowsEnvelope([]),
      rowsEnvelope([{ cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 }]),
      rowsEnvelope([]),
    ]);

    const connector = new D1Connector(config);
    await connector.connect();
    const schema = await connector.introspect();

    expect(schema.tables.map((table) => table.name)).toEqual(["roles", "users"]);
    expect(schema.tables[0]?.columns[0]?.name).toBe("id");

    const requested = stub.requests.map((request) => request.body.sql);
    expect(requested[0]).toBe("SELECT 1");
    expect(requested[1]).toContain("FROM sqlite_master");
    expect(requested[2]).toBe('PRAGMA table_info("roles")');
    expect(requested[3]).toBe("SELECT * FROM pragma_table_info(?)");
    expect(requested[4]).toBe("SELECT * FROM pragma_foreign_key_list(?)");
    expect(requested[5]).toBe("SELECT * FROM pragma_table_info(?)");
    expect(requested[6]).toBe("SELECT * FROM pragma_foreign_key_list(?)");
    // The table name travels as a bound parameter, never interpolated.
    expect(stub.requests[3]?.body.params).toEqual(["roles"]);
    expect(stub.requests[5]?.body.params).toEqual(["users"]);
  });

  it("is deterministic across runs", async () => {
    stub.restore();
    stub = stubFetch([
      // Consumed by the connect() reachability probe.
      rowsEnvelope([{ "1": 1 }]),
      rowsEnvelope([{ name: "t" }]),
      rowsEnvelope([{ cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 }]),
      rowsEnvelope([]),
      rowsEnvelope([{ name: "t" }]),
      rowsEnvelope([{ cid: 0, name: "id", type: "INTEGER", notnull: 0, dflt_value: null, pk: 1 }]),
      rowsEnvelope([]),
    ]);

    const connector = new D1Connector(config);
    await connector.connect();
    expect(await connector.introspect()).toEqual(await connector.introspect());
  });
});

describe("D1Connector error handling", () => {
  it("throws the API errors array", async () => {
    stub.restore();
    stub = stubFetch([
      {
        success: false,
        errors: [{ code: 7500, message: "no such table: missing" }],
      },
    ]);
    const connector = new D1Connector(config);
    await expect(connector.connect()).rejects.toThrow("[7500] no such table: missing");
  });

  it("throws on a non-2xx response", async () => {
    stub.restore();
    stub = stubFetch([
      new Response(JSON.stringify({ success: false, errors: [{ code: 10000, message: "auth" }] }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    ]);
    const connector = new D1Connector(config);
    await expect(connector.connect()).rejects.toThrow("HTTP 403");
  });

  it("throws on a non-JSON response body", async () => {
    stub.restore();
    stub = stubFetch([new Response("<html>bad gateway</html>", { status: 502 })]);
    const connector = new D1Connector(config);
    await expect(connector.connect()).rejects.toThrow("HTTP 502");
  });

  it("redacts the apiToken from every error message", async () => {
    stub.restore();
    stub = stubFetch([
      {
        success: false,
        errors: [{ code: 10000, message: "invalid token secret-token supplied" }],
      },
    ]);
    const connector = new D1Connector(config);
    await expect(connector.connect()).rejects.toThrow("invalid token **** supplied");
  });

  it("reports a failed transport", async () => {
    stub.restore();
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new TypeError("connection refused");
    }) as unknown as typeof fetch;
    try {
      const connector = new D1Connector(config);
      await expect(connector.connect()).rejects.toThrow("connection refused");
    } finally {
      globalThis.fetch = original;
    }
  });
});
