/**
 * BigQuery connector: local schema introspection and query execution.
 *
 * Uses the official `@google-cloud/bigquery` client, which is promise-based.
 * The connection is opened explicitly with {@link BigQueryConnector.connect}
 * and released with {@link BigQueryConnector.close}. Authentication is either a
 * service-account key file (`keyFilename`) or Application Default Credentials.
 * BigQuery has no password, so there is no secret to redact, but every error is
 * still routed through `sanitizeErrorMessage` for a uniform contract.
 *
 * Introspection uses the client's dataset/table APIs rather than SQL:
 * - `bigquery.getDatasets()` when no dataset is configured, otherwise the
 *   configured dataset alone.
 * - `dataset.getTables()` lists the tables of each dataset.
 * - `table.getMetadata()` supplies the schema fields (`STRING`, `INT64`,
 *   `RECORD`, ...) and, when present, `numRows`.
 *
 * BigQuery does not model primary or foreign keys: constraints are not part of
 * the table metadata and are only enforced by tooling outside the warehouse.
 * Every column is therefore reported with `primaryKey: false` and
 * `foreignKey: null`. Nested `RECORD` fields are reported with their BigQuery
 * type string, including a `REPEATED` prefix when the field's mode is
 * `REPEATED`.
 */

import { BigQuery } from "@google-cloud/bigquery";
import { BaseConnector } from "../base-connector.js";
import type { RawQueryResult } from "../types.js";
import type {
  BigQueryConnectionConfig,
  FieldMetadata,
  IntrospectResult,
  RawColumn,
  RawTable,
  TableMetadata,
} from "./types.js";

/** Table types that hold rows and are worth introspecting. */
const DATA_TABLE_TYPES = new Set(["TABLE", "EXTERNAL", "MATERIALIZED_VIEW"]);

export class BigQueryConnector extends BaseConnector<BigQuery> {
  private readonly config: BigQueryConnectionConfig;

  constructor(config: BigQueryConnectionConfig) {
    super([]);
    if (!config.projectId) throw new Error("BigQueryConnector: projectId is required");
    this.config = { ...config };
  }

  /** Creates the client. Safe to call more than once. */
  protected async openHandle(): Promise<BigQuery> {
    return new BigQuery({
      projectId: this.config.projectId,
      ...(this.config.keyFilename ? { keyFilename: this.config.keyFilename } : {}),
      ...(this.config.location ? { location: this.config.location } : {}),
    });
  }

  /** Drops the client. Safe to call when not connected. */
  protected async closeHandle(): Promise<void> {}

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(client: BigQuery, sql: string): Promise<RawQueryResult> {
    const [rows] = await client.query({
      query: sql,
      ...(this.config.location ? { location: this.config.location } : {}),
    });
    const typedRows = rows as Record<string, unknown>[];
    return { columns: resultColumns(typedRows), rows: typedRows };
  }

  /** Introspects the configured dataset, or every dataset in the project. */
  async introspect(): Promise<IntrospectResult> {
    const client = this.requireHandle();
    try {
      const datasetIds = this.config.dataset
        ? [this.config.dataset]
        : (await client.getDatasets())[0].map((dataset) => dataset.id as string);

      const tables: RawTable[] = [];
      for (const datasetId of datasetIds) {
        const dataset = client.dataset(datasetId, {
          ...(this.config.location ? { location: this.config.location } : {}),
        });
        const listed = (await dataset.getTables())[0];
        for (const table of listed) {
          const metadata = (await table.getMetadata())[0] as TableMetadata;
          if (!isDataTable(metadata)) continue;
          const tableName = table.id as string;
          tables.push({
            // A dataset is not part of RawTable, so the dataset id is prefixed
            // to keep names unambiguous when every dataset is introspected.
            name: this.config.dataset ? tableName : `${datasetId}.${tableName}`,
            columns: toRawColumns(metadata.schema?.fields ?? []),
            rowsApprox: toRowsApprox(metadata.numRows),
          });
        }
      }

      tables.sort((a, b) => a.name.localeCompare(b.name));
      return { engine: "bigquery", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

/** Skips views and other metadata-only entries. */
function isDataTable(metadata: TableMetadata): boolean {
  if (!metadata.type) return true;
  return DATA_TABLE_TYPES.has(metadata.type);
}

/**
 * Maps schema fields to raw columns. `ordinal` is the field's position in the
 * schema; nested `RECORD` fields keep their parent's position and their own
 * type string (never flattened).
 */
function toRawColumns(fields: FieldMetadata[]): RawColumn[] {
  return fields.map((field, index) => ({
    name: field.name ?? "",
    dataType: typeOf(field),
    // BigQuery columns are nullable unless mode is REQUIRED.
    nullable: field.mode !== "REQUIRED",
    defaultValue: field.defaultValueExpression ?? null,
    // BigQuery does not model primary or foreign keys in table metadata.
    primaryKey: false,
    foreignKey: null,
    ordinal: index,
  }));
}

/** Builds the BigQuery type string, e.g. `STRING`, `RECORD`, `REPEATED RECORD`. */
function typeOf(field: FieldMetadata): string {
  const type = field.type ?? "UNKNOWN";
  return field.mode === "REPEATED" ? `REPEATED ${type}` : type;
}

/** `numRows` arrives as a string from the REST API; ignore unparsable values. */
function toRowsApprox(numRows: string | number | null | undefined): number | null {
  if (numRows === null || numRows === undefined) return null;
  const value = Number(numRows);
  return Number.isFinite(value) ? value : null;
}

/**
 * Reads column names from the first row. The high-level `query()` API does not
 * expose the result schema separately, so an empty result set reports no
 * columns (the same shape SQLite returns for a statement with no projection).
 */
function resultColumns(rows: Record<string, unknown>[]): string[] {
  const first = rows[0];
  return first ? Object.keys(first) : [];
}
