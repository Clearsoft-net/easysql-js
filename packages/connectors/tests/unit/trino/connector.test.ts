/**
 * Unit tests for {@link TrinoConnector}.
 *
 * `trino-client` talks plain HTTP, so the connector is exercised against a
 * local stub coordinator: no Trino server is required, and the tests assert
 * the catalog/schema/user headers the connector sends.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { TrinoConnectionConfig } from "../../../src/trino/index";
import { sanitizeErrorMessage, TrinoConnector } from "../../../src/trino/index";

interface StubPage {
  columns?: { name: string; type: string }[];
  data?: unknown[][];
  nextUri?: string;
  error?: { errorName: string; message: string };
}

interface StubRequest {
  sql: string;
  headers: Record<string, string>;
}

const requests: StubRequest[] = [];

/** Routes a stubbed query to a page. `url` is the coordinator base URL. */
function respond(sql: string, url: string): StubPage {
  if (/SELECT 1\b/i.test(sql)) {
    return { columns: [{ name: "n", type: "integer" }], data: [[1]] };
  }
  if (/information_schema\.tables/i.test(sql)) {
    return {
      columns: [{ name: "table_name", type: "varchar" }],
      data: [["customers"], ["orders"]],
    };
  }
  if (/information_schema\.columns/i.test(sql)) {
    if (/orders/.test(sql)) {
      return {
        columns: [
          { name: "column_name", type: "varchar" },
          { name: "data_type", type: "varchar" },
          { name: "is_nullable", type: "varchar" },
          { name: "column_default", type: "varchar" },
          { name: "ordinal_position", type: "bigint" },
        ],
        data: [
          ["id", "bigint", "NO", null, 1],
          ["total", "decimal(10,2)", "YES", "0.00", 2],
        ],
      };
    }
    return {
      columns: [
        { name: "column_name", type: "varchar" },
        { name: "data_type", type: "varchar" },
        { name: "is_nullable", type: "varchar" },
        { name: "column_default", type: "varchar" },
        { name: "ordinal_position", type: "bigint" },
      ],
      data: [["email", "varchar", "YES", null, 1]],
    };
  }
  if (/paged/i.test(sql)) {
    // The first page rides along on the initial POST response, which the
    // client protocol explicitly allows.
    return {
      columns: [{ name: "n", type: "integer" }],
      data: [[1]],
      nextUri: `${url}/page/2`,
    };
  }
  if (/EXPLODE|fail_me/i.test(sql)) {
    return {
      error: { errorName: "USER_ERROR", message: "line 1:1: boom" },
    };
  }
  if (/SELECT secret/i.test(sql)) {
    return { columns: [{ name: "x", type: "varchar" }], data: [["hunter2"]] };
  }
  return { columns: [{ name: "n", type: "integer" }], data: [[1]] };
}

const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/page/2") {
      return Response.json({
        columns: [{ name: "n", type: "integer" }],
        data: [[2]],
      });
    }
    if (url.pathname !== "/v1/statement") {
      return new Response("not found", { status: 404 });
    }
    const sql = await request.text();
    const headers: Record<string, string> = {};
    for (const [key, value] of request.headers) {
      if (key.toLowerCase().startsWith("x-trino-")) headers[key.toLowerCase()] = value;
    }
    requests.push({ sql, headers });
    return Response.json(respond(sql, url.origin));
  },
});

function baseConfig(overrides: Partial<TrinoConnectionConfig> = {}): TrinoConnectionConfig {
  return {
    host: "127.0.0.1",
    port: server.port,
    user: "easysql",
    catalog: "tpch",
    schema: "tiny",
    ...overrides,
  };
}

async function connected(overrides: Partial<TrinoConnectionConfig> = {}): Promise<TrinoConnector> {
  const connector = new TrinoConnector(baseConfig(overrides));
  await connector.connect();
  return connector;
}

beforeAll(() => {
  requests.length = 0;
});

afterEach(() => {
  requests.length = 0;
});

afterAll(() => {
  server.stop(true);
});

describe("TrinoConnector configuration", () => {
  it("constructs with documented defaults", () => {
    const connector = new TrinoConnector({ host: "trino.example.com", user: "readonly" });
    expect(connector).toBeInstanceOf(TrinoConnector);
  });

  it("rejects a missing host or user", () => {
    expect(() => new TrinoConnector({ host: "", user: "u" })).toThrow(
      "TrinoConnector: host is required",
    );
    expect(() => new TrinoConnector({ host: "h", user: "" })).toThrow(
      "TrinoConnector: user is required",
    );
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new TrinoConnector({ host: "h", user: "u" });
    await expect(connector.introspect()).rejects.toThrow(
      "TrinoConnector: not connected — call connect() first",
    );
    await expect(connector.execute("SELECT 1")).rejects.toThrow(
      "TrinoConnector: not connected — call connect() first",
    );
  });
});

