/**
 * Cloudflare D1 connector: schema introspection and query execution.
 *
 * There is no npm driver for D1 and no persistent socket: every statement is a
 * `POST /accounts/{accountId}/d1/database/{databaseId}/query` request against
 * Cloudflare's REST API, issued with the global `fetch`. {@link D1Connector.connect}
 * therefore only validates the configuration and proves reachability with a
 * cheap `SELECT 1`; {@link D1Connector.close} just clears that state.
 * Credentials are held in memory for the lifetime of the connector only and the
 * API token is stripped from every error message that leaves the process.
 *
 * Introspection uses the SQLite catalog exactly like the SQLite connector.
 * Cloudflare documents `PRAGMA table_info("TABLE_NAME")` and
 * `PRAGMA foreign_key_list("TABLE_NAME")` as compatible statements for D1
 * (https://developers.cloudflare.com/d1/sql-api/sql-statements/), so the PRAGMA
 * form is preferred; SQLite's table-valued equivalents
 * (`pragma_table_info(?)` / `pragma_foreign_key_list(?)`) are used as a fallback
 * when the REST endpoint rejects the PRAGMA statement, and the working form is
 * remembered for the rest of the connection.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { BaseConnector } from "../base-connector.js";
import {
  foreignKeyListFallbackQuery,
  foreignKeyListQuery,
  tableInfoFallbackQuery,
  tableInfoQuery,
  tablesQuery,
} from "./queries.js";
import type {
  ColumnRow,
  D1ConnectionConfig,
  D1ResponseBody,
  ForeignKeyRow,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
} from "./types.js";

/** Default Cloudflare API root, including the version prefix. */
export const D1_DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";

export class D1Connector extends BaseConnector<boolean> {
  private readonly config: Required<D1ConnectionConfig>;
  /** Null until a PRAGMA statement has been attempted on this connection. */
  private pragmaSupported: boolean | null = null;

  constructor(config: D1ConnectionConfig) {
    super([config.apiToken]);
    if (!config.accountId) throw new Error("D1Connector: accountId is required");
    if (!config.databaseId) throw new Error("D1Connector: databaseId is required");
    if (!config.apiToken) throw new Error("D1Connector: apiToken is required");
    this.config = {
      accountId: config.accountId,
      databaseId: config.databaseId,
      apiToken: config.apiToken,
      baseUrl: normalizeBaseUrl(config.baseUrl),
    };
  }

  /** Validates the configuration and verifies the database is reachable. */
  protected async openHandle(): Promise<boolean> {
    // A cheap round-trip proves the account, database and token all work.
    await this.query("SELECT 1");
    return true;
  }

  /** Clears the remembered PRAGMA form. Safe to call when not connected. */
  protected async closeHandle(): Promise<void> {
    this.pragmaSupported = null;
  }

  /** Introspects the database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    this.requireHandle();
    try {
      const tableRows = await this.selectRows(tablesQuery().text);

      const tables: RawTable[] = [];
      for (const row of tableRows) {
        const name = String(row.name);
        const columns = await this.readPragma<ColumnRow>(
          name,
          tableInfoQuery,
          tableInfoFallbackQuery,
        );
        const foreignKeys = await this.readPragma<ForeignKeyRow>(
          name,
          foreignKeyListQuery,
          foreignKeyListFallbackQuery,
        );

        const fkByColumn = new Map<string, { table: string; column: string }>();
        for (const fk of foreignKeys) {
          fkByColumn.set(fk.from, { table: fk.table, column: fk.to });
        }

        tables.push({
          name,
          columns: columns.map((column) => toRawColumn(column, fkByColumn)),
          // A COUNT(*) per table would be one extra REST round-trip per table.
          rowsApprox: null,
        });
      }

      return { engine: "d1", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs `sql` and reports its columns and raw rows. */
  protected async runQuery(_handle: boolean, sql: string): Promise<RawQueryResult> {
    const body = await this.query(sql);
    const result = body.result?.[0];
    const rows = Array.isArray(result?.results)
      ? (result.results as Record<string, unknown>[])
      : [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const rowCount =
      rows.length > 0 ? rows.length : (result?.meta?.changes ?? result?.meta?.rows_written ?? 0);
    return { columns, rows, rowCount };
  }

  /**
   * Runs one statement through the REST API and returns the parsed envelope.
   * The endpoint accepts a single `{ sql, params }` query object.
   */
  private async query(sql: string, params?: unknown[]): Promise<D1ResponseBody> {
    const url = `${this.config.baseUrl}/accounts/${encodeURIComponent(
      this.config.accountId,
    )}/d1/database/${encodeURIComponent(this.config.databaseId)}/query`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params: params ?? [] }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`request to ${url} failed: ${message}`);
    }

    const text = await response.text();
    let body: D1ResponseBody;
    try {
      body = text.length > 0 ? (JSON.parse(text) as D1ResponseBody) : {};
    } catch {
      throw new Error(
        `request to ${url} failed with HTTP ${response.status}: ${truncate(text, 500)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `request to ${url} failed with HTTP ${response.status}: ${describeErrors(body)}`,
      );
    }
    if (body.success === false || (body.errors && body.errors.length > 0)) {
      throw new Error(`D1 query failed: ${describeErrors(body)}`);
    }
    return body;
  }

  /** Runs a statement and returns its rows. */
  private async selectRows(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
    const body = await this.query(sql, params);
    const results = body.result?.[0]?.results;
    return Array.isArray(results) ? (results as Record<string, unknown>[]) : [];
  }

  /**
   * Reads one of SQLite's catalog PRAGMAs, preferring the PRAGMA statement that
   * Cloudflare documents as compatible and falling back to the equivalent
   * table-valued function. The table name is always bound as a parameter.
   */
  private async readPragma<T>(
    table: string,
    pragmaSql: (table: string) => string,
    fallbackSql: (table: string) => CompiledQuery,
  ): Promise<T[]> {
    if (this.pragmaSupported !== false) {
      try {
        const rows = await this.selectRows(pragmaSql(table));
        this.pragmaSupported = true;
        return rows as unknown as T[];
      } catch (error) {
        if (this.pragmaSupported === true || !isUnsupportedPragma(error)) throw error;
        this.pragmaSupported = false;
      }
    }
    const fallback = fallbackSql(table);
    return (await this.selectRows(fallback.text, fallback.values)) as unknown as T[];
  }
}

function toRawColumn(
  row: ColumnRow,
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

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed) return D1_DEFAULT_BASE_URL;
  return trimmed.replace(/\/+$/, "");
}

/**
 * True when the failure looks like the REST endpoint refusing a PRAGMA
 * statement rather than a genuine database error, so the table-valued function
 * fallback is worth trying. Only syntax/authorisation failures that mention
 * `PRAGMA` qualify; a real error such as `no such table` must propagate.
 */
function isUnsupportedPragma(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (!message.includes("pragma")) return false;
  return (
    message.includes("syntax") ||
    message.includes("near ") ||
    message.includes("not authorized") ||
    message.includes("not supported") ||
    message.includes("unsupported")
  );
}

function describeErrors(body: D1ResponseBody): string {
  const errors = body.errors ?? [];
  if (errors.length > 0) {
    return errors
      .map((error) => {
        const code = typeof error.code === "number" ? `[${error.code}] ` : "";
        const pointer = error.source?.pointer ? ` (at ${error.source.pointer})` : "";
        return `${code}${error.message ?? "unknown error"}${pointer}`;
      })
      .join("; ");
  }
  return "no error details returned by the Cloudflare API";
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
