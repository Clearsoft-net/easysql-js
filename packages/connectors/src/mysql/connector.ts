/**
 * MySQL/MariaDB connector: local schema introspection and query execution.
 *
 * The connection is opened explicitly with {@link MysqlConnector.connect} and
 * released with {@link MysqlConnector.close}. Credentials are held in memory
 * for the lifetime of the connector only and are stripped from every error
 * message that leaves the process.
 */

import { type Connection, createConnection } from "mysql2/promise";
import { BaseConnector } from "../base-connector.js";
import { toOrdinal } from "../internal.js";
import type { ColumnRow, RawQueryResult, TableRow } from "../types.js";
import { columnsQuery, tablesQuery } from "./queries.js";
import type { IntrospectResult, MysqlConnectionConfig, RawColumn, RawTable } from "./types.js";

export class MysqlConnector extends BaseConnector<Connection> {
  private readonly config: Required<
    Pick<MysqlConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    MysqlConnectionConfig;

  constructor(config: MysqlConnectionConfig) {
    super([config.password]);
    if (!config.host && !config.socket)
      throw new Error("MysqlConnector: host or socket is required");
    if (!config.user) throw new Error("MysqlConnector: user is required");
    if (!config.database) throw new Error("MysqlConnector: database is required");
    this.config = {
      port: 3306,
      ssl: false,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /** Opens the connection. Safe to call more than once. */
  protected async openHandle(): Promise<Connection> {
    return createConnection({
      ...(this.config.socket
        ? { socketPath: this.config.socket }
        : { host: this.config.host, port: this.config.port }),
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? {} : undefined,
      multipleStatements: false,
      connectTimeout: this.config.connectTimeoutMs,
    });
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  protected async closeHandle(connection: Connection): Promise<void> {
    await connection.end();
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(connection: Connection, sql: string): Promise<RawQueryResult> {
    const [rows, fields] = await connection.query(sql);
    return {
      columns: (fields ?? []).map((field) => field.name),
      rows: rows as Record<string, unknown>[],
    };
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const connection = this.requireHandle();
    try {
      const tablesQ = tablesQuery(this.config.database);
      const [tableRows] = await connection.query(tablesQ.text, tablesQ.values);

      const tables: RawTable[] = [];
      for (const table of tableRows as TableRow[]) {
        const columnsQ = columnsQuery(this.config.database, table.table_name);
        const [columnRows] = await connection.query(columnsQ.text, columnsQ.values);

        tables.push({
          name: table.table_name,
          columns: (columnRows as ColumnRow[]).map(toRawColumn),
          rowsApprox: table.rows_approx == null ? null : Number(table.rows_approx),
        });
      }

      return { engine: "mysql", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

function toRawColumn(row: ColumnRow): RawColumn {
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable === "YES",
    primaryKey: Number(row.is_primary) === 1,
    defaultValue: row.column_default,
    foreignKey:
      row.foreign_table && row.foreign_column
        ? { table: row.foreign_table, column: row.foreign_column }
        : null,
    ordinal: toOrdinal(row.ordinal),
  };
}
