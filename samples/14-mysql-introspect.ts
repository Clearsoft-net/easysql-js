/**
 * Introspect a local MySQL/MariaDB database.
 *
 * Set EASYSQL_TEST_MYSQL_URL=mysql://user:pass@host:3306/db, or pass a URL as
 * the first argument:
 *
 *   bun run samples/14-mysql-introspect.ts mysql://root:secret@127.0.0.1:3306/shop
 */

import { parseConnectionUrl } from "@easysql/common";
import { MysqlConnector } from "@easysql/connector-mysql";
import { generateSchema } from "@easysql/schema-generation";
import { log } from "./_shared";

const url = process.argv[2] ?? process.env.EASYSQL_TEST_MYSQL_URL;
if (!url) {
  console.error("Provide a MySQL URL as argv[2] or set EASYSQL_TEST_MYSQL_URL.");
  process.exit(1);
}

const connection = parseConnectionUrl(url);
const connector = new MysqlConnector({
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
