/**
 * Engine-native type → canonical {@link SchemaType} maps.
 *
 * The maps are exhaustive over the types the connectors are expected to report;
 * anything else falls back to `"unknown"` so output never depends on an
 * engine-specific spelling. Matching is case-insensitive, ignores length and
 * precision parameters (`varchar(255)` → `varchar`) and, for SQLite, follows
 * the declared-type affinity rules from the SQLite documentation.
 */

import type { ConnectorEngine, SchemaType } from "./types.js";

const MYSQL_TYPES: Record<string, SchemaType> = {
  // integers
  tinyint: "smallint",
  smallint: "smallint",
  mediumint: "integer",
  int: "integer",
  integer: "integer",
  bigint: "bigint",
  bit: "integer",
  year: "integer",
  // booleans
  bool: "boolean",
  boolean: "boolean",
  // numerics
  decimal: "decimal",
  dec: "decimal",
  numeric: "decimal",
  fixed: "decimal",
  float: "float",
  double: "float",
  real: "float",
  // strings
  char: "string",
  varchar: "string",
  tinytext: "text",
  text: "text",
  mediumtext: "text",
  longtext: "text",
  enum: "enum",
  set: "enum",
  // binary
  binary: "binary",
  varbinary: "binary",
  tinyblob: "blob",
  blob: "blob",
  mediumblob: "blob",
  longblob: "blob",
  // temporal
  date: "date",
  time: "time",
  datetime: "datetime",
  timestamp: "timestamp",
  // documents
  json: "json",
  uuid: "uuid",
};

/**
 * Maps a MySQL/MariaDB native type to the canonical vocabulary. `tinyint(1)` is
 * the conventional boolean and is mapped to `boolean` explicitly.
 */
export function mapMysqlType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (normalized === "tinyint" && /^tinyint\s*\(\s*1\s*\)/i.test(raw.trim())) {
    return "boolean";
  }
  return MYSQL_TYPES[normalized] ?? "unknown";
}

/**
 * Maps a SQLite declared type to the canonical vocabulary. SQLite uses dynamic
 * typing with five storage classes; the declared type is reduced to its
 * affinity first, then refined when the declaration names a more specific type
 * (`DATE`, `DATETIME`, `BOOLEAN`, `JSON`, `UUID`).
 */
export function mapSqliteType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (normalized.length === 0) return "blob";

  if (/\b(uuid|guid)\b/.test(normalized)) return "uuid";
  if (/\b(json|jsonb)\b/.test(normalized)) return "json";
  if (/\b(bool|boolean)\b/.test(normalized)) return "boolean";
  if (/\b(timestamp|datetime)\b/.test(normalized)) return "datetime";
  if (/\bdate\b/.test(normalized)) return "date";
  if (/\btime\b/.test(normalized)) return "time";

  // SQLite affinity rules (https://sqlite.org/datatype3.html#affname).
  if (normalized.includes("int")) return "integer";
  if (/(char|clob|text)/.test(normalized)) return "text";
  if (normalized.includes("blob")) return "blob";
  if (/(real|floa|doub)/.test(normalized)) return "float";
  return "decimal"; // NUMERIC affinity
}

const POSTGRES_TYPES: Record<string, SchemaType> = {
  // integers
  smallint: "smallint",
  int2: "smallint",
  smallserial: "smallint",
  serial2: "smallint",
  integer: "integer",
  int: "integer",
  int4: "integer",
  serial: "integer",
  serial4: "integer",
  bigint: "bigint",
  int8: "bigint",
  bigserial: "bigint",
  serial8: "bigint",
  // booleans
  boolean: "boolean",
  bool: "boolean",
  // numerics
  numeric: "decimal",
  decimal: "decimal",
  money: "decimal",
  real: "float",
  float4: "float",
  "double precision": "float",
  float8: "float",
  // strings
  "character varying": "string",
  varchar: "string",
  character: "string",
  char: "string",
  bpchar: "string",
  name: "string",
  citext: "string",
  text: "text",
  xml: "text",
  // network / identifiers kept as text
  inet: "string",
  cidr: "string",
  macaddr: "string",
  macaddr8: "string",
  // binary
  bytea: "binary",
  // temporal
  date: "date",
  time: "time",
  timetz: "time",
  timestamp: "timestamp",
  timestamptz: "timestamp",
  interval: "interval",
  // documents
  json: "json",
  jsonb: "json",
  uuid: "uuid",
};

/**
 * Maps a PostgreSQL type (as reported by `format_type`) to the canonical
 * vocabulary. Variants such as `timestamp with time zone` collapse to the same
 * storage class, and arrays are mapped to `json`.
 */
