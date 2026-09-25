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

/** Returns the inner type when `raw` is exactly `Wrapper(...)`, else `null`. */
function unwrap(raw: string, wrapper: string): string | null {
  const trimmed = raw.trim();
  const prefix = `${wrapper}(`;
  if (trimmed.toLowerCase().startsWith(prefix.toLowerCase()) && trimmed.endsWith(")")) {
    return trimmed.slice(prefix.length, -1);
  }
  return null;
}

/** Maps an engine-native type using the map for that engine. */
export function mapType(engine: ConnectorEngine, raw: string): SchemaType {
  if (engine === "sqlite") return mapSqliteType(raw);
  if (engine === "postgresql") return mapPostgresType(raw);
  if (engine === "clickhouse") return mapClickhouseType(raw);
  return mapMysqlType(raw);
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
