/**
 * Execute a query against a local SQLite database.
 *
 *   bun run samples/05-sqlite-execute.ts
 */

import { SqliteConnector } from "@easysql/connector-sqlite";
import { log } from "./_shared";

const connector = new SqliteConnector({ file: ":memory:", readonly: false });
connector.connect();
try {
  connector.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)");
  connector.execute("INSERT INTO users (email) VALUES ('ada@example.com'), ('grace@example.com')");

  const result = connector.execute("SELECT id, email FROM users ORDER BY id");
  log("Rows", result.rows);
  log("Columns / count / duration (ms)", {
    columns: result.columns,
    rowCount: result.rowCount,
    durationMs: result.durationMs,
  });
} finally {
  connector.close();
}
