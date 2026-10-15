import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";
export type { RawQueryResult } from "../types.js";

/** Explicit connection configuration for a Google BigQuery project. */
export interface BigQueryConnectionConfig {
  projectId: string;
  /** Default dataset to introspect. When omitted, every dataset in the project is listed. */
  dataset?: string;
  /** Path to a service-account JSON key. When omitted, Application Default Credentials are used. */
  keyFilename?: string;
  location?: string;
}

export type IntrospectResult = EngineSchema<"bigquery">;

/** Internal — table metadata fields this connector reads. */
export interface TableMetadata {
  schema?: { fields?: FieldMetadata[] } | null;
  numRows?: string | number | null;
  type?: string | null;
}

/** Internal — one entry of a BigQuery table schema. */
export interface FieldMetadata {
  name?: string | null;
  type?: string | null;
  mode?: string | null;
  description?: string | null;
  defaultValueExpression?: string | null;
  fields?: FieldMetadata[] | null;
}
