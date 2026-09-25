/**
 * Integration test against a real ClickHouse instance (HTTP interface).
 *
 * Runs only when EASYSQL_TEST_CLICKHOUSE_URL is set, e.g.
 *   clickhouse://default:@127.0.0.1:8123/easysql_test
 * The database must already exist. Skipped with an explicit message otherwise,
 * so CI without a server stays green.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createClient } from "@clickhouse/client";
import type { ClickhouseConnectionConfig } from "../src/index";
import { ClickhouseConnector } from "../src/index";

const url = process.env.EASYSQL_TEST_CLICKHOUSE_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): ClickhouseConnectionConfig {
  const parsed = new URL(raw);
  const secure = parsed.protocol === "clickhouses:";
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : secure ? 8443 : 8123,
    user: decodeURIComponent(parsed.username) || "default",
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "") || "default",
    ssl: secure,
  };
}

describe.skipIf(!enabled)("ClickhouseConnector integration", () => {
  let connector: ClickhouseConnector;

  beforeAll(async () => {
    const config = configFromUrl(url as string);
    const protocol = config.ssl ? "https" : "http";
    const admin = createClient({
      url: `${protocol}://${config.host}:${config.port}`,
      username: config.user,
      password: config.password,
      database: config.database,
    });
    await admin.command({ query: "DROP TABLE IF EXISTS easysql_events" });
    await admin.command({
      query:
        "CREATE TABLE easysql_events (id UInt64, name String, score Nullable(Float64)) ENGINE = MergeTree ORDER BY id",
    });
    await admin.close();

    connector = new ClickhouseConnector(config);
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("clickhouse");

    const events = first.tables.find((t) => t.name === "easysql_events");
    expect(events).toBeDefined();
    const score = events?.columns.find((c) => c.name === "score");
    expect(score?.dataType).toBe("Nullable(Float64)");
    expect(score?.nullable).toBe(true);
    expect(events?.columns.find((c) => c.name === "id")?.primaryKey).toBe(true);
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.n).toBe(1);
  });
});

describe.skipIf(enabled)("ClickhouseConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_CLICKHOUSE_URL", () => {
    expect(enabled).toBe(false);
  });
});
