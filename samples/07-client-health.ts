/**
 * Health check — no authentication required.
 *
 *   bun run samples/07-client-health.ts
 */

import { createEasySQLClient } from "@easysql/client";
import { apiBaseUrl, log } from "./_shared";

const api = createEasySQLClient({ baseUrl: apiBaseUrl() });

const { data, error } = await api.health();
if (error) {
  log("Health check failed", error);
  process.exit(1);
}
log(`Health @ ${apiBaseUrl()}`, data);
