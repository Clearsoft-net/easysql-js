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
  const interfaceCode = methods.map(buildInterface).join("\n");
  const implCode = methods.map(buildImpl).join(",\n\n");

  let template = await Bun.file(import.meta.dirname + "/client.ts.tpl").text();
  template = template.replace("{{INTERFACE}}", interfaceCode);
  template = template.replace("{{IMPLEMENTATION}}", indent(implCode, 4));

  await Bun.write("src/client.ts", output);
  console.log("✅ src/client.ts generated successfully.");

  await generateDocs(methods);
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
  flatten: boolean;
  example: string;
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
      const typeSignature = `paths["${path}"]["${httpMethod}"]`;

      const example = buildExample(
        operation,
        path,
        hasBody,
        hasPathParams,
        hasQueryParams,
      );

      methods.push({
        name: methodName,
        path,
        httpMethod,
        hasBody,
        hasPathParams,
        hasQueryParams,
        pathSignature,
        typeSignature,
        flatten:
          [hasBody, hasPathParams, hasQueryParams].filter(Boolean).length <= 1,
        example,
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

function buildExample(
  operation: any,
  path: string,
  hasBody: boolean,
  hasPathParams: boolean,
  hasQueryParams: boolean,
): string {
  if (!hasBody && !hasPathParams && !hasQueryParams) return "";

  const parts: string[] = [];

  if (hasBody) {
    const schema = operation.requestBody?.content?.["application/json"]?.schema;
    if (schema?.properties) {
      const props = Object.keys(schema.properties).map((k) => `${k}: "..."`);
      parts.push(`{ ${props.join(", ")} }`);
    }
  }

  if (hasPathParams) {
    const pathParams =
      operation.parameters?.filter((p: any) => p.in === "path") ?? [];
    if (pathParams.length) {
      const props = pathParams.map((p: any) => `${p.name}: "..."`);
      parts.push(`{ ${props.join(", ")} }`);
    }
  }

  if (hasQueryParams && !hasBody && !hasPathParams) {
    const queryParams =
      operation.parameters?.filter((p: any) => p.in === "query") ?? [];
    if (queryParams.length) {
      const props = queryParams.map((p: any) => `${p.name}: 1`);
      parts.push(`{ ${props.join(", ")} }`);
    }
  }

  return parts.length ? parts.join(", ") : "";
}

// ─── 4. Generate markdown docs ─────────────────────────────────────

async function generateDocs(methods: GeneratedMethod[]) {
  const groups = new Map<string, GeneratedMethod[]>();

  for (const m of methods) {
    const category = categoryFromPath(m.path);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(m);
  }

  let md = "# EasySQL SDK — API Reference\n\n";
  md += "Auto-generated from the OpenAPI spec.\n";
  md += `Regenerate: \`make generate\`\n\n`;
  md += "---\n\n";

  for (const [category, ms] of groups) {
    md += `## ${category}\n\n`;
    for (const m of ms) {
      md += formatMethod(m);
    }
  }

  await Bun.write("docs/API.md", md);
  console.log("✅ docs/API.md generated successfully.");
}

function categoryFromPath(path: string): string {
  // Extract the category from the path: /v1/auth/login -> Auth
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "v1") {
    const name = parts[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  // Fallback for paths like /health
  const name = parts[0] || "Other";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatMethod(m: GeneratedMethod): string {
  const tag = `\`${m.httpMethod.toUpperCase()}\``;
  const sig = buildCallSignature(m);
  const example = m.example ? `\n\n${m.example}` : "";
  return `### \`client.${m.name}(${sig})\`\n\n${tag} ${m.path}${example}\n\n`;
}

function buildCallSignature(m: GeneratedMethod): string {
  if (!m.hasBody && !m.hasPathParams && !m.hasQueryParams) return "";

  if (m.flatten) {
    if (m.hasBody) {
      // Could extract property names from example, but just use example string
      return m.example ? `{ ... }` : `{ }`;
    }
    if (m.hasPathParams || m.hasQueryParams) {
      return m.example ? `{ ... }` : `{ }`;
    }
  }

  // Multiple param types — show both
  const parts: string[] = [];
  if (m.hasBody) parts.push(m.example ? `{ ... }, ` : `{ }, `);
  if (m.hasPathParams || m.hasQueryParams) parts.push(`{ ... }`);
  return parts.join("");
}

// ─── 5. Build code strings ────────────────────────────────────────

function buildInterface(m: GeneratedMethod): string {
  const params = buildParams(m);
  const example = m.example
    ? `\n   * @example\n   * await client.${m.name}(${m.example})`
    : "";
  return `  /** ${m.httpMethod.toUpperCase()} ${m.path}${example} */\n  ${m.name}(${params}): Promise<any>;`;
}

function buildImpl(m: GeneratedMethod): string {
  const params = buildParams(m);
  const args = buildArgs(m);
  const methodCall = `client.${m.httpMethod.toUpperCase()}(${m.pathSignature}${args})`;
  return `/** ${m.httpMethod.toUpperCase()} ${m.path} */\n${m.name}(${params}) {\n  return ${methodCall};\n}`;
}

function buildParams(m: GeneratedMethod): string {
  if (m.flatten) {
    if (m.hasBody) {
      return `body: ${m.typeSignature}["requestBody"]["content"]["application/json"]`;
    }
    if (m.hasPathParams) {
      return `params: ${m.typeSignature}["parameters"]["path"]`;
    }
    if (m.hasQueryParams) {
      return `params: ${m.typeSignature}["parameters"]["query"]`;
    }
    return "";
  }

  // Multiple param types — keep explicit wrapper
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

  if (m.flatten) {
    if (m.hasBody) return ", { body }";
    if (m.hasPathParams) return ", { params: { path: params } }";
    if (m.hasQueryParams) return ", { params: { query: params } }";
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
