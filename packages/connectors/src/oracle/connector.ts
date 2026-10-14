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
import type {
  ColumnRow,
  ConstraintColumnRow,
  ForeignKeyRow,
  IntrospectResult,
  OracleConnection,
  OracleConnectionConfig,
  OracleDriver,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

const driver = oracledb as OracleDriver;

/** Metadata name of the schema the session is currently resolving names in. */
const CURRENT_SCHEMA = "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')";

/**
 * Base tables owned by the current schema. `NUM_ROWS` comes from optimizer
 * statistics, so it is `NULL` until the table has been analysed and may be
 * stale afterwards. Recycle-bin, nested and secondary (domain index) tables are
 * excluded. Aliases are quoted so the object keys keep their exact case.
 */
const TABLES_SQL = `SELECT t.TABLE_NAME AS "table_name",
                           t.NUM_ROWS AS "rows_approx"
                    FROM ALL_TABLES t
                    WHERE t.OWNER = ${CURRENT_SCHEMA}
                      AND t.NESTED = 'NO'
                      AND t.SECONDARY = 'NO'
                      AND t.TABLE_NAME NOT LIKE 'BIN$%'
                    ORDER BY t.TABLE_NAME`;

/** Every visible column of the current schema, batched (no per-table query). */
const COLUMNS_SQL = `SELECT c.TABLE_NAME AS "table_name",
                            c.COLUMN_NAME AS "column_name",
                            c.DATA_TYPE AS "data_type",
                            c.NULLABLE AS "nullable",
                            c.DATA_DEFAULT AS "data_default",
                            c.COLUMN_ID AS "column_id"
                     FROM ALL_TAB_COLUMNS c
                     WHERE c.OWNER = ${CURRENT_SCHEMA}
                       AND c.HIDDEN_COLUMN = 'NO'
                     ORDER BY c.TABLE_NAME, c.COLUMN_ID`;

/** Primary-key columns (`CONSTRAINT_TYPE = 'P'`) for the current schema. */
const PRIMARY_KEYS_SQL = `SELECT cc.TABLE_NAME AS "table_name",
                                 cc.COLUMN_NAME AS "column_name"
                          FROM ALL_CONSTRAINTS c
                          JOIN ALL_CONS_COLUMNS cc
                            ON cc.OWNER = c.OWNER
                           AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
                          WHERE c.OWNER = ${CURRENT_SCHEMA}
                            AND c.CONSTRAINT_TYPE = 'P'
                          ORDER BY cc.TABLE_NAME, cc.POSITION`;

/**
 * Foreign-key columns (`CONSTRAINT_TYPE = 'R'`). The referenced constraint is
 * resolved through `R_CONSTRAINT_NAME`; composite keys pair the two
 * `ALL_CONS_COLUMNS` rows by `POSITION`, which is the column's position inside
 * its constraint.
 */
const FOREIGN_KEYS_SQL = `SELECT cc.TABLE_NAME AS "table_name",
                                 cc.COLUMN_NAME AS "column_name",
                                 rc.TABLE_NAME AS "foreign_table",
                                 rcc.COLUMN_NAME AS "foreign_column"
                          FROM ALL_CONSTRAINTS c
                          JOIN ALL_CONS_COLUMNS cc
                            ON cc.OWNER = c.OWNER
                           AND cc.CONSTRAINT_NAME = c.CONSTRAINT_NAME
                          JOIN ALL_CONSTRAINTS rc
                            ON rc.OWNER = c.R_OWNER
                           AND rc.CONSTRAINT_NAME = c.R_CONSTRAINT_NAME
                          JOIN ALL_CONS_COLUMNS rcc
                            ON rcc.OWNER = rc.OWNER
                           AND rcc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
                           AND rcc.POSITION = cc.POSITION
                          WHERE c.OWNER = ${CURRENT_SCHEMA}
                            AND c.CONSTRAINT_TYPE = 'R'
                          ORDER BY cc.TABLE_NAME, cc.POSITION`;

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
      const tableRows = await this.query<TableRow>(connection, TABLES_SQL);
      const columnRows = await this.query<ColumnRow>(connection, COLUMNS_SQL);
      const primaryKeyRows = await this.query<ConstraintColumnRow>(connection, PRIMARY_KEYS_SQL);
      const foreignKeyRows = await this.query<ForeignKeyRow>(connection, FOREIGN_KEYS_SQL);

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
        const table = tables.get(row.table_name);
        if (!table) continue;
        const column: RawColumn = {
          name: row.column_name,
          dataType: row.data_type,
          nullable: row.nullable === "Y",
          defaultValue: normalizeDefault(row.data_default),
          primaryKey: false,
          foreignKey: null,
          ordinal:
            row.column_id === null || row.column_id === undefined
              ? undefined
              : Number(row.column_id),
        };
        table.columns.push(column);
        columns.set(columnKey(row.table_name, row.column_name), column);
      }

      for (const row of primaryKeyRows) {
        const column = columns.get(columnKey(row.table_name, row.column_name));
        if (column) column.primaryKey = true;
      }

      for (const row of foreignKeyRows) {
        const column = columns.get(columnKey(row.table_name, row.column_name));
        if (column) {
          column.foreignKey = { table: row.foreign_table, column: row.foreign_column };
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

function columnKey(table: string, column: string): string {
  return `${table}\u0000${column}`;
}

/** Oracle returns `DATA_DEFAULT` as a padded `LONG`; normalise it to trimmed text. */
function normalizeDefault(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}
