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
import type { ClickhouseConnectionConfig } from "../../src/clickhouse/index";
import { ClickhouseConnector } from "../../src/clickhouse/index";
import { failureOf } from "./failure";
import { decodeTestUrl, skipSuite } from "./support";

const url = process.env.EASYSQL_TEST_CLICKHOUSE_URL;
const enabled = Boolean(url);

function configFromUrl(raw: string): ClickhouseConnectionConfig {
  const { host, port, user, password, database, secure } = decodeTestUrl(raw);
  return {
    host,
    port: port ?? (secure ? 8443 : 8123),
    user: user || "default",
    password,
    database: database || "default",
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

  it("surfaces the driver error without leaking the password", async () => {
    const failure = await failureOf(connector, "SELECT * FROM easysql_test_missing_table");

    expect(failure.message).toContain("easysql_test_missing_table");
    expect(failure.message).not.toContain(configFromUrl(url as string).password);
  });
});

skipSuite("ClickhouseConnector", "EASYSQL_TEST_CLICKHOUSE_URL", enabled);