export function mapPostgresType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (normalized.endsWith("[]")) return "json";
  if (normalized === "timestamp with time zone" || normalized === "timestamp without time zone") {
    return "timestamp";
  }
  if (normalized === "time with time zone" || normalized === "time without time zone") {
    return "time";
  }
  return POSTGRES_TYPES[normalized] ?? "unknown";
}

const CLICKHOUSE_TYPES: Record<string, SchemaType> = {
  // integers
  int8: "smallint",
  int16: "smallint",
  int32: "integer",
  int64: "bigint",
  int128: "bigint",
  int256: "bigint",
  uint8: "smallint",
  uint16: "smallint",
  uint32: "integer",
  uint64: "bigint",
  uint128: "bigint",
  uint256: "bigint",
  // booleans
  bool: "boolean",
  boolean: "boolean",
  // numerics
  float32: "float",
  float64: "float",
  decimal: "decimal",
  decimal32: "decimal",
  decimal64: "decimal",
  decimal128: "decimal",
  decimal256: "decimal",
  // strings
  string: "string",
  fixedstring: "string",
  // network / identifiers kept as text
  ipv4: "string",
  ipv6: "string",
  // temporal
  date: "date",
  date32: "date",
  datetime: "timestamp",
  datetime64: "timestamp",
  // documents
  uuid: "uuid",
  json: "json",
  object: "json",
  enum8: "enum",
  enum16: "enum",
};

/**
 * Maps a ClickHouse type (as reported by `system.columns.type`) to the canonical
 * vocabulary. The type string carries wrappers inline, so `Nullable(T)` and
 * `LowCardinality(T)` are unwrapped before the lookup, and the composite types
 * (`Array`, `Map`, `Tuple`, `Nested`) collapse to `json`.
 */
export function mapClickhouseType(raw: string): SchemaType {
  const nullable = unwrap(raw, "Nullable");
  if (nullable !== null) return mapClickhouseType(nullable);
  const lowCardinality = unwrap(raw, "LowCardinality");
  if (lowCardinality !== null) return mapClickhouseType(lowCardinality);

  const normalized = normalize(raw);
  if (/^(array|map|tuple|nested)\b/.test(normalized)) return "json";
  return CLICKHOUSE_TYPES[normalized] ?? "unknown";
}

const SQLSERVER_TYPES: Record<string, SchemaType> = {
  // integers
  tinyint: "smallint",
  smallint: "smallint",
  int: "integer",
  bigint: "bigint",
  // booleans — `bit` is the only real boolean; `tinyint` is an unsigned byte.
  bit: "boolean",
  // numerics
  decimal: "decimal",
  numeric: "decimal",
  money: "decimal",
  smallmoney: "decimal",
  float: "float",
  real: "float",
  // strings
  char: "string",
  varchar: "string",
  nchar: "string",
  nvarchar: "string",
  sysname: "string",
  text: "text",
  ntext: "text",
  xml: "text",
  // binary — `timestamp` is the deprecated rowversion alias, not a temporal type.
  binary: "binary",
  varbinary: "binary",
  timestamp: "binary",
  rowversion: "binary",
  image: "blob",
  // temporal
  date: "date",
  time: "time",
  datetime: "datetime",
  datetime2: "datetime",
  smalldatetime: "datetime",
  datetimeoffset: "timestamp",
  // identifiers / documents
  uniqueidentifier: "uuid",
  sql_variant: "unknown",
};

/**
 * Maps a SQL Server native type to the canonical vocabulary. Two quirks matter:
 * `timestamp` is an 8-byte rowversion and therefore binary, not temporal, and
 * `uniqueidentifier` is the engine's UUID spelling.
 */
export function mapSqlServerType(raw: string): SchemaType {
  return SQLSERVER_TYPES[normalize(raw)] ?? "unknown";
}

const ORACLE_TYPES: Record<string, SchemaType> = {
  // numerics
  number: "decimal",
  decimal: "decimal",
  numeric: "decimal",
  dec: "decimal",
  float: "float",
  binary_float: "float",
  binary_double: "float",
  // strings
  varchar2: "string",
  nvarchar2: "string",
  varchar: "string",
  nvarchar: "string",
  char: "string",
  nchar: "string",
  rowid: "string",
  urowid: "string",
  // large text
  clob: "text",
  nclob: "text",
  long: "text",
  // binary
  blob: "blob",
  bfile: "blob",
  raw: "binary",
  "long raw": "binary",
  // temporal — Oracle `DATE` carries a time-of-day component.
  date: "datetime",
  timestamp: "timestamp",
  "timestamp with time zone": "timestamp",
  "timestamp with local time zone": "timestamp",
  // intervals
  interval: "interval",
  "interval year to month": "interval",
  "interval day to second": "interval",
  // documents
  xmltype: "json",
  json: "json",
};

