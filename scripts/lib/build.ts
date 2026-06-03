import type { GeneratedMethod } from "./types";

export function buildInterface(m: GeneratedMethod): string {
  const params = buildParams(m);
  const example = m.example
    ? `\n   * @example\n   * await client.${m.name}(${m.example})`
    : "";
  return `  /** ${m.httpMethod.toUpperCase()} ${m.path}${example} */\n  ${m.name}(${params}): Promise<any>;`;
}

export function buildImpl(m: GeneratedMethod): string {
  const params = buildParams(m);
  const args = buildArgs(m);
  const methodCall = `client.${m.httpMethod.toUpperCase()}(${m.pathSignature}${args})`;
  return `/** ${m.httpMethod.toUpperCase()} ${m.path} */\n${m.name}(${params}) {\n  return ${methodCall};\n}`;
}

export function buildParams(m: GeneratedMethod): string {
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

export function buildArgs(m: GeneratedMethod): string {
  if (!m.hasBody && !m.hasPathParams && !m.hasQueryParams) return "";

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

export function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}
