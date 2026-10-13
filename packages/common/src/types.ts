/**
 * Every type declaration of `@easysql/common` — this package is the shared
 * vocabulary of the SDK.
 *
 * `RawSchema` is what a connector produces from a local database;
 * `TableSchema`/`ColumnSchema` are what the EasySQL API accepts. The mapping
 * between them is `@easysql/schema-generation`'s job. Behaviour lives next door:
 * `url.ts` parses connection strings, `redact.ts` sanitises error messages.
 */

/** A column in the schema payload accepted by the API. */
export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  default?: string | null;
  foreign_key?: { table?: string; column?: string } | null;
}

/** A table in the schema payload accepted by the API. */
export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  rows_approx?: number | null;
}

/** Engines the schema vocabulary knows how to map. */
export type ConnectorEngine = "mysql" | "mariadb" | "sqlite" | "postgresql" | "clickhouse";

/**
 * A column as reported by a connector, before normalisation. `dataType` is the
 * engine-native declared type (e.g. `varchar(255)`, `INTEGER`, `timestamp`).
 */
export interface RawColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string | null;
  primaryKey?: boolean;
  foreignKey?: { table: string; column: string } | null;
  /** Declared position, used to keep column order stable when present. */
  ordinal?: number;
}

/** A table as reported by a connector, before normalisation. */
export interface RawTable {
  name: string;
  columns: RawColumn[];
  rowsApprox?: number | null;
}

/** The single input shape a connector produces for one introspected database. */
export interface RawSchema {
  engine: ConnectorEngine;
  tables: RawTable[];
}

/**
 * Canonical type vocabulary the API consumes. Engine-native types are mapped
 * into this closed set; unknown types fall back to `"unknown"`.
 */
export type SchemaType =
  | "integer"
  | "bigint"
  | "smallint"
  | "decimal"
  | "float"
  | "boolean"
  | "string"
  | "text"
  | "binary"
  | "blob"
  | "date"
  | "time"
  | "datetime"
  | "timestamp"
  | "interval"
  | "json"
  | "enum"
  | "uuid"
  | "unknown";

/** Rows returned by {@link Connector.execute}. */
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

/**
 * A database connector: opens/closes a connection, reads local metadata and
 * executes validated SQL. Credentials never leave the process.
 */
export interface Connector {
  /** Opens the connection. Idempotent. */
  connect(): void | Promise<void>;
  /** Closes the connection. Safe to call when not connected. */
  close(): void | Promise<void>;
  /** Reads local metadata only — never returns rows. */
  introspect(): RawSchema | Promise<RawSchema>;
  /** Executes a validated SQL statement and returns typed rows. */
  execute(sql: string): QueryResult | Promise<QueryResult>;
}

/**
 * A connection string parsed into its parts. The password is held in memory
 * only; callers decide whether it is ever persisted (it should not be).
 */
export interface ParsedConnection {
  type: ConnectorEngine;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}
