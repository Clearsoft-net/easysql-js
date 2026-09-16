import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSchema } from "../../../schema-generation/src/index";
import { SqliteConnector } from "../src/index";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("SqliteConnector → generateSchema pipeline", () => {
  it("turns introspection into the canonical API schema payload", () => {
    const dir = mkdtempSync(join(tmpdir(), "easysql-pipeline-"));
    dirs.push(dir);
    const file = join(dir, "fixture.db");

    const writer = new SqliteConnector({ file, readonly: false });
    writer.connect();
    writer.execute(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, email VARCHAR(255) NOT NULL, active BOOLEAN, created_at DATETIME)",
    );
    writer.close();

    const connector = new SqliteConnector({ file, readonly: true });
    connector.connect();
    const raw = connector.introspect();
    connector.close();

    const payload = generateSchema(raw);
    expect(payload).toHaveLength(1);
    expect(payload[0]?.name).toBe("users");
    expect(payload[0]?.columns.map((c) => c.type)).toEqual([
      "integer",
      "text",
      "boolean",
      "datetime",
    ]);
    expect(payload[0]?.columns[0]).toEqual({
      name: "id",
      type: "integer",
      nullable: false,
      primary_key: true,
      default: null,
      foreign_key: null,
    });
  });
});
