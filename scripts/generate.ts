import "dotenv/config";
import openapiTS from "openapi-typescript";

const apiUrl = process.env.EASYSQL_API_URL;

if (!apiUrl) {
  console.error("❌ EASYSQL_API_URL is not set.");
  console.error("   Copy .env.example to .env and fill in the API URL.");
  process.exit(1);
}

const specUrl = `${apiUrl.replace(/\/+$/, "")}/openapi.json`;

// ─── 1. Download spec & generate api-types.ts ───────────────────────

console.log(`🔽 Downloading spec from: ${specUrl}`);

const [typesOutput] = await Promise.all([
  openapiTS(specUrl),
  generateClient(specUrl),
]);

await Bun.write("src/api-types.ts", typesOutput);

// ─── 2. Generate client.ts from template ────────────────────────────

async function generateClient(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch spec: ${response.status}`);
  }
  const spec = await response.json();

  const methods = extractMethods(spec);
  const methodCode = methods.map(buildMethod).join(",\n\n");

  const template = await Bun.file(
    import.meta.dirname + "/client.template.ts",
  ).text();

  const output = template.replace("{{METHODS}}", indent(methodCode, 4));

  await Bun.write("src/client.ts", output);
  console.log("✅ src/client.ts generated successfully.");
}

// ─── 3. Extract methods from spec ───────────────────────────────────

interface GeneratedMethod {
  name: string;
  path: string;
  httpMethod: string;
  hasBody: boolean;
  hasPathParams: boolean;
  hasQueryParams: boolean;
  pathSignature: string;
  typeSignature: string;
}

function extractMethods(spec: any): GeneratedMethod[] {
  const methods: GeneratedMethod[] = [];

  for (const [path, pathItem] of Object.entries(
    spec.paths as Record<string, any>,
  )) {
    for (const httpMethod of [
      "get",
      "post",
      "put",
      "patch",
      "delete",
    ] as const) {
      const operation = (pathItem as any)[httpMethod];
      if (!operation) continue;

      const operationId: string = operation.operationId;
      const methodName = deriveMethodName(operationId, httpMethod);
      const hasBody = !!operation.requestBody;
      const hasPathParams = path.includes("{");
      const hasQueryParams =
        (operation.parameters as any[])?.some((p: any) => p.in === "query") ??
        false;

      const pathSignature = `"${path}"`;
      const typeSignature = `paths${path
        .split("/")
        .map((seg) => `["${seg}"]`)
        .join("")}["${httpMethod}"]`;

      methods.push({
        name: methodName,
        path,
        httpMethod,
        hasBody,
        hasPathParams,
        hasQueryParams,
        pathSignature,
        typeSignature,
      });
    }
  }

  // Deduplicate method names
  const nameCounts = new Map<string, number>();
  for (const m of methods) {
    nameCounts.set(m.name, (nameCounts.get(m.name) ?? 0) + 1);
  }
  for (const m of methods) {
    if ((nameCounts.get(m.name) ?? 0) > 1) {
      m.name = `${m.name}_${m.httpMethod}`;
    }
  }

  return methods;
}

function deriveMethodName(operationId: string, httpMethod: string): string {
  const withoutMethod = operationId.replace(new RegExp(`_${httpMethod}$`), "");
  const versionMatch = withoutMethod.match(/_v\d+_/);
  const action = versionMatch
    ? withoutMethod.substring(0, versionMatch.index!)
    : withoutMethod;
  return action.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

// ─── 4. Build method code ───────────────────────────────────────────

function buildMethod(m: GeneratedMethod): string {
  const params = buildParams(m);
  const args = buildArgs(m);
  const methodCall = `client.${m.httpMethod.toUpperCase()}(${m.pathSignature}${args})`;

  return `/** ${m.httpMethod.toUpperCase()} ${m.path} */\n  ${m.name}(${params}) {\n    return ${methodCall};\n  }`;
}

function buildParams(m: GeneratedMethod): string {
  const parts: string[] = [];

  if (m.hasBody) {
    parts.push(
      `body: ${m.typeSignature}["requestBody"]["content"]["application/json"]`,
    );
  }
  if (m.hasPathParams || m.hasQueryParams) {
    const paramParts: string[] = [];
    if (m.hasPathParams)
      paramParts.push(`path: ${m.typeSignature}["parameters"]["path"]`);
    if (m.hasQueryParams)
      paramParts.push(`query: ${m.typeSignature}["parameters"]["query"]`);
    parts.push(`params: { ${paramParts.join("; ")} }`);
  }

  return parts.join(", ");
}

function buildArgs(m: GeneratedMethod): string {
  if (!m.hasBody && !m.hasPathParams && !m.hasQueryParams) {
    return "";
  }
  const argParts: string[] = [];
  if (m.hasBody) argParts.push("body");
  if (m.hasPathParams || m.hasQueryParams) argParts.push("params");
  return `, { ${argParts.join(", ")} }`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

console.log("✅ src/api-types.ts generated successfully.");
