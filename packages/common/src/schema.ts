/**
 * Schema contracts shared by connectors and schema generation.
 *
 * `RawSchema` is what a connector produces from a local database;
 * `TableSchema`/`ColumnSchema` are what the EasySQL API accepts. The mapping
 * between them is `@easysql/schema-generation`'s job.
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
export type ConnectorEngine = "mysql" | "mariadb" | "sqlite" | "postgresql";

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
