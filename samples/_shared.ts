/**
 * Shared helpers for the samples. Not a package — just conveniences so each
 * sample stays focused on the feature it demonstrates.
 */

import { createEasySQLClient, type EasySQLClient } from "@easysql/client";

/** Base URL from the environment, defaulting to production. */
export function apiBaseUrl(): string {
  return process.env.EASYSQL_API_URL ?? "https://api.easysql.net";
}

/** Reads a required environment variable or exits with a helpful message. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env and set it.`);
    process.exit(1);
  }
  return value;
}

/** Prints a labelled section. */
export function log(label: string, value?: unknown): void {
  console.log(`\n▶ ${label}`);
  if (value !== undefined) console.dir(value, { depth: null });
}

/**
 * Builds an authenticated client.
 *
 * - With EASYSQL_ACCESS_TOKEN: uses it directly.
 * - With EASYSQL_REFRESH_TOKEN: rotates the pair with `refresh()` first.
 *
 * The API is OIDC-only (no password login): tokens come from the sign-in flow.
 */
export async function authedClient(): Promise<EasySQLClient> {
  const baseUrl = apiBaseUrl();
  const accessToken = process.env.EASYSQL_ACCESS_TOKEN;
  if (accessToken) return createEasySQLClient({ baseUrl, accessToken });

  const refreshToken = requireEnv("EASYSQL_REFRESH_TOKEN");
  const anonymous = createEasySQLClient({ baseUrl });
  const { data, error } = await anonymous.refresh({ refresh_token: refreshToken });
  if (error || !data?.access_token) {
    throw new Error(`refresh failed: ${JSON.stringify(error)}`);
  }
  return createEasySQLClient({ baseUrl, accessToken: data.access_token });
}
