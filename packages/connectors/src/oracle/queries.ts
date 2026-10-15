/**
 * Catalog queries for Oracle Database.
 *
 * The `ALL_*` data-dictionary views describe every object the connected user can
 * see, so each query is scoped to the session's current schema (resolved with
 * `SYS_CONTEXT`) rather than a hard-coded owner. Recycle-bin, nested and
 * secondary (domain index) tables are excluded from the table listing.
 */

/** Metadata name of the schema the session is currently resolving names in. */
const CURRENT_SCHEMA = "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')";

/**
 * Base tables owned by the current schema. `NUM_ROWS` comes from optimizer
 * statistics, so it is `NULL` until the table has been analysed and may be
 * stale afterwards. Recycle-bin, nested and secondary (domain index) tables are
 * excluded. Aliases are quoted so the object keys keep their exact case.
 */
export const TABLES_SQL = `SELECT t.TABLE_NAME AS "table_name",
                           t.NUM_ROWS AS "rows_approx"
                    FROM ALL_TABLES t
                    WHERE t.OWNER = ${CURRENT_SCHEMA}
                      AND t.NESTED = 'NO'
                      AND t.SECONDARY = 'NO'
                      AND t.TABLE_NAME NOT LIKE 'BIN$%'
                    ORDER BY t.TABLE_NAME`;

/** Every visible column of the current schema, batched (no per-table query). */
export const COLUMNS_SQL = `SELECT c.TABLE_NAME AS "table_name",
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
export const PRIMARY_KEYS_SQL = `SELECT cc.TABLE_NAME AS "table_name",
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
export const FOREIGN_KEYS_SQL = `SELECT cc.TABLE_NAME AS "table_name",
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
