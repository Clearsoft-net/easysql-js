import { describe, expect, it } from "bun:test";
import { extractMethods, deriveMethodName, buildExample } from "../scripts/lib/extract";
import { buildInterface, buildImpl, buildParams, buildArgs, indent } from "../scripts/lib/build";
import type { GeneratedMethod } from "../scripts/lib/types";

describe("Extractor - deriveMethodName", () => {
  it("strips HTTP method suffixes and converts snake_case to camelCase", () => {
    expect(deriveMethodName("list_connectors_get", "get")).toBe("listConnectors");
    expect(deriveMethodName("create_connector_post", "post")).toBe("createConnector");
    expect(deriveMethodName("delete_connector_delete", "delete")).toBe("deleteConnector");
  });

  it("handles version numbers in operationId", () => {
    expect(deriveMethodName("list_connectors_v1_action_get", "get")).toBe("listConnectors");
    expect(deriveMethodName("create_connector_v2_action_post", "post")).toBe("createConnector");
  });

  it("leaves already camelCase methods correct", () => {
    expect(deriveMethodName("me", "get")).toBe("me");
  });
});

describe("Extractor - buildExample", () => {
  it("returns empty string if no body/path/query params exist", () => {
    expect(buildExample({}, false, false, false)).toBe("");
  });

  it("builds example from request body Application/JSON schema properties", () => {
    const operation = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              properties: {
                email: { type: "string" },
                password: { type: "string" },
              },
            },
          },
        },
      },
    };
    expect(buildExample(operation, true, false, false)).toBe('{ email: "...", password: "..." }');
  });

  it("builds example for path parameters", () => {
    const operation = {
      parameters: [
        { name: "id", in: "path", required: true },
        { name: "version", in: "path", required: true },
      ],
    };
    expect(buildExample(operation, false, true, false)).toBe('{ id: "...", version: "..." }');
  });

  it("builds example for query parameters when no body or path parameters exist", () => {
    const operation = {
      parameters: [
        { name: "page", in: "query" },
        { name: "limit", in: "query" },
      ],
    };
    expect(buildExample(operation, false, false, true)).toBe('{ page: 1, limit: 1 }');
  });
});

describe("Extractor - extractMethods", () => {
  it("extracts and deduplicates methods from OpenAPI spec", () => {
    const mockSpec = {
      paths: {
        "/v1/connectors": {
          get: {
            operationId: "list_connectors_get",
            parameters: [
              { name: "page", in: "query" }
            ]
          },
          post: {
            operationId: "create_connector_post",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    properties: { name: { type: "string" } }
                  }
                }
              }
            }
          }
        },
        "/v1/connectors/{id}": {
          get: {
            operationId: "get_connector_get",
            parameters: [
              { name: "id", in: "path", required: true }
            ]
          }
        }
      }
    };

    const methods = extractMethods(mockSpec);

    expect(methods.length).toBe(3);
    
    const listConnectors = methods.find(m => m.name === "listConnectors");
    expect(listConnectors).toBeDefined();
    expect(listConnectors?.httpMethod).toBe("get");
    expect(listConnectors?.hasQueryParams).toBe(true);
    expect(listConnectors?.hasPathParams).toBe(false);
    expect(listConnectors?.flatten).toBe(true);

    const getConnector = methods.find(m => m.name === "getConnector");
    expect(getConnector).toBeDefined();
    expect(getConnector?.httpMethod).toBe("get");
    expect(getConnector?.hasPathParams).toBe(true);
    expect(getConnector?.flatten).toBe(true);
  });

  it("deduplicates methods with same names by appending HTTP method suffix", () => {
    const mockSpec = {
      paths: {
        "/v1/auth/me": {
          get: {
            operationId: "me_get"
          },
          post: {
            operationId: "me_post"
          }
        }
      }
    };

    const methods = extractMethods(mockSpec);
    expect(methods.length).toBe(2);
    expect(methods.some(m => m.name === "me_get")).toBe(true);
    expect(methods.some(m => m.name === "me_post")).toBe(true);
  });
});

describe("Builder - indent", () => {
  it("indents multi-line string", () => {
    const text = "line1\nline2";
    expect(indent(text, 2)).toBe("  line1\n  line2");
  });

  it("does not indent empty lines", () => {
    const text = "line1\n\nline2";
    expect(indent(text, 2)).toBe("  line1\n\n  line2");
  });
});

describe("Builder - params & args generation", () => {
  const methodBase: GeneratedMethod = {
    name: "testMethod",
    path: "/test/{id}",
    httpMethod: "post",
    hasBody: true,
    hasPathParams: true,
    hasQueryParams: true,
    pathSignature: `"/test/{id}"`,
    typeSignature: `paths["/test/{id}"]["post"]`,
    flatten: false,
    example: ""
  };

  it("generates wrapper parameters/args for multi-param types when flatten is false", () => {
    const params = buildParams(methodBase);
    expect(params).toBe(
      `body: ${methodBase.typeSignature}["requestBody"]["content"]["application/json"], params: { path: ${methodBase.typeSignature}["parameters"]["path"]; query: ${methodBase.typeSignature}["parameters"]["query"] }`
    );

    const args = buildArgs(methodBase);
    expect(args).toBe(", { body, params }");
  });

  it("flattens parameters/args when flatten is true and only has body", () => {
    const method = { ...methodBase, flatten: true, hasPathParams: false, hasQueryParams: false };
    expect(buildParams(method)).toBe(`body: ${method.typeSignature}["requestBody"]["content"]["application/json"]`);
    expect(buildArgs(method)).toBe(", { body }");
  });

  it("flattens parameters/args when flatten is true and only has path params", () => {
    const method = { ...methodBase, flatten: true, hasBody: false, hasQueryParams: false };
    expect(buildParams(method)).toBe(`params: ${method.typeSignature}["parameters"]["path"]`);
    expect(buildArgs(method)).toBe(", { params: { path: params } }");
  });

  it("flattens parameters/args when flatten is true and only has query params", () => {
    const method = { ...methodBase, flatten: true, hasBody: false, hasPathParams: false };
    expect(buildParams(method)).toBe(`params: ${method.typeSignature}["parameters"]["query"]`);
    expect(buildArgs(method)).toBe(", { params: { query: params } }");
  });
});

describe("Builder - buildInterface & buildImpl", () => {
  const method: GeneratedMethod = {
    name: "getUser",
    path: "/users/{id}",
    httpMethod: "get",
    hasBody: false,
    hasPathParams: true,
    hasQueryParams: false,
    pathSignature: `"/users/{id}"`,
    typeSignature: `paths["/users/{id}"]["get"]`,
    flatten: true,
    example: '{ id: "..." }'
  };

  it("generates typescript interface definition with doc example", () => {
    const code = buildInterface(method);
    expect(code).toContain("/** GET /users/{id}");
    expect(code).toContain("* @example");
    expect(code).toContain("* await client.getUser({ id: \"...\" })");
    expect(code).toContain("getUser(params: paths[\"/users/{id}\"][\"get\"][\"parameters\"][\"path\"]): Promise<any>;");
  });

  it("generates method implementation", () => {
    const code = buildImpl(method);
    expect(code).toContain("/** GET /users/{id} */");
    expect(code).toContain("getUser(params: paths[\"/users/{id}\"][\"get\"][\"parameters\"][\"path\"]) {");
    expect(code).toContain("return client.GET(\"/users/{id}\", { params: { path: params } });");
  });
});
