/**
 * Dashboard stats and billing usage.
 *
 *   EASYSQL_ACCESS_TOKEN=... bun run samples/13-client-dashboard-billing.ts
 */

import { authedClient, log } from "./_shared";

const api = await authedClient();

const { data: stats } = await api.dashboardStats();
log("Dashboard", stats);

const { data: plan } = await api.getPlan();
log("Active plan", plan);

const { data: usage } = await api.getUsage();
log("Usage (daily / weekly / monthly)", usage);
