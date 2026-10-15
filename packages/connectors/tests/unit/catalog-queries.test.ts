/**
 * Regression tests for the catalog queries of every engine.
 *
 * Each engine's introspection SQL is built with `@easysql/query-builder`; these
 * tests lock the compiled `{ text, values }` so a refactor cannot silently
 * change the SQL (or the parameters) an engine sends to its server. They need no
 * database: they only compile the builders.
 */

import { describe, expect, it } from "bun:test";
import * as clickhouse from "../../src/clickhouse/queries.js";
import * as d1 from "../../src/d1/queries.js";
import * as db2 from "../../src/db2/queries.js";
import * as duckdb from "../../src/duckdb/queries.js";
import * as firebird from "../../src/firebird/queries.js";
import * as hana from "../../src/hana/queries.js";
import * as libsql from "../../src/libsql/queries.js";
import * as oracle from "../../src/oracle/queries.js";
import * as snowflake from "../../src/snowflake/queries.js";
import * as sqlserver from "../../src/sqlserver/queries.js";
import * as trino from "../../src/trino/queries.js";

describe("DuckDB catalog queries", () => {
  it("lists tables, constraints and columns", () => {
    expect(duckdb.tablesQuery()).toEqual({
      text: `SELECT table_name, estimated_size FROM duckdb_tables() WHERE NOT (internal) AND database_name = current_database() AND schema_name = current_schema() ORDER BY table_name`,
      values: [],
    });
    expect(duckdb.constraintsQuery()).toEqual({
      text: `SELECT table_name, constraint_type, constraint_column_names, referenced_table, referenced_column_names FROM duckdb_constraints() WHERE database_name = current_database() AND schema_name = current_schema() ORDER BY table_name, constraint_index`,
      values: [],
    });
    expect(duckdb.columnsQuery("roles")).toEqual({
      text: `SELECT column_name, column_index, data_type, is_nullable, column_default FROM duckdb_columns() WHERE database_name = current_database() AND schema_name = current_schema() AND table_name = ? ORDER BY column_index`,
      values: ["roles"],
    });
  });
});

describe("libSQL catalog queries", () => {
  it("lists tables and counts rows, binding the table name", () => {
    expect(libsql.tablesQuery()).toEqual({
      text: `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      values: [],
    });
    expect(libsql.rowCountQuery("roles")).toEqual({
      text: `SELECT COUNT(*) AS c FROM "roles"`,
      values: [],
    });
  });
});

describe("D1 catalog queries", () => {
  it("lists tables through sqlite_master", () => {
    expect(d1.tablesQuery()).toEqual({
      text: `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      values: [],
    });
  });
});

describe("Trino catalog queries", () => {
  it("scopes to the current schema and inlines the table name", () => {
    expect(trino.tablesQuery()).toEqual({
      text: `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema AND table_type = 'BASE TABLE' ORDER BY table_name`,
      values: [],
    });
    expect(trino.columnsQuery("orders")).toEqual({
      text: `SELECT column_name, data_type, is_nullable, column_default, ordinal_position FROM information_schema.columns WHERE table_schema = current_schema AND table_name = 'orders' ORDER BY ordinal_position`,
      values: [],
    });
  });
});

