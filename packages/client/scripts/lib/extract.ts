import type { GeneratedMethod, OpenApiOperation, OpenApiSpec } from "./types";

export function extractMethods(spec: OpenApiSpec): GeneratedMethod[] {
  const methods: GeneratedMethod[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const httpMethod of ["get", "post", "put", "patch", "delete"] as const) {
      const operation: OpenApiOperation | undefined = pathItem[httpMethod];
      if (!operation?.operationId) continue;

      const methodName = deriveMethodName(operation.operationId, httpMethod);
      const hasBody = !!operation.requestBody;
      const hasPathParams = path.includes("{");
      const hasQueryParams = operation.parameters?.some((p) => p.in === "query") ?? false;

      methods.push({
        name: methodName,
        path,
        httpMethod,
        hasBody,
        hasPathParams,
        hasQueryParams,
        pathSignature: `"${path}"`,
        typeSignature: `paths["${path}"]["${httpMethod}"]`,
        flatten: [hasBody, hasPathParams, hasQueryParams].filter(Boolean).length <= 1,
        example: buildExample(operation, hasBody, hasPathParams, hasQueryParams),
      });
    }
  }

  return deduplicate(methods);
}

function deduplicate(methods: GeneratedMethod[]): GeneratedMethod[] {
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

export function deriveMethodName(operationId: string, httpMethod: string): string {
  const withoutMethod = operationId.replace(new RegExp(`_${httpMethod}$`), "");
  const versionMatch = withoutMethod.match(/_v\d+_/);
  const action = versionMatch ? withoutMethod.substring(0, versionMatch.index ?? 0) : withoutMethod;
  return action.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

export function buildExample(
  operation: OpenApiOperation,
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
    const pathParams = operation.parameters?.filter((p) => p.in === "path") ?? [];
    if (pathParams.length) {
      const props = pathParams.map((p) => `${p.name}: "..."`);
      parts.push(`{ ${props.join(", ")} }`);
    }
  }

  if (hasQueryParams && !hasBody && !hasPathParams) {
    const queryParams = operation.parameters?.filter((p) => p.in === "query") ?? [];
    if (queryParams.length) {
      const props = queryParams.map((p) => `${p.name}: 1`);
      parts.push(`{ ${props.join(", ")} }`);
    }
  }

  return parts.length ? parts.join(", ") : "";
}
