/**
 * Full local-execution flow (the EasySQL model end to end):
 *   1. introspect the local SQLite file and push only the schema;
 *   2. ask a natural-language question;
 *   3. the API returns SQL with `needs_local_execution: true`;
 *   4. execute the SQL locally and render the answer/chart on this side —
 *      the API never receives customer data.
 *
 * Credentials/tokens never leave this machine; the database is only reached
 * locally by the connector.
 *
 *   EASYSQL_ACCESS_TOKEN=... EASYSQL_SQLITE_FILE=./shop.db \
 *     bun run samples/16-full-local-execution.ts
 */

import { SqliteConnector } from "@easysql/connector-sqlite";
import { generateSchema } from "@easysql/schema-generation";
import { authedClient, log, requireEnv } from "./_shared";

const file = requireEnv("EASYSQL_SQLITE_FILE");
const api = await authedClient();

// 1. Introspect locally and register/refresh the connection schema.
const connector = new SqliteConnector({ file, readonly: true });
connector.connect();
let connectionId = process.env.EASYSQL_CONNECTION_ID;
try {
  const schema = generateSchema(connector.introspect());
  if (connectionId) {
    const { data, error } = await api.syncConnection(
      { schema },
      { path: { connection_id: connectionId } },
    );
    if (error) throw new Error(`syncConnection failed: ${JSON.stringify(error)}`);
    log("Schema synced", data);
  } else {
    const { data, error } = await api.createConnection({
      name: `Local SQLite ${file}`,
      type: "sqlite",
      schema,
    });
    if (error) throw new Error(`createConnection failed: ${JSON.stringify(error)}`);
    connectionId = data.id;
    log("Connection created", data);
  }

  // 2. Ask a natural-language question.
  const { data: created, error: queryError } = await api.createQuery({
    connection_id: connectionId as string,
    question: "How many rows are in the products table?",
  });
  if (queryError) throw new Error(`createQuery failed: ${JSON.stringify(queryError)}`);
  log("Generated SQL", created.sql_generated);

  // 3. The API returns SQL only — execute it locally.
  if (created.needs_local_execution && created.sql_generated) {
    const result = connector.execute(created.sql_generated);
    // 4. Render the answer/chart from the local rows; the API never sees them.
    log("Local result", result.rows);
  } else {
    log("Query state", created);
  }
} finally {
  connector.close();
}
