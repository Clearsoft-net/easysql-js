/**
 * Map engine-native types into the canonical vocabulary.
 *
 *   bun run samples/02-schema-type-mapping.ts
 */

import { mapMysqlType, mapPostgresType, mapSqliteType } from "@easysql/schema-generation";
import { log } from "./_shared";

log("MySQL / MariaDB", {
  int: mapMysqlType("int"),
  bigint: mapMysqlType("bigint"),
  "tinyint(1)": mapMysqlType("tinyint(1)"),
  "decimal(10,2)": mapMysqlType("decimal(10,2)"),
  "varchar(255)": mapMysqlType("varchar(255)"),
  longtext: mapMysqlType("longtext"),
  json: mapMysqlType("json"),
  "enum('a','b')": mapMysqlType("enum('a','b')"),
  "geometry (unmapped)": mapMysqlType("geometry"),
});

log("PostgreSQL", {
  integer: mapPostgresType("integer"),
  serial: mapPostgresType("serial"),
  "numeric(10,2)": mapPostgresType("numeric(10,2)"),
  "character varying(255)": mapPostgresType("character varying(255)"),
  "timestamp without time zone": mapPostgresType("timestamp without time zone"),
  timestamptz: mapPostgresType("timestamptz"),
  jsonb: mapPostgresType("jsonb"),
  uuid: mapPostgresType("uuid"),
  "integer[] (array)": mapPostgresType("integer[]"),
  "geography (unmapped)": mapPostgresType("geography"),
});

log("SQLite (declared-type affinity)", {
  INTEGER: mapSqliteType("INTEGER"),
  "VARCHAR(255)": mapSqliteType("VARCHAR(255)"),
  REAL: mapSqliteType("REAL"),
  NUMERIC: mapSqliteType("NUMERIC"),
  BOOLEAN: mapSqliteType("BOOLEAN"),
  DATETIME: mapSqliteType("DATETIME"),
  '"" (no type)': mapSqliteType(""),
});
