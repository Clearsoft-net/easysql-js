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
import { sanitizeErrorMessage } from "@easysql/common";
import type {
  ClickhouseConnectionConfig,
  Connector,
  IntrospectResult,
  QueryResult,
  RawColumn,
  RawTable,
} from "./types.js";

interface TableRow {
  table_name: string;
  rows_approx: string | number | null;
}

interface ColumnRow {
  column_name: string;
  data_type: string;
  column_default: string | null;
  is_primary: number | boolean;
  ordinal: string | number;
}

export class ClickhouseConnector implements Connector {
  private readonly config: Required<
    Pick<ClickhouseConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    ClickhouseConnectionConfig;
  private client: ClickHouseClient | null = null;

  constructor(config: ClickhouseConnectionConfig) {
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
  async connect(): Promise<void> {
    if (this.client) return;
    const protocol = this.config.ssl ? "https" : "http";
    const url = `${protocol}://${this.config.host}:${this.config.port}`;
    try {
      this.client = createClient({
        url,
        username: this.config.user,
        password: this.config.password,
        database: this.config.database,
        request_timeout: this.config.connectTimeoutMs,
      });
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  async close(): Promise<void> {
    if (!this.client) return;
    const client = this.client;
    this.client = null;
    await client.close();
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const client = this.requireConnection();
    try {
      const tablesResult = await client.query({
        query: `SELECT name AS table_name, total_rows AS rows_approx
                FROM system.tables
                WHERE database = currentDatabase()
                  AND engine NOT LIKE '%View'
                ORDER BY name`,
        format: "JSONEachRow",
      });
      const tableRows = await tablesResult.json<TableRow>();

      const tables: RawTable[] = [];
      for (const table of tableRows) {
        const columnsResult = await client.query({
          query: `SELECT name AS column_name, type AS data_type,
                         default_expression AS column_default,
                         is_in_primary_key AS is_primary, position AS ordinal
                  FROM system.columns
                  WHERE database = currentDatabase() AND table = {table:String}
                  ORDER BY position`,
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

  /** Executes a validated SQL statement and returns typed rows. */
  async execute(sql: string): Promise<QueryResult> {
    const client = this.requireConnection();
    const started = Date.now();
    try {
      const resultSet = await client.query({ query: sql, format: "JSON" });
      const body = await resultSet.json<Record<string, unknown>>();
      const columns = (body.meta ?? []).map((meta) => meta.name);
      const rows = body.data ?? [];
      return {
        columns,
        rows: rows.map((row) => pick(row, columns)),
        rowCount: body.rows ?? rows.length,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  private requireConnection(): ClickHouseClient {
    if (!this.client) throw new Error("ClickhouseConnector: not connected — call connect() first");
    return this.client;
  }

  private wrap(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(sanitizeErrorMessage(message, [this.config.password]));
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

function pick(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of columns) out[column] = row[column];
  return out;
}
