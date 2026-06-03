import type { GeneratedMethod } from "./types";

export async function generateDocs(methods: GeneratedMethod[]) {
  const groups = new Map<string, GeneratedMethod[]>();

  for (const m of methods) {
    const category = categoryFromPath(m.path);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)!.push(m);
  }

  let md = "# EasySQL SDK — API Reference\n\n";
  md += "Auto-generated from the OpenAPI spec.\n";
  md += "Regenerate: `make generate`\n\n";
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
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "v1") {
    const name = parts[1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
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
    if (m.hasBody || m.hasPathParams || m.hasQueryParams) {
      return m.example ? ` (${m.example.slice(1, -1)})` : "";
    }
  }

  const parts: string[] = [];
  if (m.hasBody) parts.push(" ...");
  if (m.hasPathParams || m.hasQueryParams) parts.push(" ...");
  return parts.join(",");
}
