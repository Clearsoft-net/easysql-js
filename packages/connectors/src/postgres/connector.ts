/**
 * PostgreSQL connector: local schema introspection and query execution.
 *
 * The connection is opened explicitly with {@link PostgresConnector.connect} and
 * released with {@link PostgresConnector.close}. Credentials are held in memory
 * for the lifetime of the connector only and are stripped from every error
 * message that leaves the process.
 *
 * The same connector serves every PostgreSQL-compatible server. The `provider`
 * selects which catalog queries are safe (Redshift is PostgreSQL 8.0 based) and
 * the `transport` selects how the server is reached: `pg` over TCP, or the Neon
 * serverless driver over HTTP/WebSockets.
 */

import { BaseConnector } from "../base-connector.js";
import { columnsQuery, tablesQuery } from "./introspection.js";
import { NeonHttpSession, NeonWebSocketSession, type PgSession, TcpSession } from "./session.js";
import type {
  ColumnRow,
  IntrospectResult,
  PostgresConnectionConfig,
  PostgresProvider,
  PostgresTransport,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

export class PostgresConnector extends BaseConnector<PgSession> {
  private readonly config: PostgresConnectionConfig &
    Required<
      Pick<PostgresConnectionConfig, "port" | "ssl" | "connectTimeoutMs" | "provider" | "transport">
    >;

  constructor(config: PostgresConnectionConfig) {
    super(
      [config.password, config.connectionString].filter(
        (secret): secret is string => secret !== undefined && secret.length > 0,
      ),
    );
    const provider: PostgresProvider = config.provider ?? "postgres";
    const transport: PostgresTransport = config.transport ?? "tcp";
    const remote = transport !== "tcp";

    if (remote && provider !== "neon") {
      throw new Error(
        `PostgresConnector: transport '${transport}' is only supported for the Neon provider`,
      );
    }
    if (remote) {
      if (!config.connectionString) {
        throw new Error(
          `PostgresConnector: connectionString is required for the '${transport}' transport`,
        );
      }
    } else if (!config.connectionString && !config.host && !config.socket) {
      throw new Error("PostgresConnector: host or socket is required");
    }
    if (!config.connectionString) {
      if (!config.user) throw new Error("PostgresConnector: user is required");
      if (!config.database) throw new Error("PostgresConnector: database is required");
    }

    this.config = {
      port: 5432,
      ssl: false,
      connectTimeoutMs: 10_000,
      ...config,
      provider,
      transport,
    };
  }

  /** Opens the connection. Safe to call more than once. */
  protected async openHandle(): Promise<PgSession> {
    const session = this.createSession();
    try {
      if (session instanceof TcpSession) await session.open();
      return session;
    } catch (error) {
      await session.close().catch(() => {});
      throw error;
    }
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  protected async closeHandle(session: PgSession): Promise<void> {
    await session.close();
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(session: PgSession, sql: string): Promise<RawQueryResult> {
    const res = await session.query(sql);
    return {
      columns: res.fields.map((field) => field.name),
      rows: res.rows as Record<string, unknown>[],
    };
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const session = this.requireHandle();
    try {
      const tablesRes = await session.query<TableRow>(tablesQuery(this.config.provider));

      const tables: RawTable[] = [];
      for (const row of tablesRes.rows) {
        const columnsRes = await session.query<ColumnRow>(columnsQuery(), [row.table_name]);
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

  private createSession(): PgSession {
    if (this.config.transport === "http") {
      return new NeonHttpSession(this.config.connectionString as string);
    }
    if (this.config.transport === "websocket") {
      return new NeonWebSocketSession(this.config.connectionString as string);
    }
    return new TcpSession(this.config);
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
