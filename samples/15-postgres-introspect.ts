/**
 * Introspect a local PostgreSQL database and run a query.
 *
 * Set EASYSQL_TEST_POSTGRES_URL=postgresql://user:pass@host:5432/db, or pass a
 * URL as the first argument:
 *
 *   bun run samples/15-postgres-introspect.ts postgresql://postgres:secret@127.0.0.1:5432/shop
 */

import { parseConnectionUrl } from "@easysql/common";
import { PostgresConnector } from "@easysql/connector-postgres";
import { generateSchema } from "@easysql/schema-generation";
import { log } from "./_shared";

const url = process.argv[2] ?? process.env.EASYSQL_TEST_POSTGRES_URL;
if (!url) {
  console.error("Provide a PostgreSQL URL as argv[2] or set EASYSQL_TEST_POSTGRES_URL.");
  process.exit(1);
}

const connection = parseConnectionUrl(url);
const connector = new PostgresConnector({
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

  const result = await connector.execute("SELECT 1 AS n");
  log("Query result", result.rows);
} finally {
  await connector.close();
}
