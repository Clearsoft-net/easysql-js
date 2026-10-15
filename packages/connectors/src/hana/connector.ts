/**
 * SAP HANA connector: local schema introspection and query execution.
 *
 * Metadata is read from the `SYS` catalog in a fixed number of batched queries
 * — tables, columns, primary keys, foreign keys and (best-effort) row counts are
 * each fetched once for the whole schema and assembled in memory, so a schema
 * with N tables costs a handful of round trips rather than one per table. The
 * connection is opened explicitly with {@link HanaConnector.connect} and
 * released with {@link HanaConnector.close}. Credentials are held in memory for
 * the lifetime of the connector only and are stripped from every error message
 * that leaves the process.
 */

import type { Connection } from "@sap/hana-client";
import { BaseConnector } from "../base-connector.js";
import { memoizedImport } from "../driver-loading.js";
import { columnKey } from "../helpers.js";
import { groupBy, toOrdinal } from "../internal.js";
import {
  columnsQuery,
  foreignKeysQuery,
  primaryKeysQuery,
  rowCountSources,
  tablesQuery,
} from "./queries.js";
import type {
  ColumnRow,
  ForeignKeyRow,
  HanaConnectionConfig,
  HanaModule,
  IntrospectResult,
  KeyColumnRow,
  RawColumn,
  RawQueryResult,
  RawTable,
  RowCountRow,
  TableRow,
} from "./types.js";

/**
 * `@sap/hana-client` is a native, optional peer dependency, so it is imported
 * lazily when a connection is actually opened. Importing the connector (and the
 * unit tests) therefore never requires the native binding to be present.
 */
const loadDriver = memoizedImport<HanaModule>(() => import("@sap/hana-client"));

export class HanaConnector extends BaseConnector<Connection> {
  private readonly config: Required<
    Pick<HanaConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    HanaConnectionConfig;

  constructor(config: HanaConnectionConfig) {
    super([config.password]);
    if (!config.host) throw new Error("HanaConnector: host is required");
    if (!config.user) throw new Error("HanaConnector: user is required");
    this.config = {
      port: 30_015,
      ssl: false,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /** Opens the connection. Safe to call more than once. */
  protected async openHandle(): Promise<Connection> {
    const { createConnection } = await loadDriver();
    const connection = createConnection();
    await connect(connection, {
      host: this.config.host,
      port: this.config.port,
      uid: this.config.user,
      pwd: this.config.password,
      encrypt: this.config.ssl ? "true" : "false",
      connectTimeout: this.config.connectTimeoutMs,
    });
    return connection;
  }

  /** Closes the connection. Safe to call when not connected. */
  protected async closeHandle(connection: Connection): Promise<void> {
    try {
      await disconnect(connection);
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(_connection: Connection, sql: string): Promise<RawQueryResult> {
    // `exec` re-derives the handle via `requireHandle()`; the base passes it so
    // the signature matches, but HANA's call is self-contained.
    const output = await this.exec<unknown>(sql);
    // HANA's `exec` resolves to the row objects for a query, but to a number
    // (or nothing) for DDL/DML that does not produce a result set.
    const rows = Array.isArray(output) ? (output as Record<string, unknown>[]) : [];
    const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
    return { columns, rows };
  }

  /** Introspects the current schema and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    this.requireHandle();
    try {
      const tableRows = (await this.exec<TableRow[]>(tablesQuery().text)) ?? [];
      const columnRows = (await this.exec<ColumnRow[]>(columnsQuery().text)) ?? [];
      const primaryKeyRows = (await this.exec<KeyColumnRow[]>(primaryKeysQuery().text)) ?? [];
      const foreignKeyRows = (await this.exec<ForeignKeyRow[]>(foreignKeysQuery().text)) ?? [];
      const rowCounts = await this.loadRowCounts();

      const columnsByTable = groupBy(columnRows, (row) => row.table_name ?? "");
      const primaryKeys = new Set(
        primaryKeyRows.map((row) => columnKey(row.table_name, row.column_name)),
      );
      const foreignKeys = new Map(
        foreignKeyRows.map((row) => [
          columnKey(row.table_name, row.column_name),
          { table: row.ref_table, column: row.ref_column },
        ]),
      );

      const tables: RawTable[] = tableRows.map((table) => ({
        name: table.table_name,
        columns: (columnsByTable.get(table.table_name) ?? []).map((row) =>
          toRawColumn(row, primaryKeys, foreignKeys),
        ),
        rowsApprox: rowCounts.get(table.table_name) ?? null,
      }));

      return { engine: "hana", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /**
   * Best-effort row estimates. Each source is tried in order until one works;
   * when none is available the estimate is reported as "unknown" (`null`)
   * rather than failing introspection.
   */
  private async loadRowCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const source of rowCountSources()) {
      try {
        const rows = (await this.exec<RowCountRow[]>(source.text)) ?? [];
        for (const row of rows) {
          const count = Number(row.record_count);
          if (row.table_name && Number.isFinite(count) && count >= 0) {
            counts.set(row.table_name, count);
          }
        }
        return counts;
      } catch {
        // Optional metadata: try the next source, otherwise report null.
      }
    }
    return counts;
  }

  private exec<T>(sql: string): Promise<T | undefined> {
    const connection = this.requireHandle();
    return new Promise((resolve, reject) => {
      connection.exec<T>(sql, (error: Error, results?: T) => {
        if (error) reject(error);
        else resolve(results);
      });
    });
  }
}

function connect(connection: Connection, params: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.connect(params, (error: Error) => (error ? reject(error) : resolve()));
  });
}

function disconnect(connection: Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.disconnect((error?: Error) => (error ? reject(error) : resolve()));
  });
}

function toRawColumn(
  row: ColumnRow,
  primaryKeys: Set<string>,
  foreignKeys: Map<string, { table: string; column: string }>,
): RawColumn {
  const key = columnKey(row.table_name ?? "", row.column_name);
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable === "TRUE",
    primaryKey: primaryKeys.has(key),
    defaultValue: row.column_default,
    foreignKey: foreignKeys.get(key) ?? null,
    ordinal: toOrdinal(row.ordinal),
  };
}
