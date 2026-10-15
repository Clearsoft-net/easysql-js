/**
 * Catalog queries for IBM Db2.
 *
 * Metadata is read from `SYSCAT` in four batched queries — tables, columns,
 * primary keys and foreign keys — never one per table. Aliases are quoted
 * because Db2 folds unquoted identifiers to uppercase.
 */

/** Base tables in the current schema, with the optimizer's row estimate. */
export const TABLES_SQL = `SELECT TABNAME AS "table_name", CARD AS "rows_approx"
         FROM SYSCAT.TABLES
         WHERE TYPE = 'T' AND TABSCHEMA = CURRENT SCHEMA
         ORDER BY TABNAME`;

/** Every column of the current schema. */
export const COLUMNS_SQL = `SELECT TABNAME AS "table_name", COLNAME AS "column_name", TYPENAME AS "data_type",
                "NULLS" AS "nulls", "DEFAULT" AS "column_default", COLNO AS "ordinal"
         FROM SYSCAT.COLUMNS
         WHERE TABSCHEMA = CURRENT SCHEMA
         ORDER BY TABNAME, COLNO`;

/** Primary-key columns of the current schema. */
export const PRIMARY_KEYS_SQL = `SELECT k.TABNAME AS "table_name", k.COLNAME AS "column_name"
         FROM SYSCAT.KEYCOLUSE k
         JOIN SYSCAT.TABCONST c
           ON c.CONSTNAME = k.CONSTNAME
          AND c.TABSCHEMA = k.TABSCHEMA
          AND c.TABNAME = k.TABNAME
         WHERE c.TYPE = 'P' AND k.TABSCHEMA = CURRENT SCHEMA
         ORDER BY k.TABNAME, k.COLNAME`;

/** Foreign-key columns of the current schema. */
export const FOREIGN_KEYS_SQL = `SELECT k.TABNAME AS "table_name", k.COLNAME AS "column_name",
                r.REFTABNAME AS "ref_table", rk.COLNAME AS "ref_column"
         FROM SYSCAT.KEYCOLUSE k
         JOIN SYSCAT.TABCONST c
           ON c.CONSTNAME = k.CONSTNAME
          AND c.TABSCHEMA = k.TABSCHEMA
          AND c.TABNAME = k.TABNAME
         JOIN SYSCAT.REFERENCES r
           ON r.CONSTNAME = c.CONSTNAME
          AND r.TABSCHEMA = c.TABSCHEMA
          AND r.TABNAME = c.TABNAME
         JOIN SYSCAT.KEYCOLUSE rk
           ON rk.CONSTNAME = r.REFKEYNAME
          AND rk.TABSCHEMA = r.REFTABSCHEMA
          AND rk.TABNAME = r.REFTABNAME
          AND rk.COLSEQ = k.COLSEQ
         WHERE c.TYPE = 'F' AND k.TABSCHEMA = CURRENT SCHEMA
         ORDER BY k.TABNAME, k.COLNAME`;
