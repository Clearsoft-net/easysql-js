import "dotenv/config";
import { execSync } from "node:child_process";

const apiUrl = process.env.EASYSQL_API_URL;

if (!apiUrl) {
  console.error("❌ EASYSQL_API_URL is not set.");
  console.error("   Copy .env.example to .env and fill in the API URL.");
  process.exit(1);
}

const specUrl = `${apiUrl.replace(/\/+$/, "")}/openapi.json`;

console.log(`🔽 Downloading spec from: ${specUrl}`);

execSync(`openapi-typescript "${specUrl}" -o src/api-types.ts`, {
  stdio: "inherit",
});

console.log("✅ src/api-types.ts generated successfully.");
