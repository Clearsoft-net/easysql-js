/**
 * libSQL/Turso connector: local schema introspection and query execution.
 *
 * libSQL speaks SQLite, so introspection reads the SQLite catalog directly:
 * `sqlite_master` lists tables, `PRAGMA table_info` reports columns and
 * `PRAGMA foreign_key_list` reports foreign keys. Unlike `node:sqlite`, the
 * `@libsql/client` API is asynchronous, so every lifecycle and metadata call
 * returns a promise.
 *
 * A `file:` URL is opened with `PRAGMA query_only = ON` when `readonly` is set
 * (the default for local files); remote `libsql:`/`https:`/`wss:` URLs are
 * governed by the auth token instead, because each remote statement is an
 * independent request.
 */

import type { Client } from "@libsql/client";
import { createClient } from "@libsql/client";
import { BaseConnector } from "../base-connector.js";
import { PROBE_SQL, pragma } from "../helpers.js";
import type { PragmaColumnRow, PragmaForeignKeyRow, RawQueryResult } from "../types.js";
import { foreignKeyListQuery, rowCountQuery, tableInfoQuery, tablesQuery } from "./queries.js";
import type { IntrospectResult, LibSqlConnectionConfig, RawColumn, RawTable } from "./types.js";

export class LibSqlConnector extends BaseConnector<Client> {
  private readonly config: Required<LibSqlConnectionConfig>;

  constructor(config: LibSqlConnectionConfig) {
    super([config.authToken ?? ""]);
    if (!config.url) throw new Error("LibSqlConnector: url is required");
    this.config = {
      ...config,
      authToken: config.authToken ?? "",
      // Remote databases are authorised per request by their auth token;
      // only a local file has a connection that can be made query-only.
      readonly: config.readonly ?? isFileUrl(config.url),
    };
  }

  /** Opens the client. Safe to call more than once. */
  protected async openHandle(): Promise<Client> {
    // A single pooled connection is what lets `PRAGMA query_only` stick.
    const client = createClient({
      url: this.config.url,
      authToken: this.config.authToken || undefined,
      ...(this.config.readonly && isFileUrl(this.config.url) ? { concurrency: 1 } : {}),
    });
    await client.execute(PROBE_SQL);
    if (this.config.readonly && isFileUrl(this.config.url)) {
      await client.execute(pragma("query_only = ON"));
    }
    return client;
  }

  /** Closes the client. Safe to call when not connected. */
  protected async closeHandle(client: Client): Promise<void> {
    client.close();
  }

  /** Introspects the database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const client = this.requireHandle();
    try {
      const tableResult = await client.execute(tablesQuery().text);

      const tables: RawTable[] = [];
      for (const row of tableResult.rows) {
        const name = String(row.name);
        const columns = await client.execute(tableInfoQuery(name));
        const foreignKeys = await client.execute(foreignKeyListQuery(name));

        const columnRows = columns.rows as unknown as PragmaColumnRow[];
        const foreignKeyRows = foreignKeys.rows as unknown as PragmaForeignKeyRow[];

        const fkByColumn = new Map<string, { table: string; column: string }>();
        for (const fk of foreignKeyRows) {
          if (fk.to === null) continue;
          fkByColumn.set(fk.from, { table: fk.table, column: fk.to });
        }

        tables.push({
          name,
          columns: columnRows.map((column) => toRawColumn(column, fkByColumn)),
          rowsApprox: await countRows(client, name),
        });
      }

      return { engine: "libsql", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs `sql` and reports its columns and raw rows. */
  protected async runQuery(client: Client, sql: string): Promise<RawQueryResult> {
    const result = await client.execute(sql);
    const columns = result.columns;
    const rows = result.rows as unknown as Record<string, unknown>[];
    return {
      columns,
      rows,
      rowCount: columns.length > 0 ? rows.length : Number(result.rowsAffected),
    };
  }
}

function toRawColumn(
  row: PragmaColumnRow,
  fkByColumn: Map<string, { table: string; column: string }>,
): RawColumn {
  return {
    name: row.name,
    dataType: row.type || "BLOB",
    // A primary key is never nullable; PRAGMA reports notnull=0 for an
    // INTEGER PRIMARY KEY, so it is excluded explicitly.
    nullable: row.notnull === 0 && row.pk === 0,
    primaryKey: row.pk > 0,
    defaultValue: row.dflt_value,
    foreignKey: fkByColumn.get(row.name) ?? null,
    ordinal: row.cid,
  };
}

/** Best-effort exact row count; returns `null` when the table cannot be read. */
async function countRows(client: Client, table: string): Promise<number | null> {
  try {
    const result = await client.execute(rowCountQuery(table).text);
    const value = result.rows[0]?.c;
    return value === undefined || value === null ? null : Number(value);
  } catch {
    return null;
  }
}

/** True when the URL addresses a local file rather than a remote server. */
function isFileUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith("file:");
}
