/**
 * Introspect a local ClickHouse database (HTTP interface).
 *
 * Set EASYSQL_TEST_CLICKHOUSE_URL=clickhouse://default:@127.0.0.1:8123/db, or
 * pass a URL as the first argument:
 *
 *   bun run samples/17-clickhouse-introspect.ts clickhouse://default:@127.0.0.1:8123/analytics
 */

import { parseConnectionUrl } from "@easysql/common";
import { ClickhouseConnector } from "@easysql/connector-clickhouse";
import { generateSchema } from "@easysql/schema-generation";
import { log } from "./_shared";

const url = process.argv[2] ?? process.env.EASYSQL_TEST_CLICKHOUSE_URL;
if (!url) {
  console.error("Provide a ClickHouse URL as argv[2] or set EASYSQL_TEST_CLICKHOUSE_URL.");
  process.exit(1);
}

const connection = parseConnectionUrl(url);
const connector = new ClickhouseConnector({
  host: connection.host,
  port: connection.port,
  user: connection.user,
  password: connection.password,
  database: connection.database,
  ssl: connection.ssl,
});

await connector.connect();
try {
  const raw = await connector.introspect();
  log(
    "Tables found",
    raw.tables.map((t) => `${t.name} (${t.columns.length} cols)`),
  );
  log("API schema", generateSchema(raw));
} finally {
  await connector.close();
}
