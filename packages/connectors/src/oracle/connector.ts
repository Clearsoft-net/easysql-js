/**
 * Oracle Database connector: local schema introspection and query execution.
 *
 * The connection is opened explicitly with {@link OracleConnector.connect} and
 * released with {@link OracleConnector.close}. `oracledb` is used in its
 * default Thin mode (pure JavaScript), so no Oracle Client libraries are
 * required. Credentials are held in memory for the lifetime of the connector
 * only and are stripped from every error message that leaves the process.
 */

// `oracledb` v26 ships no type declarations and `@types/oracledb` is not a
// dependency of this package, so the Thin-mode surface used here is described
// by the `OracleDriver` interface in `./types.js`.
// biome-ignore lint/suspicious/noTsIgnore: `oracledb` has no bundled declarations.
// @ts-ignore -- TS7016: module 'oracledb' has no declaration file.
import oracledb from "oracledb";
import { BaseConnector } from "../base-connector.js";
import { columnKey } from "../helpers.js";
import { toOrdinal } from "../internal.js";
import { columnsQuery, foreignKeysQuery, primaryKeysQuery, tablesQuery } from "./queries.js";
import type {
  ColumnRow,
  ForeignKeyRow,
  IntrospectResult,
  KeyColumnRow,
  OracleConnection,
  OracleConnectionConfig,
  OracleDriver,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

const driver = oracledb as OracleDriver;

export class OracleConnector extends BaseConnector<OracleConnection> {
  private readonly config: Required<Pick<OracleConnectionConfig, "port" | "connectTimeoutMs">> &
    OracleConnectionConfig;

  constructor(config: OracleConnectionConfig) {
    super([config.password]);
    if (!config.user) throw new Error("OracleConnector: user is required");
    if (!config.connectString && !(config.host && config.serviceName))
      throw new Error("OracleConnector: connectString or host and serviceName is required");
    this.config = {
      port: 1521,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /**
   * The effective Easy Connect string: an explicit `connectString` verbatim, or
   * `host:port/serviceName` assembled from the discrete fields.
   */
  get connectString(): string {
    const { connectString, host, port, serviceName } = this.config;
    if (connectString) return connectString;
    return `${host}:${port}/${serviceName}`;
  }

  /** Opens the connection. Called once by {@link OracleConnector.connect}. */
  protected async openHandle(): Promise<OracleConnection> {
    return driver.getConnection({
      user: this.config.user,
      password: this.config.password,
      connectString: this.connectString,
      // node-oracledb expresses timeouts in seconds.
      connectTimeout: Math.max(1, Math.ceil(this.config.connectTimeoutMs / 1000)),
    });
  }

  /** Closes the connection obtained from {@link OracleConnector.openHandle}. */
  protected async closeHandle(connection: OracleConnection): Promise<void> {
    await connection.close();
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(connection: OracleConnection, sql: string): Promise<RawQueryResult> {
    const result = await connection.execute<Record<string, unknown>>(
      sql,
      {},
      {
        outFormat: driver.OUT_FORMAT_OBJECT,
        // Without this a DML statement would be rolled back when the connection
        // closes; every other engine commits implicitly.
        autoCommit: true,
      },
    );
    const columns = (result.metaData ?? []).map((column) => column.name);
    const rows = result.rows ?? [];
    return {
      columns,
      rows,
      rowCount: result.metaData ? rows.length : (result.rowsAffected ?? 0),
    };
  }

  /** Introspects the current schema and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const connection = this.requireHandle();
    try {
      const tableRows = await this.query<TableRow>(connection, tablesQuery().text);
      const columnRows = await this.query<ColumnRow>(connection, columnsQuery().text);
      const primaryKeyRows = await this.query<KeyColumnRow>(connection, primaryKeysQuery().text);
      const foreignKeyRows = await this.query<ForeignKeyRow>(connection, foreignKeysQuery().text);

      const tables = new Map<string, RawTable>();
      for (const row of tableRows) {
        tables.set(row.table_name, {
          name: row.table_name,
          columns: [],
          rowsApprox:
            row.rows_approx === null || row.rows_approx === undefined
              ? null
              : Number(row.rows_approx),
        });
      }

      const columns = new Map<string, RawColumn>();
      for (const row of columnRows) {
        const table = tables.get(row.table_name ?? "");
        if (!table) continue;
        const column: RawColumn = {
          name: row.column_name,
          dataType: row.data_type,
          nullable: row.is_nullable === "Y",
          defaultValue: normalizeDefault(row.column_default ?? null),
          primaryKey: false,
          foreignKey: null,
          ordinal: toOrdinal(row.ordinal),
        };
        table.columns.push(column);
        columns.set(columnKey(row.table_name ?? "", row.column_name), column);
      }

      for (const row of primaryKeyRows) {
        const column = columns.get(columnKey(row.table_name, row.column_name));
        if (column) column.primaryKey = true;
      }

      for (const row of foreignKeyRows) {
        const column = columns.get(columnKey(row.table_name, row.column_name));
        if (column) {
          column.foreignKey = { table: row.ref_table, column: row.ref_column };
        }
      }

      return { engine: "oracle", tables: [...tables.values()] };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  private async query<T>(connection: OracleConnection, sql: string): Promise<T[]> {
    const result = await connection.execute<T>(
      sql,
      {},
      {
        outFormat: driver.OUT_FORMAT_OBJECT,
      },
    );
    return result.rows ?? [];
  }
}

/** Oracle returns `DATA_DEFAULT` as a padded `LONG`; normalise it to trimmed text. */
function normalizeDefault(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}
