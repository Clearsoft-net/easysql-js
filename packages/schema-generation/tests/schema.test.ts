import { describe, expect, it } from "bun:test";
import type { RawSchema, TableSchema } from "../src/index";
import {
  generateSchema,
  mapClickhouseType,
  mapMysqlType,
  mapPostgresType,
  mapSqliteType,
} from "../src/index";
import clickhouseFixture from "./fixtures/clickhouse.json";
import mysqlFixture from "./fixtures/mysql.json";
import sqliteFixture from "./fixtures/sqlite.json";

const mysql = mysqlFixture as RawSchema;
const sqlite = sqliteFixture as RawSchema;
const clickhouse = clickhouseFixture as RawSchema;

describe("generateSchema — deterministic output", () => {
  it("produces the same payload on every run", () => {
    expect(generateSchema(mysql)).toEqual(generateSchema(mysql));
    expect(generateSchema(sqlite)).toEqual(generateSchema(sqlite));
    expect(generateSchema(clickhouse)).toEqual(generateSchema(clickhouse));
  });

  it("is stable regardless of input table order", () => {
    const shuffled: RawSchema = { engine: mysql.engine, tables: [...mysql.tables].reverse() };
    expect(generateSchema(shuffled)).toEqual(generateSchema(mysql));
  });

  it("sorts tables by name", () => {
    const names = generateSchema(mysql).map((t) => t.name);
    expect(names).toEqual(["post_tags", "posts", "users"]);
  });

  it("keeps declared column order when ordinal is present", () => {
    const users = generateSchema(mysql).find((t) => t.name === "users") as TableSchema;
    expect(users.columns.map((c) => c.name)).toEqual([
      "id",
      "email",
      "name",
      "role",
      "balance",
      "is_active",
      "bio",
      "created_at",
    ]);
  });

  it("never mutates its input", () => {
    const snapshot = structuredClone(mysql);
    generateSchema(mysql);
    expect(mysql).toEqual(snapshot);
  });
});

describe("generateSchema — payload shape", () => {
  it("emits the API contract fields for every column", () => {
    const users = generateSchema(mysql).find((t) => t.name === "users") as TableSchema;
    expect(users.columns[0]).toEqual({
      name: "id",
      type: "integer",
      nullable: false,
      primary_key: true,
      default: null,
      foreign_key: null,
    });
  });

  it("carries primary keys, foreign keys and defaults through", () => {
    const posts = generateSchema(mysql).find((t) => t.name === "posts") as TableSchema;
    const userId = posts.columns.find((c) => c.name === "user_id");
    expect(userId?.foreign_key).toEqual({ table: "users", column: "id" });

    const users = generateSchema(mysql).find((t) => t.name === "users") as TableSchema;
    expect(users.columns.find((c) => c.name === "role")?.default).toBe("user");
    expect(users.columns.find((c) => c.name === "bio")?.default).toBeNull();
  });

  it("preserves composite keys", () => {
    const postTags = generateSchema(mysql).find((t) => t.name === "post_tags") as TableSchema;
    expect(postTags.columns.filter((c) => c.primary_key).map((c) => c.name)).toEqual([
      "post_id",
      "tag_id",
    ]);
  });

  it("passes rows_approx through and defaults it to null", () => {
    const schema = generateSchema(mysql);
    expect(schema.find((t) => t.name === "users")?.rows_approx).toBe(42);
    const noRows: RawSchema = {
      engine: "sqlite",
      tables: [{ name: "empty", columns: [{ name: "id", dataType: "INTEGER", nullable: true }] }],
    };
    expect(generateSchema(noRows)[0]?.rows_approx).toBeNull();
  });
});

describe("generateSchema — empty database", () => {
  it("returns an empty payload", () => {
    expect(generateSchema({ engine: "mysql", tables: [] })).toEqual([]);
  });
});

describe("type mapping — MySQL", () => {
  it("maps integers, booleans and numerics", () => {
    expect(mapMysqlType("int")).toBe("integer");
    expect(mapMysqlType("BIGINT")).toBe("bigint");
    expect(mapMysqlType("tinyint(1)")).toBe("boolean");
    expect(mapMysqlType("tinyint(4)")).toBe("smallint");
    expect(mapMysqlType("decimal(10,2)")).toBe("decimal");
  });

  it("maps strings, text, binary and temporal types", () => {
    expect(mapMysqlType("varchar(255)")).toBe("string");
    expect(mapMysqlType("longtext")).toBe("text");
    expect(mapMysqlType("varbinary(16)")).toBe("binary");
    expect(mapMysqlType("timestamp")).toBe("timestamp");
    expect(mapMysqlType("json")).toBe("json");
  });

  it("falls back to unknown for unmapped types", () => {
    expect(mapMysqlType("geometry")).toBe("unknown");
  });
});

