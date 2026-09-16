/**
 * Ask a natural-language question and poll for the result.
 *
 * The API returns `needs_local_execution: true` with the generated SQL; a client
 * runtime executes it against the local database (see sample 16 for the full
 * flow, including posting the rows back).
 *
 *   EASYSQL_ACCESS_TOKEN=... EASYSQL_CONNECTOR_ID=<uuid> \
 *     bun run samples/11-client-natural-query.ts
 */

import { authedClient, log, requireEnv } from "./_shared";

const connectorId = requireEnv("EASYSQL_CONNECTOR_ID");
const api = await authedClient();

const { data: created, error } = await api.createQuery({
  connector_id: connectorId,
  question: "How many rows does the products table have?",
});
if (error) {
  log("createQuery() failed", error);
  process.exit(1);
}
log("Query created (SQL + flags)", created);

let query = created;
for (let attempt = 0; attempt < 10 && query?.status === "processing"; attempt++) {
  await Bun.sleep(500);
  const { data } = await api.getQuery({ query_id: created.id });
  query = data;
}
log("Final query state", query);
