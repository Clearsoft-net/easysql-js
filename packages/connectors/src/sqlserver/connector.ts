/**
 * Microsoft SQL Server connector: local schema introspection and query
 * execution.
 *
 * The connection pool is opened explicitly with {@link SqlServerConnector.connect}
 * and released with {@link SqlServerConnector.close}. Credentials are held in
 * memory for the lifetime of the connector only and are stripped from every
 * error message that leaves the process.
 *
 * Introspection reads the `sys.*` catalog with one joined query for the tables
 * (with an approximate row count) and one joined query for every column of the
 * database, then groups the columns in memory — never one query per column.
 */

import type { ConnectionPool, IColumnMetadata, IRecordSet } from "mssql";
import sql from "mssql";
import { BaseConnector } from "../base-connector.js";
import { toOrdinal } from "../internal.js";
import type { ColumnRow, RawQueryResult, TableRow } from "../types.js";
import { columnsQuery, tablesQuery } from "./queries.js";
import type { IntrospectResult, RawColumn, RawTable, SqlServerConnectionConfig } from "./types.js";

export class SqlServerConnector extends BaseConnector<ConnectionPool> {
  private readonly config: Required<
    Pick<
      SqlServerConnectionConfig,
      "port" | "encrypt" | "trustServerCertificate" | "connectTimeoutMs"
    >
  > &
    SqlServerConnectionConfig;

  constructor(config: SqlServerConnectionConfig) {
    super([config.password]);
    if (!config.host) throw new Error("SqlServerConnector: host is required");
    if (!config.user) throw new Error("SqlServerConnector: user is required");
    if (!config.database) throw new Error("SqlServerConnector: database is required");
    this.config = {
      port: 1433,
      encrypt: true,
      trustServerCertificate: false,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /** Opens the connection pool. Called once by {@link SqlServerConnector.connect}. */
  protected async openHandle(): Promise<ConnectionPool> {
    const pool = new sql.ConnectionPool({
      server: this.config.host as string,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionTimeout: this.config.connectTimeoutMs,
      options: {
        encrypt: this.config.encrypt,
        trustServerCertificate: this.config.trustServerCertificate,
      },
    });
    return await pool.connect();
  }

  /** Closes the pool obtained from {@link SqlServerConnector.openHandle}. */
  protected async closeHandle(pool: ConnectionPool): Promise<void> {
    await pool.close();
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(pool: ConnectionPool, sqlText: string): Promise<RawQueryResult> {
    const result = await pool.request().query(sqlText);
    const recordset = result.recordset as IRecordSet<Record<string, unknown>> | undefined;
    if (!recordset) {
      // Statements that return no result set (INSERT/UPDATE/DELETE/DDL):
      // mssql reports the affected rows instead of a recordset.
      const rowCount = (result.rowsAffected ?? []).reduce((total, count) => total + count, 0);
      return { columns: [], rows: [], rowCount };
    }
    const columns = Object.keys((recordset.columns ?? {}) as IColumnMetadata);
    return { columns, rows: recordset as unknown as Record<string, unknown>[] };
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const pool = this.requireHandle();
    try {
      const tablesResult = await pool.request().query<TableRow>(tablesQuery().text);
      const columnsResult = await pool.request().query<ColumnRow>(columnsQuery().text);

      const columnsByTable = new Map<number | undefined, RawColumn[]>();
      for (const row of columnsResult.recordset) {
        const columns = columnsByTable.get(row.table_id);
        if (columns) columns.push(toRawColumn(row));
        else columnsByTable.set(row.table_id, [toRawColumn(row)]);
      }

      const tables: RawTable[] = tablesResult.recordset.map((row) => ({
        name: row.table_name,
        columns: columnsByTable.get(row.table_id) ?? [],
        rowsApprox: row.rows_approx == null ? null : Number(row.rows_approx),
      }));

      return { engine: "sqlserver", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

function toRawColumn(row: ColumnRow): RawColumn {
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable === true,
    primaryKey: Boolean(row.is_primary),
    defaultValue: row.column_default,
    foreignKey:
      row.foreign_table && row.foreign_column
        ? { table: row.foreign_table, column: row.foreign_column }
        : null,
    ordinal: toOrdinal(row.ordinal),
  };
}
