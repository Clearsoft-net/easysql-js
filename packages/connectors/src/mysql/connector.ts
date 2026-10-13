/**
 * MySQL/MariaDB connector: local schema introspection and query execution.
 *
 * The connection is opened explicitly with {@link MysqlConnector.connect} and
 * released with {@link MysqlConnector.close}. Credentials are held in memory
 * for the lifetime of the connector only and are stripped from every error
 * message that leaves the process.
 */

import { sanitizeErrorMessage } from "@easysql/common";
import { type Connection, createConnection } from "mysql2/promise";
import type {
  ColumnRow,
  Connector,
  IntrospectResult,
  MysqlConnectionConfig,
  QueryResult,
  RawColumn,
  RawTable,
  TableRow,
} from "./types.js";

export class MysqlConnector implements Connector {
  private readonly config: Required<
    Pick<MysqlConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    MysqlConnectionConfig;
  private connection: Connection | null = null;

  constructor(config: MysqlConnectionConfig) {
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
  async connect(): Promise<void> {
    if (this.connection) return;
    try {
      this.connection = await createConnection({
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
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  async close(): Promise<void> {
    if (!this.connection) return;
    const connection = this.connection;
    this.connection = null;
    await connection.end();
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const connection = await this.requireConnection();
    try {
      const [tableRows] = await connection.query(
        `SELECT TABLE_NAME AS table_name, TABLE_ROWS AS table_rows
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`,
        [this.config.database],
      );

      const tables: RawTable[] = [];
      for (const table of tableRows as TableRow[]) {
        // Foreign keys live in KEY_COLUMN_USAGE: information_schema.COLUMNS
        // has no REFERENCED_* columns, so reading them from there fails on any
        // database that has at least one table.
        const [columnRows] = await connection.query(
          `SELECT c.COLUMN_NAME AS column_name, c.DATA_TYPE AS data_type,
                  c.IS_NULLABLE AS is_nullable, c.COLUMN_DEFAULT AS column_default,
                  c.COLUMN_KEY AS column_key,
                  k.REFERENCED_TABLE_NAME AS referenced_table_name,
                  k.REFERENCED_COLUMN_NAME AS referenced_column_name,
                  c.ORDINAL_POSITION AS ordinal_position
           FROM information_schema.COLUMNS c
           LEFT JOIN information_schema.KEY_COLUMN_USAGE k
             ON k.TABLE_SCHEMA = c.TABLE_SCHEMA
            AND k.TABLE_NAME = c.TABLE_NAME
            AND k.COLUMN_NAME = c.COLUMN_NAME
            AND k.REFERENCED_TABLE_NAME IS NOT NULL
           WHERE c.TABLE_SCHEMA = ? AND c.TABLE_NAME = ?
           ORDER BY c.ORDINAL_POSITION`,
          [this.config.database, table.table_name],
        );

        tables.push({
          name: table.table_name,
          columns: (columnRows as ColumnRow[]).map(toRawColumn),
          rowsApprox: table.table_rows,
        });
      }

      return { engine: "mysql", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Executes a validated SQL statement and returns typed rows. */
  async execute(sql: string): Promise<QueryResult> {
    const connection = await this.requireConnection();
    const started = Date.now();
    try {
      const [rows, fields] = await connection.query(sql);
      const recordRows = rows as Record<string, unknown>[];
      const columns = (fields ?? []).map((field) => field.name);
      return {
        columns,
        rows: recordRows.map((row) => pick(row, columns)),
        rowCount: recordRows.length,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  private async requireConnection(): Promise<Connection> {
    if (!this.connection) await this.connect();
    if (!this.connection) throw new Error("MysqlConnector: not connected");
    return this.connection;
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
    nullable: row.is_nullable === "YES",
    primaryKey: row.column_key === "PRI",
    defaultValue: row.column_default,
    foreignKey:
      row.referenced_table_name && row.referenced_column_name
        ? { table: row.referenced_table_name, column: row.referenced_column_name }
        : null,
    ordinal: row.ordinal_position,
  };
}

function pick(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of columns) out[column] = row[column];
  return out;
}
