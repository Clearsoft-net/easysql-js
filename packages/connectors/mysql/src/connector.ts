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
  Connector,
  IntrospectResult,
  MysqlConnectionConfig,
  QueryResult,
  RawColumn,
  RawTable,
} from "./types.js";

interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  column_key: string;
  referenced_table_name: string | null;
  referenced_column_name: string | null;
  ordinal_position: number;
}

interface TableRow {
  table_name: string;
  table_rows: number | null;
}

export class MysqlConnector implements Connector {
  private readonly config: Required<
    Pick<MysqlConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    MysqlConnectionConfig;
  private connection: Connection | null = null;

  constructor(config: MysqlConnectionConfig) {
    if (!config.host) throw new Error("MysqlConnector: host is required");
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
    const auth = `${encodeURIComponent(this.config.user)}:${encodeURIComponent(this.config.password)}@`;
    const ssl = this.config.ssl ? "?ssl=true" : "";
    const uri = `mysql://${auth}${this.config.host}:${this.config.port}/${this.config.database}${ssl}`;
    try {
      this.connection = await createConnection({
        uri,
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
        const [columnRows] = await connection.query(
          `SELECT COLUMN_NAME AS column_name, DATA_TYPE AS data_type,
                  IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default,
                  COLUMN_KEY AS column_key,
                  REFERENCED_TABLE_NAME AS referenced_table_name,
                  REFERENCED_COLUMN_NAME AS referenced_column_name,
                  ORDINAL_POSITION AS ordinal_position
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
           ORDER BY ORDINAL_POSITION`,
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
