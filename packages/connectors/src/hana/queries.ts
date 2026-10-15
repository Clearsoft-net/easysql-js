/**
 * Catalog queries for SAP HANA.
 *
 * Metadata is read from the `SYS` catalog in batched queries — tables, columns,
 * primary keys, foreign keys and (best-effort) row counts — never one per table.
 * Aliases are quoted because HANA folds unquoted identifiers to uppercase.
 */

/** Base tables in the current schema. */
export const TABLES_SQL = `SELECT TABLE_NAME AS "table_name"
           FROM SYS.TABLES
           WHERE SCHEMA_NAME = CURRENT_SCHEMA AND IS_TEMPORARY = 'FALSE'
           ORDER BY TABLE_NAME`;

/** Every column of the current schema. */
export const COLUMNS_SQL = `SELECT TABLE_NAME AS "table_name", COLUMN_NAME AS "column_name",
                  DATA_TYPE_NAME AS "data_type", IS_NULLABLE AS "is_nullable",
                  DEFAULT_VALUE AS "column_default", POSITION AS "ordinal"
           FROM SYS.TABLE_COLUMNS
           WHERE SCHEMA_NAME = CURRENT_SCHEMA
           ORDER BY TABLE_NAME, POSITION`;

/** Primary-key columns of the current schema. */
export const PRIMARY_KEYS_SQL = `SELECT TABLE_NAME AS "table_name", COLUMN_NAME AS "column_name"
           FROM SYS.CONSTRAINTS
           WHERE SCHEMA_NAME = CURRENT_SCHEMA AND IS_PRIMARY_KEY = 'TRUE'
           ORDER BY TABLE_NAME, POSITION`;

/**
 * Foreign-key columns of the current schema. `SYS.REFERENTIAL_CONSTRAINTS`
 * carries the referenced table/column for each key column.
 */
export const FOREIGN_KEYS_SQL = `SELECT TABLE_NAME AS "table_name", COLUMN_NAME AS "column_name",
                  REFERENCED_TABLE_NAME AS "ref_table",
                  REFERENCED_COLUMN_NAME AS "ref_column"
           FROM SYS.REFERENTIAL_CONSTRAINTS
           WHERE SCHEMA_NAME = CURRENT_SCHEMA
           ORDER BY TABLE_NAME, POSITION`;

/**
 * Best-effort row-count sources, tried in order. `SYS.M_TABLE_STATISTICS`
 * carries `RECORD_COUNT` on some HANA versions; when the view or column is
 * unavailable (or the user lacks access) the estimate falls back to
 * `SYS.M_TABLES`.
 */
export const ROW_COUNT_SOURCES = [
  `SELECT TABLE_NAME AS "table_name", RECORD_COUNT AS "record_count"
       FROM SYS.M_TABLE_STATISTICS
       WHERE SCHEMA_NAME = CURRENT_SCHEMA`,
  `SELECT TABLE_NAME AS "table_name", RECORD_COUNT AS "record_count"
       FROM SYS.M_TABLES
       WHERE SCHEMA_NAME = CURRENT_SCHEMA`,
];
