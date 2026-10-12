#!/usr/bin/env node
/**
 * Node compatibility smoke test: loads built packages under Node and exercises
 * their pure pieces. Run after `bun run build`.
 *
 * SQLite is exercised only on Node >= 22.5 (node:sqlite).
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

// Importing the factory must not eagerly require every engine driver.
const { createConnector, ConnectorEngine } = await import("../packages/connectors/dist/index.js");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 22 || (major === 22 && minor >= 5)) {
  const connector = await createConnector({
    engine: ConnectorEngine.SQLite,
    connection: { file: ":memory:", readonly: false },
  });
  await connector.connect();
  const result = await connector.execute("SELECT 1 AS n");
  await connector.close();
  assert.equal(result.rows[0].n, 1);
} else {
  console.log("node:sqlite not available — skipping the SQLite connector check");
}

console.log(`✓ node compat smoke ok on Node ${process.versions.node}`);
