import { describe, expect, it } from "bun:test";
import type { components } from "@easysql/client/types";
import type { ColumnSchema, RawSchema } from "../src/index";
import { generateSchema } from "../src/index";
import mysqlFixture from "./fixtures/mysql.json";

type ApiColumnSchema = components["schemas"]["ColumnSchema"];
type ApiTableSchema = components["schemas"]["TableSchema"];

describe("API contract compatibility", () => {
  it("emits a payload assignable to the generated API contract type", () => {
    const payload = generateSchema(mysqlFixture as RawSchema);
    // Compile-time assertion: the generated payload must satisfy the wire type
    // produced by `openapi-typescript` from /openapi.json.
    const contract: ApiTableSchema[] = payload;
    expect(contract.length).toBeGreaterThan(0);
  });

  it("produces a column structurally compatible with the contract", () => {
    const column: ColumnSchema = {
      name: "id",
      type: "integer",
      nullable: false,
      primary_key: true,
      default: null,
      foreign_key: null,
    };
    const api: ApiColumnSchema = column;
    expect(api).toEqual(column);
  });
});
