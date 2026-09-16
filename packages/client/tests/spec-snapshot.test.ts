import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { buildExample, deriveMethodName, extractMethods } from "../scripts/lib/extract";
import type { OpenApiSpec } from "../scripts/lib/types";

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as T;
}

const spec = fixture<OpenApiSpec>("openapi.json");
const expected = fixture<string[]>("expected-methods.json");

describe("generator against the deployed spec snapshot", () => {
  it("extracts the expected method set", () => {
    const names = extractMethods(spec)
      .map((m) => m.name)
      .sort();
    expect(names).toEqual(expected);
  });

  it("produces unique method names", () => {
    const names = extractMethods(spec).map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(extractMethods(spec))).toBe(JSON.stringify(extractMethods(spec)));
  });

  it("derives the connector operations the SDK documents", () => {
    const methods = extractMethods(spec);
    const byName = new Map(methods.map((m) => [m.name, m]));
    expect(byName.get("listConnectors")?.httpMethod).toBe("get");
    expect(byName.get("createConnector")?.hasBody).toBe(true);
    expect(byName.get("getConnector")?.hasPathParams).toBe(true);
    expect(byName.get("syncConnector")?.hasBody).toBe(true);
    expect(byName.get("syncConnector")?.hasPathParams).toBe(true);
  });
});

describe("extractor helpers still behave on the snapshot", () => {
  it("deriveMethodName/ buildExample are exported and pure", () => {
    expect(deriveMethodName("list_connectors_get", "get")).toBe("listConnectors");
    expect(buildExample({}, false, false, false)).toBe("");
  });
});
