/**
 * List connectors and fetch one connector's stored schema.
 *
 *   bun run samples/09-client-list-connectors.ts
 */

import { authedClient, log } from "./_shared";

const api = await authedClient();

const { data: connectors, error } = await api.listConnectors();
if (error) {
  log("listConnectors() failed", error);
  process.exit(1);
}
log("Connectors", connectors);

const first = Array.isArray(connectors) ? connectors[0] : undefined;
if (first?.id) {
  const { data: schema } = await api.getConnectorSchema({ connector_id: first.id });
  log(`Schema of ${first.name}`, schema);
} else {
  log("No connectors yet — create one with samples/10-client-create-connector-from-sqlite.ts");
}
