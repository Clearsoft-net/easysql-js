import "dotenv/config";
import openapiTS from "openapi-typescript";
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

console.log(`🔽 Downloading spec from: ${specUrl}`);

const [typesOutput] = await Promise.all([
  openapiTS(specUrl),
  generateClient(specUrl),
]);

await Bun.write("src/api-types.ts", typesOutput);
console.log("✅ src/api-types.ts generated successfully.");

async function generateClient(url: string) {
  const response = await fetch(url);
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
