import { describe, expect, it } from "bun:test";
import {
  type Connector,
  type QueryResult,
  type RawSchema,
  sanitizeErrorMessage,
} from "../src/index";

describe("shared contracts", () => {
  it("RawSchema is a valid Connector introspection result", () => {
    const raw: RawSchema = { engine: "mysql", tables: [] };
    const connector: Connector = {
      connect() {},
      close() {},
      introspect: () => raw,
      execute: () => ({ columns: [], rows: [], rowCount: 0, durationMs: 0 }),
    };
    expect(connector.introspect()).toEqual(raw);
  });

  it("QueryResult carries columns, rows, count and duration", () => {
    const result: QueryResult = {
      columns: ["id"],
      rows: [{ id: 1 }],
      rowCount: 1,
      durationMs: 2,
    };
    expect(result.columns).toEqual(["id"]);
    expect(result.rowCount).toBe(1);
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    expect(sanitizeErrorMessage("auth failed for 'u' (hunter2) hunter2", ["hunter2"])).toBe(
      "auth failed for 'u' (****) ****",
    );
  });

  it("ignores empty and undefined secrets", () => {
    expect(sanitizeErrorMessage("boom", ["", undefined])).toBe("boom");
  });
});
