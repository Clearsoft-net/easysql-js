/**
 * IBM Db2 connector: local schema introspection and query execution.
 *
 * Metadata is read from the `SYSCAT` catalog in a fixed number of batched
 * queries — tables, columns, primary keys and foreign keys are each fetched
 * once for the whole schema and assembled in memory, so a schema with N tables
 * costs four round trips rather than 4N. The connection is opened explicitly
 * with {@link Db2Connector.connect} and released with {@link Db2Connector.close}.
 * Credentials are held in memory for the lifetime of the connector only and are
 * stripped from every error message that leaves the process.
 */

import type { ConnStr, Database, ODBCResult, SQLResults } from "ibm_db";
import { BaseConnector } from "../base-connector.js";
import { columnKey } from "../helpers.js";
import { columnsQuery, foreignKeysQuery, primaryKeysQuery, tablesQuery } from "./queries.js";
import type {
  ColumnRow,
  Db2ConnectionConfig,
  Db2ConnStr,
  ForeignKeyRow,
  IbmDbModule,
  IntrospectResult,
  KeyColumnRow,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

let driverPromise: Promise<IbmDbModule> | null = null;

/**
 * `ibm_db` is a native, optional peer dependency, so it is imported lazily when
 * a connection is actually opened. Importing the connector (and the unit tests)
 * therefore never requires the native binding to be present.
 */
function loadDriver(): Promise<IbmDbModule> {
  driverPromise ??= import("ibm_db").catch((error: unknown) => {
    driverPromise = null;
    throw error;
  });
  return driverPromise;
}

export class Db2Connector extends BaseConnector<Database> {
  private readonly config: Required<
    Pick<Db2ConnectionConfig, "port" | "ssl" | "connectTimeoutMs">
  > &
    Db2ConnectionConfig;

  constructor(config: Db2ConnectionConfig) {
    super([config.password]);
    if (!config.database) throw new Error("Db2Connector: database is required");
    if (!config.user) throw new Error("Db2Connector: user is required");
    this.config = {
      port: 50_000,
      ssl: false,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /** Opens the connection. Safe to call more than once. */
  protected async openHandle(): Promise<Database> {
    const connStr: Db2ConnStr = {
      DATABASE: this.config.database,
      HOSTNAME: this.config.host ?? "localhost",
      PORT: this.config.port,
      PROTOCOL: "TCPIP",
      UID: this.config.user,
      PWD: this.config.password,
    };
    if (this.config.ssl) connStr.SECURITY = "SSL";
    return openDatabase(connStr, this.connectTimeoutSeconds());
  }

  /** Closes the connection. Safe to call when not connected. */
  protected async closeHandle(database: Database): Promise<void> {
    try {
      await closeDatabase(database);
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(database: Database, sql: string): Promise<RawQueryResult> {
    const result = await queryResult(database, sql);
    if (!result) return { columns: [], rows: [], rowCount: 0 };
    try {
      const columns = result.getColumnNamesSync();
      const rows = await fetchAll(result, database);
      return { columns, rows };
    } finally {
      await closeResult(result);
    }
  }

  /** Introspects the current schema and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const database = this.requireHandle();
    try {
      // Four batched queries: one per metadata concern, never one per table.
      const tableRows = await this.query<TableRow>(database, tablesQuery().text);
      const columnRows = await this.query<ColumnRow>(database, columnsQuery().text);
      const primaryKeyRows = await this.query<KeyColumnRow>(database, primaryKeysQuery().text);
      const foreignKeyRows = await this.query<ForeignKeyRow>(database, foreignKeysQuery().text);

      const columnsByTable = groupBy(columnRows, (row) => row.table_name);
      const primaryKeys = new Set(
        primaryKeyRows.map((row) => columnKey(row.table_name, row.column_name)),
      );
      const foreignKeys = new Map(
        foreignKeyRows.map((row) => [
          columnKey(row.table_name, row.column_name),
          { table: row.ref_table, column: row.ref_column },
        ]),
      );

      const tables: RawTable[] = tableRows.map((table) => ({
        name: table.table_name,
        columns: (columnsByTable.get(table.table_name) ?? []).map((row) =>
          toRawColumn(row, primaryKeys, foreignKeys),
        ),
        rowsApprox: normalizeCard(table.rows_approx),
      }));

      return { engine: "db2", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  private query<T>(database: Database, sql: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      database.query(sql, (error: Error | null, rows: SQLResults) => {
        if (error) reject(error);
        else resolve((rows ?? []) as unknown as T[]);
      });
    });
  }

  /** `ibm_db` takes the connection timeout in seconds. */
  private connectTimeoutSeconds(): number {
    return Math.max(1, Math.ceil(this.config.connectTimeoutMs / 1000));
  }
}

async function openDatabase(connStr: ConnStr, timeoutSeconds: number): Promise<Database> {
  const { open } = await loadDriver();
  return new Promise((resolve, reject) => {
    open(connStr, { connectTimeout: timeoutSeconds }, (error: Error | null, database: Database) => {
      if (error) reject(error);
      else resolve(database);
    });
  });
}

function closeDatabase(database: Database): Promise<void> {
  return new Promise((resolve, reject) => {
    database.close((error: Error | null) => (error ? reject(error) : resolve()));
  });
}

function queryResult(database: Database, sql: string): Promise<ODBCResult | null> {
  return new Promise((resolve, reject) => {
    database.queryResult(sql, (error: Error | null, result?: ODBCResult | null) => {
      if (error) reject(error);
      else resolve(result ?? null);
    });
  });
}

function fetchAll(result: ODBCResult, database: Database): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    result.fetchAll(
      { fetchMode: database.FETCH_OBJECT },
      (error: Error | null, rows: SQLResults | null) => {
        if (error) reject(error);
        else resolve((rows ?? []) as unknown as Record<string, unknown>[]);
      },
    );
  });
}

function closeResult(result: ODBCResult): Promise<void> {
  return new Promise((resolve, reject) => {
    result.close((error: Error | null) => (error ? reject(error) : resolve()));
  });
}

function toRawColumn(
  row: ColumnRow,
  primaryKeys: Set<string>,
  foreignKeys: Map<string, { table: string; column: string }>,
): RawColumn {
  const key = columnKey(row.table_name, row.column_name);
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.nulls === "Y",
    primaryKey: primaryKeys.has(key),
    defaultValue: row.column_default,
    foreignKey: foreignKeys.get(key) ?? null,
    ordinal: row.ordinal,
  };
}

/**
 * `SYSCAT.TABLES.CARD` is `-1` when statistics have not been collected; the
 * connector reports that as "unknown" rather than a bogus row count.
 */
function normalizeCard(value: number | string | bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const card = Number(value);
  return Number.isFinite(card) && card >= 0 ? card : null;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(key(row));
    if (group) group.push(row);
    else grouped.set(key(row), [row]);
  }
  return grouped;
}