describe("TrinoConnector connection", () => {
  it("probes the coordinator and sends catalog, schema and user headers", async () => {
    const connector = await connected();
    connector.close();

    const probe = requests[0];
    expect(probe?.sql).toBe("SELECT 1");
    expect(probe?.headers["x-trino-user"]).toBe("easysql");
    expect(probe?.headers["x-trino-catalog"]).toBe("tpch");
    expect(probe?.headers["x-trino-schema"]).toBe("tiny");
  });

  it("is idempotent and safe to close twice", async () => {
    const connector = await connected();
    await connector.connect();
    expect(requests.filter((r) => r.sql === "SELECT 1")).toHaveLength(1);
    connector.close();
    connector.close();
  });

  it("wraps an unreachable coordinator", async () => {
    const connector = new TrinoConnector({
      host: "127.0.0.1",
      port: 1,
      user: "easysql",
      password: "hunter2",
    });
    await expect(connector.connect()).rejects.toThrow(/TrinoConnector|ECONNREFUSED/i);
  });
});

describe("TrinoConnector introspection", () => {
  it("lists base tables deterministically with ordinal columns", async () => {
    const connector = await connected();
    const first = await connector.introspect();
    const second = await connector.introspect();
    connector.close();

    expect(first.engine).toBe("trino");
    expect(first).toEqual(second);
    expect(first.tables.map((t) => t.name)).toEqual(["customers", "orders"]);
    expect(first.tables.every((t) => t.rowsApprox === null)).toBe(true);

    const orders = first.tables.find((t) => t.name === "orders");
    expect(orders?.columns).toEqual([
      {
        name: "id",
        dataType: "bigint",
        nullable: false,
        primaryKey: false,
        defaultValue: null,
        foreignKey: null,
        ordinal: 1,
      },
      {
        name: "total",
        dataType: "decimal(10,2)",
        nullable: true,
        primaryKey: false,
        defaultValue: "0.00",
        foreignKey: null,
        ordinal: 2,
      },
    ]);
  });

  it("scopes the catalog queries to the current schema", async () => {
    const connector = await connected();
    await connector.introspect();
    connector.close();

    const tablesQuery = requests.find((r) => /information_schema\.tables/i.test(r.sql))?.sql;
    // Trino's current_schema is a keyword-like session function without
    // parentheses, unlike the SQL-standard current_schema() form.
    expect(tablesQuery).toContain("table_schema = current_schema\n");
    expect(tablesQuery).not.toContain("current_schema()");
    expect(tablesQuery).toContain("table_type = 'BASE TABLE'");
    expect(tablesQuery).toContain("ORDER BY table_name");

    const columnsQuery = requests.find((r) => /information_schema\.columns/i.test(r.sql))?.sql;
    expect(columnsQuery).toContain("table_schema = current_schema\n");
    expect(columnsQuery).not.toContain("current_schema()");
    expect(columnsQuery).toContain("ORDER BY ordinal_position");
  });
});

describe("TrinoConnector execution", () => {
  it("executes a select and returns typed rows", async () => {
    const connector = await connected();
    try {
      const result = await connector.execute("SELECT 1 AS n");
      expect(result.columns).toEqual(["n"]);
      expect(result.rowCount).toBe(1);
      expect(result.rows).toEqual([{ n: 1 }]);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    } finally {
      connector.close();
    }
  });

  it("drains every result page exactly once", async () => {
    const connector = await connected();
    try {
      const result = await connector.execute("SELECT n FROM paged");
      expect(result.rows).toEqual([{ n: 1 }, { n: 2 }]);
      expect(result.rowCount).toBe(2);
    } finally {
      connector.close();
    }
  });

  it("surfaces a query error from the coordinator", async () => {
    const connector = await connected();
    try {
      await expect(connector.execute("SELECT fail_me")).rejects.toThrow(
        "USER_ERROR: line 1:1: boom",
      );
    } finally {
      connector.close();
    }
  });

  it("redacts the password from driver errors", () => {
    expect(sanitizeErrorMessage("auth failed for hunter2", ["hunter2"])).toBe(
      "auth failed for ****",
    );
  });
});
