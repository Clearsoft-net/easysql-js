/**
 * Catalog queries for Snowflake.
 *
 * Introspection reads `INFORMATION_SCHEMA` only. `TABLES` lists the `BASE
 * TABLE`s in the current database/schema; `COLUMNS`, joined with
 * `KEY_COLUMN_USAGE` and `TABLE_CONSTRAINTS`, supplies the column metadata
 * together with primary and foreign keys.
 *
 * The constraint views are preferred over `SHOW PRIMARY KEYS` / `SHOW IMPORTED
 * KEYS` because they are plain SQL: they compose into a single query and return
 * one row per constraint column instead of the driver-specific `SHOW` shape.
 */

/** Lists the `BASE TABLE`s in the current database/schema. */
export const TABLES_SQL = `SELECT TABLE_NAME AS table_name
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_CATALOG = CURRENT_DATABASE()
           AND TABLE_SCHEMA = CURRENT_SCHEMA()
           AND TABLE_TYPE = 'BASE TABLE'
         ORDER BY TABLE_NAME`;

/** Lists the columns of every table, with primary and foreign key metadata. */
export const COLUMNS_SQL = `SELECT c.TABLE_NAME AS table_name,
                c.COLUMN_NAME AS column_name,
                c.DATA_TYPE AS data_type,
                c.IS_NULLABLE AS is_nullable,
                c.COLUMN_DEFAULT AS column_default,
                c.ORDINAL_POSITION AS ordinal_position,
                CASE WHEN pk.CONSTRAINT_TYPE IS NULL THEN 0 ELSE 1 END AS primary_key,
                fk.TABLE_NAME AS foreign_table,
                fk.COLUMN_NAME AS foreign_column
         FROM INFORMATION_SCHEMA.COLUMNS c
         LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
           ON ku.TABLE_CATALOG = c.TABLE_CATALOG
          AND ku.TABLE_SCHEMA = c.TABLE_SCHEMA
          AND ku.TABLE_NAME = c.TABLE_NAME
          AND ku.COLUMN_NAME = c.COLUMN_NAME
         LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk
           ON pk.CONSTRAINT_CATALOG = ku.CONSTRAINT_CATALOG
          AND pk.CONSTRAINT_SCHEMA = ku.CONSTRAINT_SCHEMA
          AND pk.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          AND pk.CONSTRAINT_TYPE = 'PRIMARY KEY'
         LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk
           ON fk.CONSTRAINT_CATALOG = ku.CONSTRAINT_CATALOG
          AND fk.CONSTRAINT_SCHEMA = ku.CONSTRAINT_SCHEMA
          AND fk.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          AND fk.TABLE_NAME <> ku.TABLE_NAME
         WHERE c.TABLE_CATALOG = CURRENT_DATABASE()
           AND c.TABLE_SCHEMA = CURRENT_SCHEMA()
         ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`;
