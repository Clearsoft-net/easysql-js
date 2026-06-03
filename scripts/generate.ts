import "dotenv/config";
import openapiTS from "openapi-typescript";

const apiUrl = process.env.EASYSQL_API_URL;

if (!apiUrl) {
  console.error("❌ EASYSQL_API_URL is not set.");
  console.error("   Copy .env.example to .env and fill in the API URL.");
  process.exit(1);
}

const specUrl = `${apiUrl.replace(/\/+$/, "")}/openapi.json`;

console.log(`🔽 Downloading spec from: ${specUrl}`);

const output = await openapiTS(specUrl);

await Bun.write("src/api-types.ts", output);

console.log("✅ src/api-types.ts generated successfully.");
