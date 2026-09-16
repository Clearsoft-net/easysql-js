/**
 * Authenticate and read the current user.
 *
 * The API is OIDC-only: there is no password login. Provide a token via
 * EASYSQL_ACCESS_TOKEN, or a refresh token via EASYSQL_REFRESH_TOKEN which is
 * rotated on startup (see samples/_shared.ts).
 *
 *   bun run samples/08-client-auth-me.ts
 */

import { authedClient, log } from "./_shared";

const api = await authedClient();

const { data: user, error } = await api.me();
if (error) {
  log("me() failed", error);
  process.exit(1);
}
log("Current user", user);

const { data: keys } = await api.listApiKeys();
log("API keys", keys);
