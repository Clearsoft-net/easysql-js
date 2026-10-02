/**
 * List connections and fetch one connection's stored schema.
 *
 *   bun run samples/09-client-list-connections.ts
 */

import { authedClient, log } from "./_shared";

const api = await authedClient();

const { data: connections, error } = await api.listConnections();
if (error) {
  log("listConnections() failed", error);
  process.exit(1);
}
log("Connections", connections);

const first = Array.isArray(connections) ? connections[0] : undefined;
if (first?.id) {
  const { data: schema } = await api.getConnectionSchema({ connection_id: first.id });
  log(`Schema of ${first.name}`, schema);
} else {
  log("No connections yet — create one with samples/10-client-create-connection-from-sqlite.ts");
}
