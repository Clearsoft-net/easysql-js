/**
 * API keys: create, list, then delete the one you created.
 *
 * API keys are the credential for machine clients (e.g. the WordPress plugin):
 * they authenticate POST /v1/queries instead of a user JWT.
 *
 *   EASYSQL_ACCESS_TOKEN=... bun run samples/12-client-api-keys.ts
 */

import { authedClient, log } from "./_shared";

const api = await authedClient();

const { data: created, error } = await api.createApiKey({ name: "sample-key" });
if (error) {
  log("createApiKey() failed", error);
  process.exit(1);
}
// The full key is returned ONCE — store it securely now.
log("Created key (shown only once)", created);

const { data: keys } = await api.listApiKeys();
log("Active keys", keys);

const { error: deleteError } = await api.deleteApiKey({ key_id: created.id });
if (deleteError) {
  log("deleteApiKey() failed", deleteError);
  process.exit(1);
}
log("Deleted key", created.id);