/**
 * Maps an Oracle native type to the canonical vocabulary.
 *
 * `NUMBER` is a single arbitrary-precision type used for both fractional and
 * integral columns, so the declared precision/scale is inspected: an unscaled
 * `NUMBER(p)` with `p <= 38` is an integer surrogate (`NUMBER(1..4/5)` →
 * `integer`, anything wider → `bigint`), while bare `NUMBER`, `NUMBER(p, s)`
 * and `NUMBER(p, 0)` stay `decimal` to preserve exactness. Oracle `DATE` stores
 * a time component, so it maps to `datetime` rather than `date`.
 */
export function mapOracleType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (normalized === "number") {
    const declared = /^number\s*\(\s*(\d+)\s*\)/i.exec(raw.trim());
    if (declared) {
      const precision = Number.parseInt(declared[1] as string, 10);
      return precision <= 4 ? "integer" : "bigint";
    }
  }
  return ORACLE_TYPES[normalized] ?? "unknown";
}

const FIREBIRD_TYPES: Record<string, SchemaType> = {
  // integers
  smallint: "smallint",
  integer: "integer",
  bigint: "bigint",
  int128: "bigint",
  // numerics
  numeric: "decimal",
  decimal: "decimal",
  float: "float",
  "double precision": "float",
  // strings
  char: "string",
  varchar: "string",
  // temporal
  date: "date",
  time: "time",
  timestamp: "timestamp",
  // booleans
  boolean: "boolean",
};

/**
 * Maps a Firebird native type to the canonical vocabulary. `BLOB` is split by
 * its declared sub-type: sub-type 1 (TEXT) and character-set text blobs map to
 * `text`, everything else (sub-type 0, BINARY) maps to `binary`. `INT128` is
 * Firebird 4's 128-bit integer and collapses to `bigint`.
 */
export function mapFirebirdType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (normalized === "blob" || normalized.startsWith("blob ")) {
    // Sub-type 1 is the TEXT blob; a declared character set also implies text.
    return /\bsub_type\s*1(?:\D|$)|\btext\b/.test(normalized) ? "text" : "binary";
  }
  return FIREBIRD_TYPES[normalized] ?? "unknown";
}

const DB2_TYPES: Record<string, SchemaType> = {
  // integers
  smallint: "smallint",
  integer: "integer",
  int: "integer",
  bigint: "bigint",
  // numerics
  decimal: "decimal",
  numeric: "decimal",
  decfloat: "decimal",
  real: "float",
  double: "float",
  "double precision": "float",
  float: "float",
  // strings
  char: "string",
  varchar: "string",
  graphic: "string",
  vargraphic: "string",
  // large text
  clob: "text",
  dbclob: "text",
  "long varchar": "text",
  // binary
  binary: "binary",
  varbinary: "binary",
  blob: "blob",
  // temporal
  date: "date",
  time: "time",
  timestamp: "timestamp",
  // documents / booleans
  xml: "text",
  boolean: "boolean",
};

/**
 * Maps a Db2 native type to the canonical vocabulary. Db2 keeps the SQL
 * `GRAPHIC`/`VARGRAPHIC` double-byte strings (mapped to `string`), the
 * `DBCLOB` double-byte LOB (mapped to `text`) and treats `XML` as text.
 */
export function mapDb2Type(raw: string): SchemaType {
  return DB2_TYPES[normalize(raw)] ?? "unknown";
}

const DUCKDB_TYPES: Record<string, SchemaType> = {
  // integers wider than the PostgreSQL vocabulary
  hugeint: "bigint",
  uhugeint: "bigint",
  ubigint: "bigint",
  utinyint: "smallint",
  usmallint: "smallint",
  uinteger: "integer",
  // unsigned aliases
  uint8: "smallint",
  uint16: "smallint",
  uint32: "integer",
  uint64: "bigint",
  // temporal variants
  "timestamp with time zone": "timestamp",
  timestamptz: "timestamp",
  timestamp_ns: "timestamp",
  timestamp_ms: "timestamp",
  timestamp_s: "timestamp",
  timetz: "time",
  // binary — DuckDB spells the PostgreSQL `bytea` as `BLOB`.
  blob: "binary",
  bytea: "binary",
  // strings / documents
  bit: "string",
  varchar: "string",
  json: "json",
};

