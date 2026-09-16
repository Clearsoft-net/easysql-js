/**
 * PostgreSQL connector: local schema introspection and query execution.
 *
 * The connection is opened explicitly with {@link PostgresConnector.connect}
 * and released with {@link PostgresConnector.close}. Credentials are held in
 * memory for the lifetime of the connector only and are stripped from every
 * error message that leaves the process.
 */

import { sanitizeErrorMessage } from "@easysql/common";
import pg from "pg";
import type {
  Connector,
  IntrospectResult,
  PostgresConnectionConfig,
  QueryResult,
  RawColumn,
  RawTable,
} from "./types.js";

interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_primary: boolean;
  foreign_table: string | null;
  foreign_column: string | null;
  ordinal: number;
}

interface TableRow {
  table_name: string;
  rows_approx: string | number | null;
}

export class PostgresConnector implements Connector {
  private readonly config: Required<
    Pick<PostgresConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    PostgresConnectionConfig;
  private client: pg.Client | null = null;

  constructor(config: PostgresConnectionConfig) {
    if (!config.host) throw new Error("PostgresConnector: host is required");
    if (!config.user) throw new Error("PostgresConnector: user is required");
    if (!config.database) throw new Error("PostgresConnector: database is required");
    this.config = {
      port: 5432,
      ssl: false,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /** Opens the connection. Safe to call more than once. */
  async connect(): Promise<void> {
    if (this.client) return;
    const client = new pg.Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: this.config.connectTimeoutMs,
    });
    try {
      await client.connect();
      this.client = client;
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  async close(): Promise<void> {
    if (!this.client) return;
    const client = this.client;
    this.client = null;
    await client.end();
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const client = this.requireConnection();
    try {
      const tablesRes = await client.query<TableRow>(
        `SELECT c.relname AS table_name,
                c.reltuples::bigint AS rows_approx
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = current_schema()
           AND c.relkind = 'r'
           AND NOT c.relispartition
         ORDER BY c.relname`,
      );

      const tables: RawTable[] = [];
      for (const row of tablesRes.rows) {
        const columnsRes = await client.query<ColumnRow>(
          `SELECT a.attname AS column_name,
                  format_type(a.atttypid, a.atttypmod) AS data_type,
                  NOT (a.attnotnull) AS is_nullable,
                  pg_get_expr(d.adbin, d.adrelid) AS column_default,
                  EXISTS (
                    SELECT 1 FROM pg_index i
                    WHERE i.indrelid = c.oid AND a.attnum = ANY(i.indkey) AND i.indisprimary
                  ) AS is_primary,
                  ref.relname AS foreign_table,
                  ref_att.attname AS foreign_column,
                  a.attnum AS ordinal
           FROM pg_attribute a
           JOIN pg_class c ON c.oid = a.attrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
           LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND a.attnum = ANY(con.conkey) AND con.contype = 'f'
           LEFT JOIN pg_class ref ON ref.oid = con.confrelid
           LEFT JOIN pg_attribute ref_att ON ref_att.attrelid = ref.oid AND ref_att.attnum = con.confkey[1]
           WHERE n.nspname = current_schema()
             AND c.relname = $1
             AND a.attnum > 0
             AND NOT a.attisdropped
           ORDER BY a.attnum`,
          [row.table_name],
        );

        tables.push({
          name: row.table_name,
          columns: columnsRes.rows.map(toRawColumn),
          rowsApprox: row.rows_approx === null ? null : Number(row.rows_approx),
        });
      }

      return { engine: "postgresql", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Executes a validated SQL statement and returns typed rows. */
  async execute(sql: string): Promise<QueryResult> {
    const client = this.requireConnection();
    const started = Date.now();
    try {
      const res = await client.query(sql);
      const rows = res.rows as Record<string, unknown>[];
      const columns = (res.fields ?? []).map((field) => field.name);
      return {
        columns,
        rows: rows.map((row) => pick(row, columns)),
        rowCount: rows.length,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  private requireConnection(): pg.Client {
    if (!this.client) throw new Error("PostgresConnector: not connected — call connect() first");
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
    nullable: row.is_nullable,
    primaryKey: row.is_primary,
    defaultValue: row.column_default,
    foreignKey:
      row.foreign_table && row.foreign_column
        ? { table: row.foreign_table, column: row.foreign_column }
        : null,
    ordinal: row.ordinal,
  };
}

function pick(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of columns) out[column] = row[column];
  return out;
}
