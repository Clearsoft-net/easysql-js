#!/usr/bin/env node
/**
 * Node compatibility smoke test: loads every built package under Node and
 * exercises the pure pieces. Run after `bun run build` (packages must be in
 * dist/). Packages are imported by their built path so Node resolves their own
 * dependencies from the package's node_modules.
 *
 * The SQLite connector is only exercised on Node >= 22.5 (node:sqlite).
 */

import assert from "node:assert/strict";
import { parseConnectionUrl, sanitizeErrorMessage } from "../packages/common/dist/index.js";
import { generateSchema } from "../packages/schema-generation/dist/index.js";

const schema = generateSchema({
  engine: "postgresql",
  tables: [
    {
      name: "t",
      columns: [
        { name: "id", dataType: "serial", nullable: false, primaryKey: true, ordinal: 1 },
        { name: "at", dataType: "timestamptz", nullable: true, ordinal: 2 },
      ],
    },
  ],
});
assert.equal(schema[0].columns[0].type, "integer");
assert.equal(schema[0].columns[1].type, "timestamp");
assert.equal(parseConnectionUrl("mysql://u:p@h:3307/db").port, 3307);
assert.equal(sanitizeErrorMessage("boom secret", ["secret"]), "boom ****");

// Every connector module must load under Node.
const { MysqlConnector } = await import("../packages/connectors/mysql/dist/index.js");
const { PostgresConnector } = await import("../packages/connectors/postgres/dist/index.js");
assert.equal(typeof MysqlConnector, "function");
assert.equal(typeof PostgresConnector, "function");

const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 22 || (major === 22 && minor >= 5)) {
  const { SqliteConnector } = await import("../packages/connectors/sqlite/dist/index.js");
  const connector = new SqliteConnector({ file: ":memory:", readonly: false });
  connector.connect();
  const result = connector.execute("SELECT 1 AS n");
  connector.close();
  assert.equal(result.rows[0].n, 1);
} else {
  console.log("node:sqlite not available — skipping the SQLite connector check");
}

console.log(`✓ node compat smoke ok on Node ${process.versions.node}`);