describe("Snowflake catalog queries", () => {
  it("lists tables and joins column metadata with key constraints", () => {
    expect(snowflake.tablesQuery()).toEqual({
      text: `SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_CATALOG = CURRENT_DATABASE() AND TABLE_SCHEMA = CURRENT_SCHEMA() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
      values: [],
    });
    expect(snowflake.columnsQuery()).toEqual({
      text:
        `SELECT c.TABLE_NAME AS table_name, c.COLUMN_NAME AS column_name, c.DATA_TYPE AS data_type, c.IS_NULLABLE AS is_nullable, c.COLUMN_DEFAULT AS column_default, c.ORDINAL_POSITION AS ordinal_position, ` +
        `CASE WHEN pk.CONSTRAINT_TYPE IS NULL THEN 0 ELSE 1 END AS primary_key, fk.TABLE_NAME AS foreign_table, fk.COLUMN_NAME AS foreign_column ` +
        `FROM INFORMATION_SCHEMA.COLUMNS c ` +
        `LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON ku.TABLE_CATALOG = c.TABLE_CATALOG AND ku.TABLE_SCHEMA = c.TABLE_SCHEMA AND ku.TABLE_NAME = c.TABLE_NAME AND ku.COLUMN_NAME = c.COLUMN_NAME ` +
        `LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON pk.CONSTRAINT_CATALOG = ku.CONSTRAINT_CATALOG AND pk.CONSTRAINT_SCHEMA = ku.CONSTRAINT_SCHEMA AND pk.CONSTRAINT_NAME = ku.CONSTRAINT_NAME AND pk.CONSTRAINT_TYPE = 'PRIMARY KEY' ` +
        `LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk ON fk.CONSTRAINT_CATALOG = ku.CONSTRAINT_CATALOG AND fk.CONSTRAINT_SCHEMA = ku.CONSTRAINT_SCHEMA AND fk.CONSTRAINT_NAME = ku.CONSTRAINT_NAME AND fk.TABLE_NAME <> ku.TABLE_NAME ` +
        `WHERE c.TABLE_CATALOG = CURRENT_DATABASE() AND c.TABLE_SCHEMA = CURRENT_SCHEMA() ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`,
      values: [],
    });
  });
});

describe("SAP HANA catalog queries", () => {
  it("quotes aliases and uses the parenthesised current-schema keyword", () => {
    expect(hana.tablesQuery()).toEqual({
      text: `SELECT TABLE_NAME AS "table_name" FROM SYS.TABLES WHERE SCHEMA_NAME = CURRENT_SCHEMA AND IS_TEMPORARY = 'FALSE' ORDER BY TABLE_NAME`,
      values: [],
    });
    expect(hana.columnsQuery()).toEqual({
      text: `SELECT TABLE_NAME AS "table_name", COLUMN_NAME AS "column_name", DATA_TYPE_NAME AS "data_type", IS_NULLABLE AS "is_nullable", DEFAULT_VALUE AS "column_default", POSITION AS "ordinal" FROM SYS.TABLE_COLUMNS WHERE SCHEMA_NAME = CURRENT_SCHEMA ORDER BY TABLE_NAME, POSITION`,
      values: [],
    });
    expect(hana.primaryKeysQuery()).toEqual({
      text: `SELECT TABLE_NAME AS "table_name", COLUMN_NAME AS "column_name" FROM SYS.CONSTRAINTS WHERE SCHEMA_NAME = CURRENT_SCHEMA AND IS_PRIMARY_KEY = 'TRUE' ORDER BY TABLE_NAME, POSITION`,
      values: [],
    });
    expect(hana.foreignKeysQuery()).toEqual({
      text: `SELECT TABLE_NAME AS "table_name", COLUMN_NAME AS "column_name", REFERENCED_TABLE_NAME AS "ref_table", REFERENCED_COLUMN_NAME AS "ref_column" FROM SYS.REFERENTIAL_CONSTRAINTS WHERE SCHEMA_NAME = CURRENT_SCHEMA ORDER BY TABLE_NAME, POSITION`,
      values: [],
    });
    expect(hana.rowCountSources().map((q) => q.text)).toEqual([
      `SELECT TABLE_NAME AS "table_name", RECORD_COUNT AS "record_count" FROM SYS.M_TABLE_STATISTICS WHERE SCHEMA_NAME = CURRENT_SCHEMA`,
      `SELECT TABLE_NAME AS "table_name", RECORD_COUNT AS "record_count" FROM SYS.M_TABLES WHERE SCHEMA_NAME = CURRENT_SCHEMA`,
    ]);
  });
});

describe("IBM Db2 catalog queries", () => {
  it("uses the SQL-standard CURRENT SCHEMA keyword and quotes aliases", () => {
    expect(db2.tablesQuery()).toEqual({
      text: `SELECT TABNAME AS "table_name", CARD AS "rows_approx" FROM SYSCAT.TABLES WHERE TYPE = 'T' AND TABSCHEMA = CURRENT SCHEMA ORDER BY TABNAME`,
      values: [],
    });
    expect(db2.columnsQuery()).toEqual({
      text: `SELECT TABNAME AS "table_name", COLNAME AS "column_name", TYPENAME AS "data_type", "NULLS" AS "nulls", "DEFAULT" AS "column_default", COLNO AS "ordinal" FROM SYSCAT.COLUMNS WHERE TABSCHEMA = CURRENT SCHEMA ORDER BY TABNAME, COLNO`,
      values: [],
    });
    expect(db2.primaryKeysQuery()).toEqual({
      text: `SELECT k.TABNAME AS "table_name", k.COLNAME AS "column_name" FROM SYSCAT.KEYCOLUSE k INNER JOIN SYSCAT.TABCONST c ON c.CONSTNAME = k.CONSTNAME AND c.TABSCHEMA = k.TABSCHEMA AND c.TABNAME = k.TABNAME WHERE c.TYPE = 'P' AND k.TABSCHEMA = CURRENT SCHEMA ORDER BY k.TABNAME, k.COLNAME`,
      values: [],
    });
    expect(db2.foreignKeysQuery()).toEqual({
      text: `SELECT k.TABNAME AS "table_name", k.COLNAME AS "column_name", r.REFTABNAME AS "ref_table", rk.COLNAME AS "ref_column" FROM SYSCAT.KEYCOLUSE k INNER JOIN SYSCAT.TABCONST c ON c.CONSTNAME = k.CONSTNAME AND c.TABSCHEMA = k.TABSCHEMA AND c.TABNAME = k.TABNAME INNER JOIN SYSCAT.REFERENCES r ON r.CONSTNAME = c.CONSTNAME AND r.TABSCHEMA = c.TABSCHEMA AND r.TABNAME = c.TABNAME INNER JOIN SYSCAT.KEYCOLUSE rk ON rk.CONSTNAME = r.REFKEYNAME AND rk.TABSCHEMA = r.REFTABSCHEMA AND rk.TABNAME = r.REFTABNAME AND rk.COLSEQ = k.COLSEQ WHERE c.TYPE = 'F' AND k.TABSCHEMA = CURRENT SCHEMA ORDER BY k.TABNAME, k.COLNAME`,
      values: [],
    });
  });
});

describe("Oracle catalog queries", () => {
  it("resolves the current schema with SYS_CONTEXT and quotes aliases", () => {
    expect(oracle.tablesQuery()).toEqual({
      text: `SELECT t.TABLE_NAME AS "table_name", t.NUM_ROWS AS "rows_approx" FROM ALL_TABLES t WHERE t.OWNER = SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AND t.NESTED = 'NO' AND t.SECONDARY = 'NO' AND t.TABLE_NAME NOT LIKE 'BIN$%' ORDER BY t.TABLE_NAME`,
      values: [],
    });
    expect(oracle.columnsQuery()).toEqual({
      text: `SELECT c.TABLE_NAME AS "table_name", c.COLUMN_NAME AS "column_name", c.DATA_TYPE AS "data_type", c.NULLABLE AS "nullable", c.DATA_DEFAULT AS "data_default", c.COLUMN_ID AS "column_id" FROM ALL_TAB_COLUMNS c WHERE c.OWNER = SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AND c.HIDDEN_COLUMN = 'NO' ORDER BY c.TABLE_NAME, c.COLUMN_ID`,
      values: [],
    });
    expect(oracle.primaryKeysQuery()).toEqual({
      text: `SELECT cc.TABLE_NAME AS "table_name", cc.COLUMN_NAME AS "column_name" FROM ALL_CONSTRAINTS c INNER JOIN ALL_CONS_COLUMNS cc ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME WHERE c.OWNER = SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AND c.CONSTRAINT_TYPE = 'P' ORDER BY cc.TABLE_NAME, cc.POSITION`,
      values: [],
    });
    expect(oracle.foreignKeysQuery()).toEqual({
      text: `SELECT cc.TABLE_NAME AS "table_name", cc.COLUMN_NAME AS "column_name", rc.TABLE_NAME AS "foreign_table", rcc.COLUMN_NAME AS "foreign_column" FROM ALL_CONSTRAINTS c INNER JOIN ALL_CONS_COLUMNS cc ON cc.OWNER = c.OWNER AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME INNER JOIN ALL_CONSTRAINTS rc ON rc.OWNER = c.R_OWNER AND rc.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME INNER JOIN ALL_CONS_COLUMNS rcc ON rcc.OWNER = rc.OWNER AND rcc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND rcc.POSITION = cc.POSITION WHERE c.OWNER = SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AND c.CONSTRAINT_TYPE = 'R' ORDER BY cc.TABLE_NAME, cc.POSITION`,
      values: [],
    });
  });
});

describe("Firebird catalog queries", () => {
  it("trims catalog names and binds the table name", () => {
    expect(firebird.tablesQuery()).toEqual({
      text: `SELECT TRIM(r.RDB$RELATION_NAME) AS "table_name", r.RDB$STATISTICS AS "rows_approx" FROM RDB$RELATIONS r WHERE (r.RDB$SYSTEM_FLAG = 0 OR r.RDB$SYSTEM_FLAG IS NULL) AND r.RDB$VIEW_BLR IS NULL ORDER BY 1`,
      values: [],
    });
    expect(firebird.columnsQuery("T")).toEqual({
      text:
        `SELECT TRIM(rf.RDB$FIELD_NAME) AS "field_name", rf.RDB$FIELD_POSITION AS "field_position", rf.RDB$NULL_FLAG AS "null_flag", rf.RDB$DEFAULT_SOURCE AS "default_source", ` +
        `TRIM(ty.RDB$TYPE_NAME) AS "type_name", f.RDB$FIELD_TYPE AS "field_type", f.RDB$FIELD_SUB_TYPE AS "field_sub_type", f.RDB$CHARACTER_LENGTH AS "character_length", f.RDB$FIELD_LENGTH AS "field_length", f.RDB$FIELD_PRECISION AS "field_precision", f.RDB$FIELD_SCALE AS "field_scale", ` +
        `(SELECT COUNT(*) AS "c" FROM RDB$INDEX_SEGMENTS s INNER JOIN RDB$RELATION_CONSTRAINTS rc ON rc.RDB$INDEX_NAME = s.RDB$INDEX_NAME WHERE rc.RDB$RELATION_NAME = rf.RDB$RELATION_NAME AND rc.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY' AND s.RDB$FIELD_NAME = rf.RDB$FIELD_NAME) AS "pk" ` +
        `FROM RDB$RELATION_FIELDS rf INNER JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE LEFT JOIN RDB$TYPES ty ON ty.RDB$FIELD_NAME = 'RDB$FIELD_TYPE' AND ty.RDB$TYPE = f.RDB$FIELD_TYPE ` +
        `WHERE rf.RDB$RELATION_NAME = ? ORDER BY rf.RDB$FIELD_POSITION`,
      values: ["T"],
    });
    expect(firebird.foreignKeysQuery("T")).toEqual({
      text:
        `SELECT TRIM(fk.RDB$FIELD_NAME) AS "fk_column", TRIM(fk.RDB$RELATION_NAME) AS "ref_table", TRIM(refs.RDB$FIELD_NAME) AS "ref_column", fk.RDB$FIELD_POSITION AS "segment", TRIM(rc.RDB$CONSTRAINT_NAME) AS "fk_name" ` +
        `FROM RDB$RELATION_CONSTRAINTS rc ` +
        `INNER JOIN RDB$REF_CONSTRAINTS refc ON refc.RDB$CONSTRAINT_NAME = rc.RDB$CONSTRAINT_NAME ` +
        `INNER JOIN RDB$RELATION_CONSTRAINTS urc ON urc.RDB$CONSTRAINT_NAME = refc.RDB$CONST_NAME_UQ ` +
        `INNER JOIN RDB$INDEX_SEGMENTS fk ON fk.RDB$INDEX_NAME = rc.RDB$INDEX_NAME ` +
        `INNER JOIN RDB$INDEX_SEGMENTS refs ON refs.RDB$INDEX_NAME = urc.RDB$INDEX_NAME AND refs.RDB$FIELD_POSITION = fk.RDB$FIELD_POSITION ` +
        `WHERE rc.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY' AND rc.RDB$RELATION_NAME = ? ORDER BY rc.RDB$CONSTRAINT_NAME, fk.RDB$FIELD_POSITION`,
      values: ["T"],
    });
  });
});

describe("SQL Server catalog queries", () => {
  it("groups the table listing and keeps the OUTER APPLY for foreign keys", () => {
    expect(sqlserver.tablesQuery()).toEqual({
      text: `SELECT t.object_id AS table_id, s.name AS schema_name, t.name AS table_name, SUM(p.rows) AS rows_approx FROM sys.tables AS t INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id LEFT JOIN sys.partitions AS p ON p.object_id = t.object_id AND p.index_id IN (0, 1) WHERE t.is_ms_shipped = 0 GROUP BY t.object_id, s.name, t.name ORDER BY s.name, t.name, t.object_id`,
      values: [],
    });
    expect(sqlserver.columnsQuery()).toEqual({
      text:
        `SELECT t.object_id AS table_id, s.name AS schema_name, t.name AS table_name, c.name AS column_name, ty.name AS data_type, c.is_nullable AS is_nullable, dc.definition AS default_value, ` +
        `CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS is_primary_key, fk.referenced_table AS foreign_table, fk.referenced_column AS foreign_column, c.column_id AS ordinal ` +
        `FROM sys.tables AS t INNER JOIN sys.schemas AS s ON s.schema_id = t.schema_id INNER JOIN sys.columns AS c ON c.object_id = t.object_id INNER JOIN sys.types AS ty ON ty.user_type_id = c.user_type_id ` +
        `LEFT JOIN sys.default_constraints AS dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id ` +
        `LEFT JOIN (SELECT ic.object_id AS object_id, ic.column_id AS column_id FROM sys.indexes AS i INNER JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id WHERE i.is_primary_key = 1) AS pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id ` +
        `OUTER APPLY (SELECT TOP 1 ref_t.name AS referenced_table, ref_c.name AS referenced_column FROM sys.foreign_key_columns AS fkc INNER JOIN sys.tables AS ref_t ON ref_t.object_id = fkc.referenced_object_id INNER JOIN sys.columns AS ref_c ON ref_c.object_id = fkc.referenced_object_id AND ref_c.column_id = fkc.referenced_column_id WHERE fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id ORDER BY fkc.constraint_object_id, fkc.constraint_column_id) AS fk ` +
        `WHERE t.is_ms_shipped = 0 ORDER BY s.name, t.name, t.object_id, c.column_id`,
      values: [],
    });
  });
});

describe("ClickHouse catalog queries", () => {
  it("keeps the named {table:String} parameter for the column listing", () => {
    expect(clickhouse.tablesQuery()).toEqual({
      text: `SELECT name AS table_name, total_rows AS rows_approx FROM system.tables WHERE database = currentDatabase() AND engine NOT LIKE '%View' ORDER BY name`,
      values: [],
    });
    expect(clickhouse.columnsQuery()).toEqual({
      text: `SELECT name AS column_name, type AS data_type, default_expression AS column_default, is_in_primary_key AS is_primary, position AS ordinal FROM system.columns WHERE database = currentDatabase() AND table = {table:String} ORDER BY position`,
      values: [],
    });
  });
});