/**
 * Maps a DuckDB native type to the canonical vocabulary.
 *
 * DuckDB is PostgreSQL-flavoured, so {@link mapPostgresType} is the base and
 * only DuckDB-specific spellings are layered on top: unsigned and 128-bit
 * integers (`UBIGINT`, `HUGEINT`, …), the timestamp precision variants
 * (`TIMESTAMP_NS`/`_MS`/`_S`, `TIMESTAMPTZ`), `BIT` strings, and the nested
 * types (`STRUCT`, `MAP`, `LIST`, `UNION`, `T[]`), which collapse to `json`
 * exactly like PostgreSQL arrays.
 */
export function mapDuckDbType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (/^(struct|map|list|union)\b/.test(normalized)) return "json";
  if (normalized.endsWith("[]")) return "json";
  return DUCKDB_TYPES[normalized] ?? mapPostgresType(raw);
}

/**
 * Maps a libSQL/Turso declared type to the canonical vocabulary. libSQL speaks
 * the SQLite dialect and uses the same dynamic typing and affinity rules, so
 * this delegates to {@link mapSqliteType}.
 */
export function mapLibSqlType(raw: string): SchemaType {
  return mapSqliteType(raw);
}

/**
 * Maps a Cloudflare D1 declared type to the canonical vocabulary. D1 is SQLite
 * at the storage layer, so this delegates to {@link mapSqliteType}.
 */
export function mapD1Type(raw: string): SchemaType {
  return mapSqliteType(raw);
}

const SNOWFLAKE_TYPES: Record<string, SchemaType> = {
  // numerics — Snowflake folds INTEGER/BIGINT into NUMBER.
  number: "decimal",
  decimal: "decimal",
  numeric: "decimal",
  int: "decimal",
  integer: "decimal",
  bigint: "decimal",
  smallint: "decimal",
  tinyint: "decimal",
  float: "float",
  float4: "float",
  float8: "float",
  double: "float",
  "double precision": "float",
  real: "float",
  // strings
  varchar: "string",
  char: "string",
  character: "string",
  string: "string",
  text: "text",
  // binary
  binary: "binary",
  varbinary: "binary",
  // booleans
  boolean: "boolean",
  bool: "boolean",
  // temporal
  date: "date",
  time: "time",
  timestamp: "timestamp",
  timestamp_ntz: "timestamp",
  timestamp_ltz: "timestamp",
  timestamp_tz: "timestamp",
  datetime: "timestamp",
  // semi-structured
  variant: "json",
  object: "json",
  array: "json",
  // geospatial has no canonical equivalent
  geography: "unknown",
  geometry: "unknown",
};

/**
 * Maps a Snowflake native type to the canonical vocabulary. Snowflake has a
 * single `NUMBER` family for every exact numeric (including `INTEGER`/`BIGINT`
 * spellings), so those collapse to `decimal`; the three timestamp flavours
 * (`NTZ`/`LTZ`/`TZ`) all map to `timestamp`, and the semi-structured
 * `VARIANT`/`OBJECT`/`ARRAY` types to `json`.
 */
export function mapSnowflakeType(raw: string): SchemaType {
  return SNOWFLAKE_TYPES[normalize(raw)] ?? "unknown";
}

const BIGQUERY_TYPES: Record<string, SchemaType> = {
  // integers
  int64: "bigint",
  integer: "bigint",
  // numerics
  float64: "float",
  float: "float",
  numeric: "decimal",
  bignumeric: "decimal",
  // booleans
  bool: "boolean",
  boolean: "boolean",
  // strings
  string: "string",
  bytes: "binary",
  // temporal
  date: "date",
  time: "time",
  datetime: "datetime",
  timestamp: "timestamp",
  // documents
  json: "json",
  array: "json",
  struct: "json",
  record: "json",
  // geospatial has no canonical equivalent
  geography: "unknown",
};

/**
 * Maps a BigQuery native type to the canonical vocabulary. BigQuery only has
 * 64-bit integers (`INT64` → `bigint`), and its nested `ARRAY`/`STRUCT`/`RECORD`
 * types collapse to `json`. BigQuery declares parameters with angle brackets
 * (`ARRAY<INT64>`, `STRUCT<a INT64>`), which `normalize` does not strip, so the
 * generic argument list is removed before the lookup.
 */
export function mapBigQueryType(raw: string): SchemaType {
  return BIGQUERY_TYPES[normalize(raw.replace(/<[^>]*>/g, " "))] ?? "unknown";
}

