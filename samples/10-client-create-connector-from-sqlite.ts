/**
 * End-to-end: introspect a local SQLite file and register it on the API.
 *
 * The database is introspected on this machine; only the schema is sent, and
 * the connection credentials never leave the process (SQLite has none).
 *
 *   EASYSQL_ACCESS_TOKEN=... bun run samples/10-client-create-connector-from-sqlite.ts
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteConnector } from "@easysql/connector-sqlite";
import { generateSchema } from "@easysql/schema-generation";
import { authedClient, log } from "./_shared";

const dir = mkdtempSync(join(tmpdir(), "easysql-sample-"));
const file = join(dir, "shop.db");

try {
  const connector = new SqliteConnector({ file, readonly: false });
  connector.connect();
  connector.execute(
    "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price NUMERIC)",
  );
  const raw = connector.introspect();
  connector.close();

  const schema = generateSchema(raw);
  log("Schema to push", schema);

  const api = await authedClient();
  const { data, error } = await api.createConnector({
    name: `Sample SQLite ${new Date().toISOString()}`,
    type: "sqlite",
    schema,
  });
  if (error) {
    log("createConnector() failed", error);
    process.exit(1);
  }
  log("Connector created", data);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
