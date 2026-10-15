/**
 * Trino connector: schema introspection and query execution over the Trino
 * REST API.
 *
 * `trino-client` is a pure HTTP client — it has no long-lived socket to open,
 * so {@link TrinoConnector.connect} builds the client and validates it with a
 * lightweight probe query, which is what surfaces bad hosts or credentials.
 * `close()` simply drops the client.
 *
 * Introspection reads `information_schema`. Trino does not expose primary or
 * foreign key metadata through `information_schema` in the general case, so
 * every column is reported with `primaryKey: false` and `foreignKey: null`;
 * `rowsApprox` is likewise unavailable and always `null`. Downstream consumers
 * must not treat those fields as authoritative for this engine.
 */

import type { Trino as TrinoClient } from "trino-client";
import { BasicAuth, Trino } from "trino-client";
import { BaseConnector } from "../base-connector.js";
import { PROBE_SQL } from "../helpers.js";
import { toOrdinal } from "../internal.js";
import { columnsQuery, tablesQuery } from "./queries.js";
import type {
  Collected,
  ColumnRow,
  IntrospectResult,
  QueryPage,
  RawColumn,
  RawQueryResult,
  RawTable,
  TrinoConnectionConfig,
  TrinoHttpClient,
} from "./types.js";

export class TrinoConnector extends BaseConnector<TrinoClient> {
  private readonly config: Required<TrinoConnectionConfig>;

  constructor(config: TrinoConnectionConfig) {
    super([config.password ?? ""]);
    if (!config.host) throw new Error("TrinoConnector: host is required");
    if (!config.user) throw new Error("TrinoConnector: user is required");
    this.config = {
      port: 8080,
      ssl: false,
      connectTimeoutMs: 10_000,
      password: "",
      catalog: "",
      schema: "",
      ...config,
    };
  }

  /** Builds the client and probes the coordinator. Called once by {@link TrinoConnector.connect}. */
  protected async openHandle(): Promise<TrinoClient> {
    const client = Trino.create({
      server: serverUrl(this.config),
      ...(this.config.catalog ? { catalog: this.config.catalog } : {}),
      ...(this.config.schema ? { schema: this.config.schema } : {}),
      auth: new BasicAuth(this.config.user, this.config.password || undefined),
      ssl: this.config.ssl ? { rejectUnauthorized: false } : {},
      extraHeaders: { "X-Trino-User": this.config.user },
    });
    // Trino.create() only stores options; the first query is what actually
    // reaches the coordinator, so probe once to fail fast on a bad endpoint.
    await collect(client, PROBE_SQL);
    return client;
  }

  /** Trino's HTTP client holds no socket, so there is nothing to release. */
  protected async closeHandle(): Promise<void> {}

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(client: TrinoClient, sql: string): Promise<RawQueryResult> {
    const page = await collect(client, sql);
    return { columns: page.columns, rows: page.rows };
  }

  /** Introspects the configured catalog/schema and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const client = this.requireHandle();
    try {
      const tablesPage = await collect(client, tablesQuery().text);

      const tables: RawTable[] = [];
      for (const row of tablesPage.rows) {
        const tableName = String(row.table_name);
        const columnsPage = await collect(client, columnsQuery(tableName).text);

        tables.push({
          name: tableName,
          columns: (columnsPage.rows as unknown as ColumnRow[]).map(toRawColumn),
          // Trino exposes no row-count estimate through information_schema.
          rowsApprox: null,
        });
      }

      return { engine: "trino", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

/**
 * Runs one Trino query and drains every page.
 *
 * The driver's own iterator skips the rows in the initial `POST` response, so
 * the pages are walked here through the driver's HTTP client: submit the
 * statement, then follow `nextUri` until the coordinator stops returning one.
 */
async function collect(client: TrinoClient, sql: string): Promise<Collected> {
  const http = (client as unknown as { client: TrinoHttpClient }).client;
  const columns: string[] = [];
  const rows: Record<string, unknown>[] = [];

  let page = await http.request<QueryPage>({
    method: "POST",
    url: "/v1/statement",
    data: sql,
  });

  for (;;) {
    if (page.error) {
      throw new Error(`${page.error.errorName || "TrinoQueryError"}: ${page.error.message}`);
    }
    if (page.columns && page.columns.length > 0) {
      columns.length = 0;
      for (const column of page.columns) columns.push(shortName(column.name));
    }
    for (const row of page.data ?? []) {
      rows.push(toRow(row, columns));
    }
    if (!page.nextUri) break;
    page = await http.request<QueryPage>({ method: "GET", url: page.nextUri });
  }

  return { columns, rows };
}

/** Maps one Trino data row (array or object) onto the collected columns. */
function toRow(row: unknown, columns: string[]): Record<string, unknown> {
  if (Array.isArray(row)) {
    const out: Record<string, unknown> = {};
    for (let index = 0; index < columns.length; index += 1) {
      out[columns[index] as string] = row[index];
    }
    return out;
  }
  if (row && typeof row === "object") return row as Record<string, unknown>;
  return {};
}

function toRawColumn(row: ColumnRow): RawColumn {
  return {
    name: row.column_name,
    dataType: row.data_type,
    // information_schema reports the string "YES"/"NO".
    nullable: String(row.is_nullable).toUpperCase() === "YES",
    // Trino exposes no key metadata through information_schema.
    primaryKey: false,
    defaultValue: row.column_default,
    foreignKey: null,
    ordinal: toOrdinal(row.ordinal),
  };
}

/** Trino returns names as `table.column`; keep the column part. */
function shortName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.slice(dot + 1);
}

/** Builds the coordinator base URL from host/port/ssl. */
function serverUrl(config: Required<TrinoConnectionConfig>): string {
  const raw = config.host.trim();
  if (/^https?:\/\//i.test(raw)) {
    const parsed = new URL(raw);
    if (!parsed.port) parsed.port = String(config.port);
    return parsed.origin;
  }
  return `${config.ssl ? "https" : "http"}://${raw}:${config.port}`;
}
