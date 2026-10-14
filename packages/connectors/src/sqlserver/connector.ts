/**
 * Microsoft SQL Server connector: local schema introspection and query
 * execution.
 *
 * The connection pool is opened explicitly with {@link SqlServerConnector.connect}
 * and released with {@link SqlServerConnector.close}. Credentials are held in
 * memory for the lifetime of the connector only and are stripped from every
 * error message that leaves the process.
 *
 * Introspection reads the `sys.*` catalog with one joined query for the tables
 * (with an approximate row count) and one joined query for every column of the
 * database, then groups the columns in memory — never one query per column.
 */

import type { ConnectionPool, IColumnMetadata, IRecordSet } from "mssql";
import sql from "mssql";
import { BaseConnector } from "../base-connector.js";
import type {
  ColumnRow,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
  SqlServerConnectionConfig,
  TableRow,
} from "./types.js";

/**
 * Base tables with an approximate row count. `sys.partitions` holds one row per
 * index partition; `index_id` 0 is a heap and 1 is the clustered index, so
 * summing those gives the table's row count without scanning it (unlike
 * `COUNT(*)`). `object_id` travels along so columns can be grouped reliably
 * even when two schemas declare the same table name.
 */
const TABLES_QUERY = `SELECT t.object_id AS table_id,
       s.name AS schema_name,
       t.name AS table_name,
       SUM(p.rows) AS rows_approx
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
LEFT JOIN sys.partitions AS p
  ON p.object_id = t.object_id AND p.index_id IN (0, 1)
WHERE t.is_ms_shipped = 0
GROUP BY t.object_id, s.name, t.name
ORDER BY s.name, t.name, t.object_id`;

/**
 * Every column of every user table in a single joined result set:
 * `sys.columns` joined to `sys.types` (native type name),
 * `sys.default_constraints` (default expression), a primary-key derived table
 * over `sys.indexes`/`sys.index_columns`, and an `OUTER APPLY` that picks at
 * most one foreign-key target per column (a column can belong to more than one
 * foreign key, so a plain join would duplicate the row).
 */
const COLUMNS_QUERY = `SELECT t.object_id AS table_id,
       s.name AS schema_name,
       t.name AS table_name,
       c.name AS column_name,
       ty.name AS data_type,
       c.is_nullable AS is_nullable,
       dc.definition AS default_value,
       CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS is_primary_key,
       fk.referenced_table AS foreign_table,
       fk.referenced_column AS foreign_column,
       c.column_id AS ordinal
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.columns AS c ON c.object_id = t.object_id
JOIN sys.types AS ty ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.default_constraints AS dc
  ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
LEFT JOIN (
  SELECT ic.object_id, ic.column_id
  FROM sys.indexes AS i
  JOIN sys.index_columns AS ic
    ON ic.object_id = i.object_id AND ic.index_id = i.index_id
  WHERE i.is_primary_key = 1
) AS pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
OUTER APPLY (
  SELECT TOP 1 ref_t.name AS referenced_table, ref_c.name AS referenced_column
  FROM sys.foreign_key_columns AS fkc
  JOIN sys.tables AS ref_t ON ref_t.object_id = fkc.referenced_object_id
  JOIN sys.columns AS ref_c
    ON ref_c.object_id = fkc.referenced_object_id
   AND ref_c.column_id = fkc.referenced_column_id
  WHERE fkc.parent_object_id = c.object_id
    AND fkc.parent_column_id = c.column_id
  ORDER BY fkc.constraint_object_id, fkc.constraint_column_id
) AS fk
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name, t.object_id, c.column_id`;

export class SqlServerConnector extends BaseConnector<ConnectionPool> {
  private readonly config: Required<
    Pick<
      SqlServerConnectionConfig,
      "port" | "encrypt" | "trustServerCertificate" | "connectTimeoutMs"
    >
  > &
    SqlServerConnectionConfig;

  constructor(config: SqlServerConnectionConfig) {
    super([config.password]);
    if (!config.host) throw new Error("SqlServerConnector: host is required");
    if (!config.user) throw new Error("SqlServerConnector: user is required");
    if (!config.database) throw new Error("SqlServerConnector: database is required");
    this.config = {
      port: 1433,
      encrypt: true,
      trustServerCertificate: false,
      connectTimeoutMs: 10_000,
      ...config,
    };
  }

  /** Opens the connection pool. Called once by {@link SqlServerConnector.connect}. */
  protected async openHandle(): Promise<ConnectionPool> {
    const pool = new sql.ConnectionPool({
      server: this.config.host as string,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionTimeout: this.config.connectTimeoutMs,
      options: {
        encrypt: this.config.encrypt,
        trustServerCertificate: this.config.trustServerCertificate,
      },
    });
    return await pool.connect();
  }

  /** Closes the pool obtained from {@link SqlServerConnector.openHandle}. */
  protected async closeHandle(pool: ConnectionPool): Promise<void> {
    await pool.close();
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(pool: ConnectionPool, sqlText: string): Promise<RawQueryResult> {
    const result = await pool.request().query(sqlText);
    const recordset = result.recordset as IRecordSet<Record<string, unknown>> | undefined;
    if (!recordset) {
      // Statements that return no result set (INSERT/UPDATE/DELETE/DDL):
      // mssql reports the affected rows instead of a recordset.
      const rowCount = (result.rowsAffected ?? []).reduce((total, count) => total + count, 0);
      return { columns: [], rows: [], rowCount };
    }
    const columns = Object.keys((recordset.columns ?? {}) as IColumnMetadata);
    return { columns, rows: recordset as unknown as Record<string, unknown>[] };
  }

  /** Introspects the configured database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    const pool = this.requireHandle();
    try {
      const tablesResult = await pool.request().query<TableRow>(TABLES_QUERY);
      const columnsResult = await pool.request().query<ColumnRow>(COLUMNS_QUERY);

      const columnsByTable = new Map<number, RawColumn[]>();
      for (const row of columnsResult.recordset) {
        const columns = columnsByTable.get(row.table_id);
        if (columns) columns.push(toRawColumn(row));
        else columnsByTable.set(row.table_id, [toRawColumn(row)]);
      }

      const tables: RawTable[] = tablesResult.recordset.map((row) => ({
        name: row.table_name,
        columns: columnsByTable.get(row.table_id) ?? [],
        rowsApprox: row.rows_approx === null ? null : Number(row.rows_approx),
      }));

      return { engine: "sqlserver", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

function toRawColumn(row: ColumnRow): RawColumn {
  return {
    name: row.column_name,
    dataType: row.data_type,
    nullable: row.is_nullable,
    primaryKey: Boolean(row.is_primary_key),
    defaultValue: row.default_value,
    foreignKey:
      row.foreign_table && row.foreign_column
        ? { table: row.foreign_table, column: row.foreign_column }
        : null,
    ordinal: row.ordinal,
  };
}
