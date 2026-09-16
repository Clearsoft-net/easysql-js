/**
 * Open a SQLite file read-only — writes are rejected at the driver level.
 *
 *   bun run samples/06-sqlite-readonly-file.ts
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteConnector } from "@easysql/connector-sqlite";
import { log } from "./_shared";

const dir = mkdtempSync(join(tmpdir(), "easysql-sample-"));
const file = join(dir, "shop.db");

try {
  // Create the fixture with a writable connection.
  const writer = new SqliteConnector({ file, readonly: false });
  writer.connect();
  writer.execute("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT)");
  writer.execute("INSERT INTO products (name) VALUES ('coffee')");
  writer.close();

  // Reopen read-only (the default).
  const reader = new SqliteConnector({ file, readonly: true });
  reader.connect();
  try {
    log("Read works", reader.execute("SELECT * FROM products").rows);
    try {
      reader.execute("INSERT INTO products (name) VALUES ('tea')");
    } catch (error) {
      log("Write rejected (expected)", error instanceof Error ? error.message : error);
    }
  } finally {
    reader.close();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
