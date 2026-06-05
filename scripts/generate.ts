import "dotenv/config";
import openapiTS, { astToString } from "openapi-typescript";
import { extractMethods } from "./lib/extract";
import { buildInterface, buildImpl, indent } from "./lib/build";
import { generateDocs } from "./lib/docs";

const apiUrl = process.env.EASYSQL_API_URL;

if (!apiUrl) {
  console.error("❌ EASYSQL_API_URL is not set.");
  console.error("   Copy .env.example to .env and fill in the API URL.");
  process.exit(1);
}

const specUrl = `${apiUrl.replace(/\/+$/, "")}/openapi.json`;

async function retryFetch(
  url: string,
  retries = 3,
  delayMs = 1000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`  ⚠ Retry ${i + 1}/${retries} after ${delayMs}ms…`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 2;
    }
  }
  throw new Error("Unreachable");
}

console.log(`🔽 Downloading spec from: ${specUrl}`);

const [typesAst] = await Promise.all([
  openapiTS(specUrl),
  generateClient(specUrl),
]);

await Bun.write("src/api-types.ts", astToString(typesAst));
console.log("✅ src/api-types.ts generated successfully.");

async function generateClient(url: string) {
  const response = await retryFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch spec: ${response.status}`);
  }
  const spec = await response.json();

  const methods = extractMethods(spec);
  const interfaceCode = methods.map(buildInterface).join("\n");
  const implCode = methods.map(buildImpl).join(",\n\n");

  let template = await Bun.file(import.meta.dirname + "/client.ts.tpl").text();
  template = template.replace("{{INTERFACE}}", interfaceCode);
  template = template.replace("{{IMPLEMENTATION}}", indent(implCode, 4));

  await Bun.write("src/client.ts", template);
  console.log("✅ src/client.ts generated successfully.");

  await generateDocs(methods);
}
