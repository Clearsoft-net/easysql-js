/**
 * Transport sessions for the PostgreSQL family.
 *
 * The connector talks to a small {@link PgSession} surface, so the transport
 * (`pg` over TCP, Neon over HTTP, Neon over WebSockets) stays interchangeable
 * while introspection and execution logic stay shared.
 */

import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import pg from "pg";
import type { PostgresConnectionConfig } from "./types.js";

export interface QueryResponse<T> {
  rows: T[];
  fields: { name: string }[];
  rowCount: number | null;
}

export interface PgSession {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResponse<T>>;
  close(): Promise<void>;
}

/** The PostgreSQL wire protocol over TCP or a Unix socket. */
export class TcpSession implements PgSession {
  private readonly client: pg.Client;

  constructor(config: PostgresConnectionConfig) {
    this.client = new pg.Client({
      ...(config.connectionString
        ? { connectionString: config.connectionString }
        : config.socket
          ? { host: config.socket, port: config.port }
          : { host: config.host, port: config.port }),
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: config.connectTimeoutMs,
    });
  }

  async open(): Promise<void> {
    await this.client.connect();
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResponse<T>> {
    const res = await this.client.query(sql, params as unknown[]);
    return {
      rows: res.rows as T[],
      fields: res.fields ?? [],
      rowCount: res.rowCount ?? null,
    };
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}

interface NeonHttpResponse {
  rows?: unknown[];
  fields?: { name: string }[];
  rowCount?: number | null;
}

type NeonHttpQuery = (sql: string, params?: unknown[]) => Promise<NeonHttpResponse>;

/**
 * One-shot queries over HTTPS. Each call is an independent `fetch`, so there is
 * no session state and no persistent connection (ideal for edge runtimes).
 */
export class NeonHttpSession implements PgSession {
  private readonly run: NeonHttpQuery;

  constructor(connectionString: string) {
    const sql = neon<false, true>(connectionString, { fullResults: true });
    this.run = sql.query.bind(sql) as unknown as NeonHttpQuery;
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResponse<T>> {
    const res = await this.run(sql, params);
    return {
      rows: (res.rows ?? []) as T[],
      fields: res.fields ?? [],
      rowCount: res.rowCount ?? null,
    };
  }

  async close(): Promise<void> {
    // Nothing to release: HTTP queries do not hold a connection.
  }
}

/**
 * A session over WebSockets, which supports interactive transactions and
 * `LISTEN`/`NOTIFY`. Requires a WebSocket implementation on the runtime.
 */
export class NeonWebSocketSession implements PgSession {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    if (!neonConfig.webSocketConstructor) {
      const implementation = (globalThis as { WebSocket?: unknown }).WebSocket;
      if (!implementation) {
        throw new Error(
          "PostgresConnector: the 'websocket' transport needs a WebSocket implementation. Use Node.js 22+ or set neonConfig.webSocketConstructor.",
        );
      }
      neonConfig.webSocketConstructor = implementation as never;
    }
    this.pool = new Pool({ connectionString });
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResponse<T>> {
    const res = await this.pool.query(sql, params as never[]);
    return {
      rows: res.rows as T[],
      fields: res.fields ?? [],
      rowCount: res.rowCount ?? null,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
