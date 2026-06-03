/**
 * Smoke test for the EasySQL SDK.
 *
 * Usage:
 *   make generate           # first time only, or when the API spec changes
 *   bun run test.ts
 */

import "dotenv/config";
import { createEasySQLClient } from "./src/client";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Missing required env var: ${name}`);
    console.error(`   Copy .env.example to .env and fill in your credentials.`);
    process.exit(1);
  }
  return value;
}

function divider(label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(60)}`);
}

async function main() {
  /* ------------------------------------------------------------------ */
  /*  1. Load environment                                                */
  /* ------------------------------------------------------------------ */

  divider("1. Loading environment");

  const baseUrl = requireEnv("EASYSQL_API_URL");
  const email = requireEnv("EASYSQL_EMAIL");
  const password = requireEnv("EASYSQL_PASSWORD");

  console.log(`  API URL   : ${baseUrl}`);
  console.log(`  Email     : ${email}`);
  console.log(`  Password  : ${"*".repeat(password.length)}`);

  /* ------------------------------------------------------------------ */
  /*  2. Login                                                           */
  /* ------------------------------------------------------------------ */

  divider("2. Logging in");

  const anonClient = createEasySQLClient({ baseUrl });

  const { data: token, error: loginError } = await anonClient.login({
    email,
    password,
  });

  if (loginError || !token) {
    console.error("  ❌ Login failed:", loginError);
    process.exit(1);
  }

  console.log(`  ✓ Login successful`);
  console.log(`  Access token : ${token.access_token.slice(0, 20)}…`);
  console.log(`  Refresh token: ${token.refresh_token.slice(0, 20)}…`);

  /* ------------------------------------------------------------------ */
  /*  3. Fetch current user                                              */
  /* ------------------------------------------------------------------ */

  divider("3. Fetching current user");

  const authedClient = createEasySQLClient({
    baseUrl,
    accessToken: token.access_token,
  });

  const { data: user, error: meError } = await authedClient.me();

  if (meError || !user) {
    console.error("  ❌ Failed to fetch user:", meError);
    process.exit(1);
  }

  console.log(`  ✓ Authenticated as:`);
  console.log(`     ID    : ${user.id}`);
  console.log(`     Email : ${user.email}`);

  /* ------------------------------------------------------------------ */
  /*  4. Dashboard stats                                                 */
  /* ------------------------------------------------------------------ */

  divider("4. Fetching dashboard stats");

  try {
    const { data: stats, error: statsError } =
      await authedClient.dashboardStats();

    if (statsError) {
      throw new Error(String(statsError));
    }

    console.log(`  ✓ Dashboard stats`);
    console.log(
      `     ${JSON.stringify(stats, null, 2).replace(/\n/g, "\n     ")}`,
    );
  } catch (err: any) {
    console.warn(`  ⚠ Could not fetch dashboard stats (may be expected):`);
    console.warn(`     ${err.message ?? err}`);
  }

  /* ------------------------------------------------------------------ */
  /*  5. List connectors                                                 */
  /* ------------------------------------------------------------------ */

  divider("5. Listing connectors");

  try {
    const { data: connectors, error: connError } =
      await authedClient.listConnectors();

    if (connError) {
      throw new Error(String(connError));
    }

    const items = Array.isArray(connectors)
      ? connectors
      : ((connectors as any).connectors ?? []);

    console.log(`  ✓ Found ${items.length} connector(s)`);
    for (const c of items) {
      console.log(
        `     • ${c.name ?? c.id} (${(c as any).type ?? (c as any).db_type ?? "?"})`,
      );
    }
  } catch (err: any) {
    console.warn(`  ⚠ Could not list connectors (may be expected):`);
    console.warn(`     ${err.message ?? err}`);
  }

  /* ------------------------------------------------------------------ */
  /*  6. Done                                                            */
  /* ------------------------------------------------------------------ */

  divider("6. Results");

  console.log(`  ✅ All smoke tests completed.`);
  console.log();
}

main().catch((err) => {
  console.error(`\n❌ Test failed:`);
  console.error(`   ${err.message ?? err}`);
  process.exit(1);
});
