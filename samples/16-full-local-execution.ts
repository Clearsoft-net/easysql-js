/**
 * Full local-execution flow (the EasySQL model end to end):
 *   1. introspect the local SQLite file and push only the schema;
 *   2. ask a natural-language question;
 *   3. the API returns SQL with `needs_local_execution: true`;
 *   4. execute the SQL locally and post the rows back;
 *   5. read the final answer + chart config.
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

// 1. Introspect locally and register/refresh the connector schema.
const connector = new SqliteConnector({ file, readonly: true });
connector.connect();
let connectorId = process.env.EASYSQL_CONNECTOR_ID;
try {
  const schema = generateSchema(connector.introspect());
  if (connectorId) {
    const { data, error } = await api.syncConnector(
      { schema },
      { path: { connector_id: connectorId } },
    );
    if (error) throw new Error(`syncConnector failed: ${JSON.stringify(error)}`);
    log("Schema synced", data);
  } else {
    const { data, error } = await api.createConnector({
      name: `Local SQLite ${file}`,
      type: "sqlite",
      schema,
    });
    if (error) throw new Error(`createConnector failed: ${JSON.stringify(error)}`);
    connectorId = data.id;
    log("Connector created", data);
  }

  // 2. Ask a natural-language question.
  const { data: created, error: queryError } = await api.createQuery({
    connector_id: connectorId as string,
    question: "How many rows are in the products table?",
  });
  if (queryError) throw new Error(`createQuery failed: ${JSON.stringify(queryError)}`);
  log("Generated SQL", created.sql_generated);

  // 3. Execute the generated SQL locally.
  if (created.needs_local_execution && created.sql_generated) {
    const result = connector.execute(created.sql_generated);
    log("Local rows", result.rows);

    // 4. Post the rows back so the API can produce the answer.
    const { data: answered, error: answerError } = await api.answerQuery(
      { result_data: result.rows },
      { path: { query_id: created.id } },
    );
    if (answerError) throw new Error(`answerQuery failed: ${JSON.stringify(answerError)}`);
    // 5. Final answer.
    log("Answer", answered?.answer ?? answered);
    log("Chart config", answered?.chart_config ?? null);
  } else {
    log("Query state", created);
  }
} finally {
  connector.close();
}
