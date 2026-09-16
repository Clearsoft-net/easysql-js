/**
 * Introspect an in-memory SQLite database and normalize it.
 *
 *   bun run samples/04-sqlite-introspect.ts
 */

import { SqliteConnector } from "@easysql/connector-sqlite";
import { generateSchema } from "@easysql/schema-generation";
import { log } from "./_shared";

const connector = new SqliteConnector({ file: ":memory:", readonly: false });
connector.connect();
try {
  connector.execute("CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)");
  connector.execute(
    "CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255) NOT NULL, role_id INTEGER REFERENCES roles(id), active BOOLEAN, created_at DATETIME)",
  );
  connector.execute("INSERT INTO roles (name) VALUES ('admin')");

  const raw = connector.introspect(); // metadata only — no rows are read
  log(
    "Raw introspection",
    raw.tables.map((t) => `${t.name} (${t.columns.length} cols)`),
  );

  const schema = generateSchema(raw); // canonical payload for POST /v1/connectors
  log("API schema", schema);
} finally {
  connector.close();
}