describe("type mapping — SQLite", () => {
  it("resolves declared-type affinity", () => {
    expect(mapSqliteType("INTEGER")).toBe("integer");
    expect(mapSqliteType("VARCHAR(255)")).toBe("text");
    expect(mapSqliteType("TEXT")).toBe("text");
    expect(mapSqliteType("REAL")).toBe("float");
    expect(mapSqliteType("NUMERIC")).toBe("decimal");
    expect(mapSqliteType("")).toBe("blob");
  });

  it("refines affinity with named types", () => {
    expect(mapSqliteType("BOOLEAN")).toBe("boolean");
    expect(mapSqliteType("DATETIME")).toBe("datetime");
    expect(mapSqliteType("DATE")).toBe("date");
    expect(mapSqliteType("JSON")).toBe("json");
    expect(mapSqliteType("UUID")).toBe("uuid");
  });
});

describe("type mapping — ClickHouse", () => {
  it("maps integers, booleans and numerics", () => {
    expect(mapClickhouseType("UInt8")).toBe("smallint");
    expect(mapClickhouseType("UInt32")).toBe("integer");
    expect(mapClickhouseType("Int64")).toBe("bigint");
    expect(mapClickhouseType("UInt64")).toBe("bigint");
    expect(mapClickhouseType("Float64")).toBe("float");
    expect(mapClickhouseType("Decimal(18, 4)")).toBe("decimal");
    expect(mapClickhouseType("Bool")).toBe("boolean");
  });

  it("unwraps Nullable and LowCardinality", () => {
    expect(mapClickhouseType("Nullable(String)")).toBe("string");
    expect(mapClickhouseType("LowCardinality(String)")).toBe("string");
    expect(mapClickhouseType("Nullable(Decimal(18, 4))")).toBe("decimal");
    expect(mapClickhouseType("LowCardinality(Nullable(String))")).toBe("string");
  });

  it("maps strings, temporal, uuid, enum and composites", () => {
    expect(mapClickhouseType("String")).toBe("string");
    expect(mapClickhouseType("FixedString(2)")).toBe("string");
    expect(mapClickhouseType("Date")).toBe("date");
    expect(mapClickhouseType("Date32")).toBe("date");
    expect(mapClickhouseType("DateTime")).toBe("timestamp");
    expect(mapClickhouseType("DateTime64(3, 'UTC')")).toBe("timestamp");
    expect(mapClickhouseType("UUID")).toBe("uuid");
    expect(mapClickhouseType("Enum8('a' = 1)")).toBe("enum");
    expect(mapClickhouseType("Array(String)")).toBe("json");
    expect(mapClickhouseType("Map(String, UInt8)")).toBe("json");
    expect(mapClickhouseType("Tuple(String, UInt8)")).toBe("json");
    expect(mapClickhouseType("Nested(x UInt8)")).toBe("json");
  });

  it("falls back to unknown for unmapped types", () => {
    expect(mapClickhouseType("AggregateFunction(sum, UInt64)")).toBe("unknown");
  });

  it("normalizes a whole ClickHouse schema into canonical types", () => {
    const events = generateSchema(clickhouse).find((t) => t.name === "events") as TableSchema;
    expect(events.columns.map((c) => c.type)).toEqual([
      "bigint",
      "integer",
      "string",
      "json",
      "decimal",
      "json",
      "uuid",
      "timestamp",
      "date",
      "boolean",
    ]);
  });
});

describe("type mapping — PostgreSQL", () => {
  it("maps integers, booleans and numerics", () => {
    expect(mapPostgresType("integer")).toBe("integer");
    expect(mapPostgresType("bigint")).toBe("bigint");
    expect(mapPostgresType("smallint")).toBe("smallint");
    expect(mapPostgresType("serial")).toBe("integer");
    expect(mapPostgresType("boolean")).toBe("boolean");
    expect(mapPostgresType("numeric(10,2)")).toBe("decimal");
    expect(mapPostgresType("double precision")).toBe("float");
  });

  it("maps strings, temporal, json and uuid", () => {
    expect(mapPostgresType("character varying(255)")).toBe("string");
    expect(mapPostgresType("text")).toBe("text");
    expect(mapPostgresType("timestamp without time zone")).toBe("timestamp");
    expect(mapPostgresType("timestamp with time zone")).toBe("timestamp");
    expect(mapPostgresType("time without time zone")).toBe("time");
    expect(mapPostgresType("date")).toBe("date");
    expect(mapPostgresType("interval")).toBe("interval");
    expect(mapPostgresType("jsonb")).toBe("json");
    expect(mapPostgresType("uuid")).toBe("uuid");
    expect(mapPostgresType("bytea")).toBe("binary");
  });

  it("maps arrays and unknown types", () => {
    expect(mapPostgresType("integer[]")).toBe("json");
    expect(mapPostgresType("geography")).toBe("unknown");
  });
});
