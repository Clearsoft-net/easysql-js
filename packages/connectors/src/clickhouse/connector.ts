/**
 * ClickHouse connector: local schema introspection and query execution.
 *
 * Talks to the ClickHouse HTTP interface via the official `@clickhouse/client`.
 * The connection is opened explicitly with {@link ClickhouseConnector.connect}
 * and released with {@link ClickhouseConnector.close}. Credentials are held in
 * memory for the lifetime of the connector only and are stripped from every
 * error message that leaves the process.
 */

import { type ClickHouseClient, createClient } from "@clickhouse/client";
import { BaseConnector } from "../base-connector.js";
import { COLUMNS_SQL, TABLES_SQL } from "./queries.js";
import type {
  ClickhouseConnectionConfig,
  ColumnRow,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

export class ClickhouseConnector extends BaseConnector<ClickHouseClient> {
  private readonly config: Required<
    Pick<ClickhouseConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    ClickhouseConnectionConfig;

  constructor(config: ClickhouseConnectionConfig) {
    super([config.password]);
    if (!config.host) throw new Error("ClickhouseConnector: host is required");
    if (!config.user) throw new Error("ClickhouseConnector: user is required");
    if (!config.database) throw new Error("ClickhouseConnector: database is required");
    this.config = {
      ssl: false,
      connectTimeoutMs: 10_000,
      ...config,
      port: config.port ?? (config.ssl ? 8443 : 8123),
    };
  }

  /** Opens the connection. Safe to call more than once. */
  protected async openHandle(): Promise<ClickHouseClient> {
    const protocol = this.config.ssl ? "https" : "http";
    const url = `${protocol}://${this.config.host}:${this.config.port}`;
    return createClient({
      url,
      username: this.config.user,
      password: this.config.password,
      database: this.config.database,
      request_timeout: this.config.connectTimeoutMs,
    });
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  protected async closeHandle(client: ClickHouseClient): Promise<void> {
    await client.close();
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(client: ClickHouseClient, sql: string): Promise<RawQueryResult> {
    const resultSet = await client.query({ query: sql, format: "JSON" });
    const body = await resultSet.json<Record<string, unknown>>();
    const columns = (body.meta ?? []).map((meta) => meta.name);
    const rows = body.data ?? [];
    return { columns, rows, rowCount: body.rows ?? rows.length };
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const client = this.requireHandle();
    try {
      const tablesResult = await client.query({
        query: TABLES_SQL,
        format: "JSONEachRow",
      });
      const tableRows = await tablesResult.json<TableRow>();

      const tables: RawTable[] = [];
      for (const table of tableRows) {
        const columnsResult = await client.query({
          query: COLUMNS_SQL,
          query_params: { table: table.table_name },
          format: "JSONEachRow",
        });
        const columnRows = await columnsResult.json<ColumnRow>();

        tables.push({
          name: table.table_name,
          columns: columnRows.map(toRawColumn),
          rowsApprox: table.rows_approx === null ? null : Number(table.rows_approx),
        });
      }

      return { engine: "clickhouse", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

function toRawColumn(row: ColumnRow): RawColumn {
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: /^Nullable\(/.test(row.data_type),
    primaryKey: row.is_primary === true || Number(row.is_primary) === 1,
    defaultValue: row.column_default ? row.column_default : null,
    foreignKey: null,
    ordinal: Number(row.ordinal),
  };
}
