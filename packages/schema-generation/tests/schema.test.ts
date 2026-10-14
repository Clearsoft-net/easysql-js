import { describe, expect, it } from "bun:test";
import type { RawSchema, TableSchema } from "../src/index";
import {
  generateSchema,
  mapClickhouseType,
  mapMysqlType,
  mapPostgresType,
  mapSqliteType,
} from "../src/index";
import {
  mapBigQueryType,
  mapD1Type,
  mapDb2Type,
  mapDuckDbType,
  mapFirebirdType,
  mapHanaType,
  mapLibSqlType,
  mapOracleType,
  mapSnowflakeType,
  mapSqlServerType,
  mapTrinoType,
  mapType,
} from "../src/type-map";
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

  it("falls back to name order when ordinals are missing or partial", () => {
    const partial: RawSchema = {
      engine: "sqlite",
      tables: [
        {
          name: "audit",
          columns: [
            { name: "zeta", dataType: "TEXT", nullable: true },
            // Only one column carries an ordinal: the pair cannot be ordered by
            // position, so the name order has to win for the whole table.
            { name: "alpha", dataType: "TEXT", nullable: true, ordinal: 2 },
          ],
        },
      ],
    };
    expect(generateSchema(partial)[0]?.columns.map((c) => c.name)).toEqual(["alpha", "zeta"]);
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

describe("type mapping — SQL Server", () => {
  it("maps integers, booleans and numerics", () => {
    expect(mapSqlServerType("int")).toBe("integer");
    expect(mapSqlServerType("BIGINT")).toBe("bigint");
    expect(mapSqlServerType("smallint")).toBe("smallint");
    expect(mapSqlServerType("tinyint")).toBe("smallint");
    expect(mapSqlServerType("bit")).toBe("boolean");
    expect(mapSqlServerType("decimal(10,2)")).toBe("decimal");
    expect(mapSqlServerType("numeric(38, 0)")).toBe("decimal");
    expect(mapSqlServerType("money")).toBe("decimal");
    expect(mapSqlServerType("smallmoney")).toBe("decimal");
    expect(mapSqlServerType("float")).toBe("float");
    expect(mapSqlServerType("real")).toBe("float");
  });

  it("maps strings, text and binary types", () => {
    expect(mapSqlServerType("varchar(255)")).toBe("string");
    expect(mapSqlServerType("nvarchar(max)")).toBe("string");
    expect(mapSqlServerType("sysname")).toBe("string");
    expect(mapSqlServerType("ntext")).toBe("text");
    expect(mapSqlServerType("xml")).toBe("text");
    expect(mapSqlServerType("varbinary(16)")).toBe("binary");
    expect(mapSqlServerType("image")).toBe("blob");
  });

  it("treats timestamp as the rowversion binary type, not a temporal type", () => {
    expect(mapSqlServerType("timestamp")).toBe("binary");
    expect(mapSqlServerType("rowversion")).toBe("binary");
  });

  it("maps temporal types, uniqueidentifier and sql_variant", () => {
    expect(mapSqlServerType("date")).toBe("date");
    expect(mapSqlServerType("time(7)")).toBe("time");
    expect(mapSqlServerType("datetime")).toBe("datetime");
    expect(mapSqlServerType("datetime2(3)")).toBe("datetime");
    expect(mapSqlServerType("smalldatetime")).toBe("datetime");
    expect(mapSqlServerType("datetimeoffset")).toBe("timestamp");
    expect(mapSqlServerType("uniqueidentifier")).toBe("uuid");
    expect(mapSqlServerType("sql_variant")).toBe("unknown");
  });

  it("falls back to unknown for unmapped types", () => {
    expect(mapSqlServerType("geography")).toBe("unknown");
    expect(mapSqlServerType("hierarchyid")).toBe("unknown");
  });
});

describe("type mapping — Oracle", () => {
  it("maps NUMBER by its declared precision", () => {
    expect(mapOracleType("NUMBER")).toBe("decimal");
    expect(mapOracleType("NUMBER(10,2)")).toBe("decimal");
    expect(mapOracleType("NUMBER(38)")).toBe("bigint");
    expect(mapOracleType("NUMBER(10)")).toBe("bigint");
    expect(mapOracleType("NUMBER(1)")).toBe("integer");
    expect(mapOracleType("FLOAT(126)")).toBe("float");
    expect(mapOracleType("BINARY_FLOAT")).toBe("float");
    expect(mapOracleType("BINARY_DOUBLE")).toBe("float");
  });

  it("maps strings, large text and binary types", () => {
    expect(mapOracleType("VARCHAR2(255)")).toBe("string");
    expect(mapOracleType("NVARCHAR2(100)")).toBe("string");
    expect(mapOracleType("CHAR(2)")).toBe("string");
    expect(mapOracleType("NCHAR(2)")).toBe("string");
    expect(mapOracleType("ROWID")).toBe("string");
    expect(mapOracleType("CLOB")).toBe("text");
    expect(mapOracleType("NCLOB")).toBe("text");
    expect(mapOracleType("LONG")).toBe("text");
    expect(mapOracleType("RAW(16)")).toBe("binary");
    expect(mapOracleType("LONG RAW")).toBe("binary");
    expect(mapOracleType("BLOB")).toBe("blob");
    expect(mapOracleType("BFILE")).toBe("blob");
  });

  it("maps DATE to datetime and the TIMESTAMP/INTERVAL variants", () => {
    expect(mapOracleType("DATE")).toBe("datetime");
    expect(mapOracleType("TIMESTAMP")).toBe("timestamp");
    expect(mapOracleType("TIMESTAMP(6)")).toBe("timestamp");
    expect(mapOracleType("TIMESTAMP WITH TIME ZONE")).toBe("timestamp");
    expect(mapOracleType("TIMESTAMP(6) WITH LOCAL TIME ZONE")).toBe("timestamp");
    expect(mapOracleType("INTERVAL DAY TO SECOND")).toBe("interval");
    expect(mapOracleType("INTERVAL YEAR(2) TO MONTH")).toBe("interval");
  });

  it("maps documents and falls back to unknown", () => {
    expect(mapOracleType("XMLTYPE")).toBe("json");
    expect(mapOracleType("JSON")).toBe("json");
    expect(mapOracleType("SDO_GEOMETRY")).toBe("unknown");
  });
});

describe("type mapping — Firebird", () => {
  it("maps integers, numerics and booleans", () => {
    expect(mapFirebirdType("SMALLINT")).toBe("smallint");
    expect(mapFirebirdType("INTEGER")).toBe("integer");
    expect(mapFirebirdType("BIGINT")).toBe("bigint");
    expect(mapFirebirdType("INT128")).toBe("bigint");
    expect(mapFirebirdType("NUMERIC(18,4)")).toBe("decimal");
    expect(mapFirebirdType("DECIMAL(9,2)")).toBe("decimal");
    expect(mapFirebirdType("FLOAT")).toBe("float");
    expect(mapFirebirdType("DOUBLE PRECISION")).toBe("float");
    expect(mapFirebirdType("BOOLEAN")).toBe("boolean");
  });

  it("maps strings and temporal types", () => {
    expect(mapFirebirdType("CHAR(10)")).toBe("string");
    expect(mapFirebirdType("VARCHAR(255)")).toBe("string");
    expect(mapFirebirdType("DATE")).toBe("date");
    expect(mapFirebirdType("TIME")).toBe("time");
    expect(mapFirebirdType("TIMESTAMP")).toBe("timestamp");
  });

  it("splits BLOB by its declared sub-type", () => {
    expect(mapFirebirdType("BLOB")).toBe("binary");
    expect(mapFirebirdType("BLOB SUB_TYPE 0")).toBe("binary");
    expect(mapFirebirdType("BLOB SUB_TYPE 10")).toBe("binary");
    expect(mapFirebirdType("BLOB SUB_TYPE 1")).toBe("text");
    expect(mapFirebirdType("BLOB SUB_TYPE TEXT")).toBe("text");
    expect(mapFirebirdType("BLOB SUB_TYPE 1 CHARACTER SET UTF8")).toBe("text");
  });

  it("falls back to unknown for unmapped types", () => {
    expect(mapFirebirdType("DECFLOAT(16)")).toBe("unknown");
  });
});

describe("type mapping — Db2", () => {
  it("maps integers, numerics and booleans", () => {
    expect(mapDb2Type("SMALLINT")).toBe("smallint");
    expect(mapDb2Type("INTEGER")).toBe("integer");
    expect(mapDb2Type("BIGINT")).toBe("bigint");
    expect(mapDb2Type("DECIMAL(31,2)")).toBe("decimal");
    expect(mapDb2Type("DECFLOAT(34)")).toBe("decimal");
    expect(mapDb2Type("REAL")).toBe("float");
    expect(mapDb2Type("DOUBLE")).toBe("float");
    expect(mapDb2Type("BOOLEAN")).toBe("boolean");
  });

  it("maps strings, graphic strings and large text", () => {
    expect(mapDb2Type("CHAR(10)")).toBe("string");
    expect(mapDb2Type("VARCHAR(255)")).toBe("string");
    expect(mapDb2Type("GRAPHIC(10)")).toBe("string");
    expect(mapDb2Type("VARGRAPHIC(255)")).toBe("string");
    expect(mapDb2Type("CLOB(1M)")).toBe("text");
    expect(mapDb2Type("DBCLOB(1M)")).toBe("text");
    expect(mapDb2Type("LONG VARCHAR")).toBe("text");
    expect(mapDb2Type("XML")).toBe("text");
  });

  it("maps binary and temporal types", () => {
    expect(mapDb2Type("BINARY(16)")).toBe("binary");
    expect(mapDb2Type("VARBINARY(255)")).toBe("binary");
    expect(mapDb2Type("BLOB(1M)")).toBe("blob");
    expect(mapDb2Type("DATE")).toBe("date");
    expect(mapDb2Type("TIME")).toBe("time");
    expect(mapDb2Type("TIMESTAMP(6)")).toBe("timestamp");
  });

  it("falls back to unknown for unmapped types", () => {
    expect(mapDb2Type("ARRAY")).toBe("unknown");
  });
});

describe("type mapping — DuckDB", () => {
  it("reuses the PostgreSQL mapping as its base", () => {
    expect(mapDuckDbType("INTEGER")).toBe("integer");
    expect(mapDuckDbType("BIGINT")).toBe("bigint");
    expect(mapDuckDbType("SMALLINT")).toBe("smallint");
    expect(mapDuckDbType("BOOLEAN")).toBe("boolean");
    expect(mapDuckDbType("DECIMAL(18,3)")).toBe("decimal");
    expect(mapDuckDbType("DOUBLE PRECISION")).toBe("float");
    expect(mapDuckDbType("VARCHAR(255)")).toBe("string");
    expect(mapDuckDbType("TEXT")).toBe("text");
    expect(mapDuckDbType("BLOB")).toBe("binary");
    expect(mapDuckDbType("DATE")).toBe("date");
    expect(mapDuckDbType("UUID")).toBe("uuid");
    expect(mapDuckDbType("INTERVAL")).toBe("interval");
  });

  it("maps the DuckDB-specific integer widths", () => {
    expect(mapDuckDbType("HUGEINT")).toBe("bigint");
    expect(mapDuckDbType("UHUGEINT")).toBe("bigint");
    expect(mapDuckDbType("UBIGINT")).toBe("bigint");
    expect(mapDuckDbType("UTINYINT")).toBe("smallint");
    expect(mapDuckDbType("USMALLINT")).toBe("smallint");
    expect(mapDuckDbType("UINTEGER")).toBe("integer");
  });

  it("maps timestamp variants and BIT", () => {
    expect(mapDuckDbType("TIMESTAMP WITH TIME ZONE")).toBe("timestamp");
    expect(mapDuckDbType("TIMESTAMP_NS")).toBe("timestamp");
    expect(mapDuckDbType("TIMESTAMP_MS")).toBe("timestamp");
    expect(mapDuckDbType("TIMESTAMP_S")).toBe("timestamp");
    expect(mapDuckDbType("BIT")).toBe("string");
  });

  it("collapses nested types and lists to json", () => {
    expect(mapDuckDbType("STRUCT(a INTEGER)")).toBe("json");
    expect(mapDuckDbType("MAP(VARCHAR, INTEGER)")).toBe("json");
    expect(mapDuckDbType("LIST(INTEGER)")).toBe("json");
    expect(mapDuckDbType("UNION(a INTEGER)")).toBe("json");
    expect(mapDuckDbType("INTEGER[]")).toBe("json");
  });

  it("falls back to unknown for unmapped types", () => {
    expect(mapDuckDbType("GEOMETRY")).toBe("unknown");
  });
});

describe("type mapping — libSQL", () => {
  it("delegates to the SQLite affinity rules", () => {
    expect(mapLibSqlType("INTEGER")).toBe("integer");
    expect(mapLibSqlType("VARCHAR(255)")).toBe("text");
    expect(mapLibSqlType("TEXT")).toBe("text");
    expect(mapLibSqlType("REAL")).toBe("float");
    expect(mapLibSqlType("NUMERIC")).toBe("decimal");
    expect(mapLibSqlType("BOOLEAN")).toBe("boolean");
    expect(mapLibSqlType("JSON")).toBe("json");
    expect(mapLibSqlType("UUID")).toBe("uuid");
    expect(mapLibSqlType("")).toBe("blob");
  });

  it("returns the same result as mapSqliteType", () => {
    for (const declared of ["INTEGER", "VARCHAR(255)", "DATETIME", "BLOB", "NUMERIC"]) {
      expect(mapLibSqlType(declared)).toBe(mapSqliteType(declared));
    }
  });
});

describe("type mapping — D1", () => {
  it("delegates to the SQLite affinity rules", () => {
    expect(mapD1Type("INTEGER")).toBe("integer");
    expect(mapD1Type("VARCHAR(255)")).toBe("text");
    expect(mapD1Type("TEXT")).toBe("text");
    expect(mapD1Type("REAL")).toBe("float");
    expect(mapD1Type("NUMERIC")).toBe("decimal");
    expect(mapD1Type("BOOLEAN")).toBe("boolean");
    expect(mapD1Type("JSON")).toBe("json");
    expect(mapD1Type("UUID")).toBe("uuid");
    expect(mapD1Type("")).toBe("blob");
  });

  it("returns the same result as mapSqliteType", () => {
    for (const declared of ["INTEGER", "VARCHAR(255)", "DATETIME", "BLOB", "NUMERIC"]) {
      expect(mapD1Type(declared)).toBe(mapSqliteType(declared));
    }
  });
});

describe("type mapping — Snowflake", () => {
  it("collapses the NUMBER family to decimal", () => {
    expect(mapSnowflakeType("NUMBER(38,0)")).toBe("decimal");
    expect(mapSnowflakeType("DECIMAL(10,2)")).toBe("decimal");
    expect(mapSnowflakeType("INTEGER")).toBe("decimal");
    expect(mapSnowflakeType("BIGINT")).toBe("decimal");
    expect(mapSnowflakeType("FLOAT")).toBe("float");
    expect(mapSnowflakeType("DOUBLE")).toBe("float");
    expect(mapSnowflakeType("REAL")).toBe("float");
  });

  it("maps strings, binary and booleans", () => {
    expect(mapSnowflakeType("VARCHAR(16777216)")).toBe("string");
    expect(mapSnowflakeType("CHAR(2)")).toBe("string");
    expect(mapSnowflakeType("STRING")).toBe("string");
    expect(mapSnowflakeType("TEXT")).toBe("text");
    expect(mapSnowflakeType("BINARY(16)")).toBe("binary");
    expect(mapSnowflakeType("VARBINARY(16)")).toBe("binary");
    expect(mapSnowflakeType("BOOLEAN")).toBe("boolean");
  });

  it("maps temporal and semi-structured types", () => {
    expect(mapSnowflakeType("DATE")).toBe("date");
    expect(mapSnowflakeType("TIME(9)")).toBe("time");
    expect(mapSnowflakeType("TIMESTAMP")).toBe("timestamp");
    expect(mapSnowflakeType("TIMESTAMP_NTZ(9)")).toBe("timestamp");
    expect(mapSnowflakeType("TIMESTAMP_LTZ")).toBe("timestamp");
    expect(mapSnowflakeType("TIMESTAMP_TZ")).toBe("timestamp");
    expect(mapSnowflakeType("VARIANT")).toBe("json");
    expect(mapSnowflakeType("OBJECT")).toBe("json");
    expect(mapSnowflakeType("ARRAY")).toBe("json");
  });

  it("falls back to unknown for geospatial types", () => {
    expect(mapSnowflakeType("GEOGRAPHY")).toBe("unknown");
    expect(mapSnowflakeType("GEOMETRY")).toBe("unknown");
  });
});

describe("type mapping — BigQuery", () => {
  it("maps integers, numerics and booleans", () => {
    expect(mapBigQueryType("INT64")).toBe("bigint");
    expect(mapBigQueryType("INTEGER")).toBe("bigint");
    expect(mapBigQueryType("FLOAT64")).toBe("float");
    expect(mapBigQueryType("FLOAT")).toBe("float");
    expect(mapBigQueryType("NUMERIC")).toBe("decimal");
    expect(mapBigQueryType("BIGNUMERIC")).toBe("decimal");
    expect(mapBigQueryType("BOOL")).toBe("boolean");
    expect(mapBigQueryType("BOOLEAN")).toBe("boolean");
  });

  it("maps strings, binary and temporal types", () => {
    expect(mapBigQueryType("STRING")).toBe("string");
    expect(mapBigQueryType("BYTES")).toBe("binary");
    expect(mapBigQueryType("DATE")).toBe("date");
    expect(mapBigQueryType("TIME")).toBe("time");
    expect(mapBigQueryType("DATETIME")).toBe("datetime");
    expect(mapBigQueryType("TIMESTAMP")).toBe("timestamp");
    expect(mapBigQueryType("JSON")).toBe("json");
  });

  it("collapses nested types to json and geospatial to unknown", () => {
    expect(mapBigQueryType("ARRAY")).toBe("json");
    expect(mapBigQueryType("ARRAY<INT64>")).toBe("json");
    expect(mapBigQueryType("STRUCT")).toBe("json");
    expect(mapBigQueryType("RECORD")).toBe("json");
    expect(mapBigQueryType("GEOGRAPHY")).toBe("unknown");
  });
});

describe("type mapping — Trino", () => {
  it("maps booleans, integers and numerics", () => {
    expect(mapTrinoType("BOOLEAN")).toBe("boolean");
    expect(mapTrinoType("TINYINT")).toBe("smallint");
    expect(mapTrinoType("SMALLINT")).toBe("smallint");
    expect(mapTrinoType("INTEGER")).toBe("integer");
    expect(mapTrinoType("BIGINT")).toBe("bigint");
    expect(mapTrinoType("REAL")).toBe("float");
    expect(mapTrinoType("DOUBLE")).toBe("float");
    expect(mapTrinoType("DECIMAL(38,10)")).toBe("decimal");
  });

  it("maps strings, binary, identifiers and network types", () => {
    expect(mapTrinoType("VARCHAR(255)")).toBe("string");
    expect(mapTrinoType("CHAR(2)")).toBe("string");
    expect(mapTrinoType("VARBINARY")).toBe("binary");
    expect(mapTrinoType("UUID")).toBe("uuid");
    expect(mapTrinoType("IPADDRESS")).toBe("string");
    expect(mapTrinoType("IPPREFIX")).toBe("string");
    expect(mapTrinoType("JSON")).toBe("json");
  });

  it("maps temporal and interval types", () => {
    expect(mapTrinoType("DATE")).toBe("date");
    expect(mapTrinoType("TIME")).toBe("time");
    expect(mapTrinoType("TIME(3) WITH TIME ZONE")).toBe("time");
    expect(mapTrinoType("TIMESTAMP")).toBe("timestamp");
    expect(mapTrinoType("TIMESTAMP(3) WITH TIME ZONE")).toBe("timestamp");
    expect(mapTrinoType("INTERVAL YEAR TO MONTH")).toBe("interval");
    expect(mapTrinoType("INTERVAL DAY TO SECOND")).toBe("interval");
  });

  it("collapses nested types to json and falls back to unknown", () => {
    expect(mapTrinoType("ARRAY(BIGINT)")).toBe("json");
    expect(mapTrinoType("MAP(VARCHAR, BIGINT)")).toBe("json");
    expect(mapTrinoType("ROW(a BIGINT, b VARCHAR)")).toBe("json");
    expect(mapTrinoType("GEOMETRY")).toBe("unknown");
  });
});

describe("type mapping — SAP HANA", () => {
  it("maps integers, numerics and booleans", () => {
    expect(mapHanaType("TINYINT")).toBe("smallint");
    expect(mapHanaType("SMALLINT")).toBe("smallint");
    expect(mapHanaType("INTEGER")).toBe("integer");
    expect(mapHanaType("BIGINT")).toBe("bigint");
    expect(mapHanaType("DECIMAL(18,2)")).toBe("decimal");
    expect(mapHanaType("SMALLDECIMAL")).toBe("decimal");
    expect(mapHanaType("REAL")).toBe("float");
    expect(mapHanaType("DOUBLE")).toBe("float");
    expect(mapHanaType("BOOLEAN")).toBe("boolean");
  });

  it("maps strings and large text", () => {
    expect(mapHanaType("CHAR(10)")).toBe("string");
    expect(mapHanaType("NCHAR(10)")).toBe("string");
    expect(mapHanaType("VARCHAR(255)")).toBe("string");
    expect(mapHanaType("NVARCHAR(255)")).toBe("string");
    expect(mapHanaType("ALPHANUM(10)")).toBe("string");
    expect(mapHanaType("SHORTTEXT(100)")).toBe("text");
    expect(mapHanaType("TEXT")).toBe("text");
    expect(mapHanaType("CLOB")).toBe("text");
    expect(mapHanaType("NCLOB")).toBe("text");
  });

  it("maps binary and temporal types", () => {
    expect(mapHanaType("BINARY(16)")).toBe("binary");
    expect(mapHanaType("VARBINARY(255)")).toBe("binary");
    expect(mapHanaType("BLOB")).toBe("blob");
    expect(mapHanaType("DATE")).toBe("date");
    expect(mapHanaType("TIME")).toBe("time");
    expect(mapHanaType("SECONDDATE")).toBe("datetime");
    expect(mapHanaType("TIMESTAMP")).toBe("timestamp");
  });

  it("maps ARRAY to json and geospatial to unknown", () => {
    expect(mapHanaType("ARRAY")).toBe("json");
    expect(mapHanaType("ARRAY(INTEGER)")).toBe("json");
    expect(mapHanaType("ST_GEOMETRY")).toBe("unknown");
  });
});

describe("type mapping — engine dispatch", () => {
  it("routes each engine to its own mapper", () => {
    expect(mapType("mysql", "tinyint(1)")).toBe("boolean");
    expect(mapType("mariadb", "varchar(255)")).toBe("string");
    expect(mapType("sqlite", "INTEGER")).toBe("integer");
    expect(mapType("postgresql", "jsonb")).toBe("json");
    expect(mapType("clickhouse", "Nullable(String)")).toBe("string");
    expect(mapType("sqlserver", "uniqueidentifier")).toBe("uuid");
    expect(mapType("oracle", "VARCHAR2(10)")).toBe("string");
    expect(mapType("firebird", "BLOB SUB_TYPE TEXT")).toBe("text");
    expect(mapType("db2", "DBCLOB(1M)")).toBe("text");
    expect(mapType("duckdb", "HUGEINT")).toBe("bigint");
    expect(mapType("libsql", "VARCHAR(255)")).toBe("text");
    expect(mapType("d1", "INTEGER")).toBe("integer");
    expect(mapType("snowflake", "VARIANT")).toBe("json");
    expect(mapType("bigquery", "INT64")).toBe("bigint");
    expect(mapType("trino", "IPPREFIX")).toBe("string");
    expect(mapType("hana", "SECONDDATE")).toBe("datetime");
  });
});
