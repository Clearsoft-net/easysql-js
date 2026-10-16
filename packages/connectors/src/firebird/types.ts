import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Configuration for a Firebird database (remote or embedded). */
export interface FirebirdConnectionConfig {
  /** Server hostname. Defaults to `"localhost"`. */
  host?: string;
  /** Server port. Defaults to `3050`. */
  port?: number;
  /** Database path or alias. */
  database: string;
  user: string;
  password: string;
  /** Optional SQL role assumed for the attachment. */
  role?: string;
  /** Attach timeout in milliseconds. Defaults to `10000`. */
  connectTimeoutMs?: number;
}

export type IntrospectResult = EngineSchema<"firebird">;

/** A row of `RDB$RELATION_FIELDS` enriched with catalog joins. */
export interface ColumnRow {
  field_name: string;
  field_position: number | null;
  null_flag: number | null;
  default_source: string | null;
  type_name: string | null;
  field_type: number | null;
  field_sub_type: number | null;
  character_length: number | null;
  field_length: number | null;
  field_precision: number | null;
  field_scale: number | null;
  pk: number | null;
}

/**
 * The subset of the driver's column metadata that is used here. Declared
 * locally so the connector does not depend on the driver's deep type paths.
 */
export interface FirebirdField {
  alias?: string;
  field?: string;
  nullable?: boolean;
}