const TRINO_TYPES: Record<string, SchemaType> = {
  // booleans
  boolean: "boolean",
  bool: "boolean",
  // integers
  tinyint: "smallint",
  smallint: "smallint",
  integer: "integer",
  int: "integer",
  bigint: "bigint",
  // numerics
  real: "float",
  double: "float",
  decimal: "decimal",
  // strings
  varchar: "string",
  char: "string",
  // binary
  varbinary: "binary",
  // documents / identifiers
  json: "json",
  uuid: "uuid",
  ipaddress: "string",
  ipprefix: "string",
  // temporal
  date: "date",
  time: "time",
  "time with time zone": "time",
  timestamp: "timestamp",
  "timestamp with time zone": "timestamp",
  // intervals
  interval: "interval",
  "interval year to month": "interval",
  "interval day to second": "interval",
};

/**
 * Maps a Trino native type to the canonical vocabulary. Trino spells its
 * parameterised temporal types with the modifiers after the precision
 * (`timestamp(3) with time zone`), which normalisation collapses to the same
 * `timestamp with time zone` key; `ARRAY`/`MAP`/`ROW` collapse to `json` and
 * `IPADDRESS`/`IPPREFIX` are kept as strings.
 */
export function mapTrinoType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (/^(array|map|row)\b/.test(normalized)) return "json";
  return TRINO_TYPES[normalized] ?? "unknown";
}

const HANA_TYPES: Record<string, SchemaType> = {
  // integers
  tinyint: "smallint",
  smallint: "smallint",
  integer: "integer",
  int: "integer",
  bigint: "bigint",
  // numerics
  decimal: "decimal",
  smalldecimal: "decimal",
  real: "float",
  double: "float",
  // strings
  char: "string",
  nchar: "string",
  varchar: "string",
  nvarchar: "string",
  alphanum: "string",
  // large text
  shorttext: "text",
  text: "text",
  clob: "text",
  nclob: "text",
  // binary
  binary: "binary",
  varbinary: "binary",
  blob: "blob",
  // temporal
  date: "date",
  time: "time",
  seconddate: "datetime",
  datetime: "datetime",
  timestamp: "timestamp",
  // booleans / documents
  boolean: "boolean",
  st_geometry: "unknown",
};

/**
 * Maps a SAP HANA native type to the canonical vocabulary. `SECONDDATE` is
 * HANA's second-precision timestamp (mapped to `datetime`), `ALPHANUM` is a
 * character type, `ST_GEOMETRY` has no canonical equivalent, and the
 * parameterised `ARRAY(...)` column type collapses to `json`.
 */
export function mapHanaType(raw: string): SchemaType {
  const normalized = normalize(raw);
  if (normalized === "array" || normalized.startsWith("array ")) return "json";
  return HANA_TYPES[normalized] ?? "unknown";
}

/** Returns the inner type when `raw` is exactly `Wrapper(...)`, else `null`. */
function unwrap(raw: string, wrapper: string): string | null {
  const trimmed = raw.trim();
  const prefix = `${wrapper}(`;
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase()) && trimmed.endsWith(")")) {
    return trimmed.slice(prefix.length, -1);
  }
  return null;
}

/** A per-engine mapper: native declared type in, canonical type out. */
type EngineMapper = (raw: string) => SchemaType;

/**
 * Every engine the schema vocabulary knows. The record is exhaustive over
 * `ConnectorEngine`, so adding an engine without a mapper fails typecheck.
 */
const ENGINE_MAPPERS: Record<ConnectorEngine, EngineMapper> = {
  mysql: mapMysqlType,
  mariadb: mapMysqlType,
  sqlite: mapSqliteType,
  postgresql: mapPostgresType,
  clickhouse: mapClickhouseType,
  sqlserver: mapSqlServerType,
  oracle: mapOracleType,
  firebird: mapFirebirdType,
  db2: mapDb2Type,
  duckdb: mapDuckDbType,
  libsql: mapLibSqlType,
  d1: mapD1Type,
  snowflake: mapSnowflakeType,
  bigquery: mapBigQueryType,
  trino: mapTrinoType,
  hana: mapHanaType,
};

/** Maps an engine-native type using the map for that engine. */
export function mapType(engine: ConnectorEngine, raw: string): SchemaType {
  return ENGINE_MAPPERS[engine](raw);
}

/**
 * Lowercases, trims and strips every `(params)` group (length, precision or
 * modifiers such as `(3)`) from a declared type.
 */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
