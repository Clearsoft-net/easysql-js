/**
 * Shared scaffolding for the connector integration suites.
 *
 * Each suite is gated on an `EASYSQL_TEST_*` environment variable: it runs when
 * the variable is set and is otherwise replaced by a "skipped" companion suite,
 * so CI without a database stays green. The connection URL is decoded once here
 * so every suite only applies its own defaults on top.
 */

import { describe, expect, it } from "bun:test";

/** Declares the companion suite that keeps CI green when the real one is skipped. */
export function skipSuite(name: string, requirement: string, enabled: boolean): void {
  describe.skipIf(enabled)(`${name} integration (skipped)`, () => {
    it(`is skipped without ${requirement}`, () => {
      expect(enabled).toBe(false);
    });
  });
}

/**
 * The decoded parts of a test connection URL. `port` is `undefined` when the URL
 * omits it, so each suite can apply its own default; `secure` is true for an
 * `https:`/`wss:`/`clickhouses:` URL.
 */
export function decodeTestUrl(raw: string): {
  host: string;
  port: number | undefined;
  user: string;
  password: string;
  database: string;
  secure: boolean;
  searchParams: URLSearchParams;
} {
  const parsed = new URL(raw);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : undefined,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    secure: parsed.protocol.endsWith("s:"),
    searchParams: parsed.searchParams,
  };
}
