/**
 * Snowflake connector: local schema introspection and query execution.
 *
 * Uses the official `snowflake-sdk`, whose API is callback-based; every call is
 * wrapped in a promise here. The connection is opened explicitly with
 * {@link SnowflakeConnector.connect} and released with
 * {@link SnowflakeConnector.close}. Credentials are held in memory for the
 * lifetime of the connector only and are stripped from every error message that
 * leaves the process.
 *
 * Introspection reads `INFORMATION_SCHEMA` only:
 * - `INFORMATION_SCHEMA.TABLES` lists `BASE TABLE`s in the configured
 *   database/schema.
 * - `INFORMATION_SCHEMA.COLUMNS` supplies `DATA_TYPE`, `IS_NULLABLE`,
 *   `COLUMN_DEFAULT` and `ORDINAL_POSITION`.
 * - `INFORMATION_SCHEMA.TABLE_CONSTRAINTS` joined with
 *   `INFORMATION_SCHEMA.KEY_COLUMN_USAGE` supplies primary and foreign keys.
 *
 * The constraint views are preferred over `SHOW PRIMARY KEYS` / `SHOW IMPORTED
 * KEYS` because they are plain SQL: they compose into a single query, keep the
 * metadata read to two round trips, and return one row per constraint column
 * instead of the driver-specific `SHOW` result shape.
 */

import snowflake from "snowflake-sdk";
import { BaseConnector } from "../base-connector.js";
import { toOrdinal } from "../internal.js";
import { columnsQuery, tablesQuery } from "./queries.js";
import type {
  ColumnRow,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
  SnowflakeConnectionConfig,
  TableRow,
} from "./types.js";

/** Default connection timeout; cloud warehouses are slower to connect. */
const DEFAULT_CONNECT_TIMEOUT_MS = 60_000;

/** Default schema when the configuration does not name one. */
const DEFAULT_SCHEMA = "PUBLIC";

export class SnowflakeConnector extends BaseConnector<snowflake.Connection> {
  private readonly config: Required<Pick<SnowflakeConnectionConfig, "connectTimeoutMs">> &
    SnowflakeConnectionConfig & { schema: string };

  constructor(config: SnowflakeConnectionConfig) {
    super([config.password]);
    if (!config.account) throw new Error("SnowflakeConnector: account is required");
    if (!config.user) throw new Error("SnowflakeConnector: user is required");
    if (!config.password) throw new Error("SnowflakeConnector: password is required");
    if (!config.database) throw new Error("SnowflakeConnector: database is required");
    this.config = {
      connectTimeoutMs: DEFAULT_CONNECT_TIMEOUT_MS,
      ...config,
      schema: config.schema ?? DEFAULT_SCHEMA,
    };
  }

  /** Opens the connection. Safe to call more than once. */
  protected async openHandle(): Promise<snowflake.Connection> {
    const connection = snowflake.createConnection({
      account: this.config.account,
      username: this.config.user,
      password: this.config.password,
      database: this.config.database,
      schema: this.config.schema,
      ...(this.config.warehouse ? { warehouse: this.config.warehouse } : {}),
      ...(this.config.role ? { role: this.config.role } : {}),
    });
    try {
      await this.withTimeout(connect(connection), this.config.connectTimeoutMs);
      return connection;
    } catch (error) {
      // A half-open connection must not keep the process (or the pool) alive.
      try {
        connection.destroy(() => {});
      } catch {
        // The driver may already have torn the socket down.
      }
      throw error;
    }
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  protected async closeHandle(connection: snowflake.Connection): Promise<void> {
    await new Promise<void>((resolve) => connection.destroy(() => resolve()));
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(connection: snowflake.Connection, sql: string): Promise<RawQueryResult> {
    const { statement, rows } = await this.runStatement(connection, sql);
    return {
      columns: (statement.getColumns() ?? []).map((column) => column.getName()),
      rows,
    };
  }

  /** Introspects the configured database/schema and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const connection = this.requireHandle();
    try {
      const tableRows = await this.run<TableRow>(connection, tablesQuery().text);

      const columnRows = await this.run<ColumnRow>(connection, columnsQuery().text);

      const columnsByTable = new Map<string, RawColumn[]>();
      for (const row of columnRows) {
        const columns = columnsByTable.get(row.table_name ?? "") ?? [];
        columns.push(toRawColumn(row));
        columnsByTable.set(row.table_name ?? "", columns);
      }

      const tables: RawTable[] = tableRows
        .map((row) => row.table_name)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          name,
          columns: (columnsByTable.get(name) ?? []).sort(
            (a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0),
          ),
          // Snowflake exposes no cheap exact/approximate row count through
          // INFORMATION_SCHEMA; TABLE_STORAGE_METRICS is per-database and can
          // lag, so `rowsApprox` stays null.
          rowsApprox: null,
        }));

      return { engine: "snowflake", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs a statement and resolves with its rows. */
  private run<T>(connection: snowflake.Connection, sqlText: string): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      connection.execute({
        sqlText,
        complete: (err, _stmt, rows) => {
          if (err) reject(err);
          else resolve((rows ?? []) as T[]);
        },
      });
    });
  }

  /** Runs a statement and resolves with the statement and its rows. */
  private runStatement(
    connection: snowflake.Connection,
    sqlText: string,
  ): Promise<{ statement: snowflake.RowStatement; rows: Record<string, unknown>[] }> {
    return new Promise((resolve, reject) => {
      connection.execute({
        sqlText,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else
            resolve({
              statement: stmt as snowflake.RowStatement,
              rows: (rows ?? []) as Record<string, unknown>[],
            });
        },
      });
    });
  }

  /** Rejects with a timeout error when `promise` does not settle in time. */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
}

function connect(connection: snowflake.Connection): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function toRawColumn(row: ColumnRow): RawColumn {
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable === true || row.is_nullable === "YES",
    primaryKey: row.is_primary === true || row.is_primary === 1 || row.is_primary === "1",
    defaultValue: row.column_default,
    foreignKey:
      row.foreign_table && row.foreign_column
        ? { table: row.foreign_table, column: row.foreign_column }
        : null,
    ordinal: toOrdinal(row.ordinal),
  };
}
