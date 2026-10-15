/**
 * Catalog queries for Firebird.
 *
 * All metadata lives in the `RDB$` system tables. Names are stored fixed-width
 * and space-padded, so every query `TRIM`s them; the connector trims the same
 * way in memory. The table listing is static, while the column and foreign-key
 * queries take the table name as a parameter.
 */

/** Base user tables (system tables and views excluded). */
export const TABLES_SQL = `SELECT TRIM(r.RDB$RELATION_NAME) AS "table_name",
                r.RDB$STATISTICS AS "rows_approx"
         FROM RDB$RELATIONS r
         WHERE (r.RDB$SYSTEM_FLAG = 0 OR r.RDB$SYSTEM_FLAG IS NULL)
           AND r.RDB$VIEW_BLR IS NULL
         ORDER BY 1`;

/**
 * User-table columns. `RDB$TYPES` supplies the native type name for
 * `RDB$FIELD_TYPE`; the primary-key flag is resolved through
 * `RDB$RELATION_CONSTRAINTS` → `RDB$INDEX_SEGMENTS` because a column may sit
 * in a non-PK unique index.
 */
export const COLUMNS_SQL = `SELECT TRIM(rf.RDB$FIELD_NAME) AS "field_name",
       rf.RDB$FIELD_POSITION AS "field_position",
       rf.RDB$NULL_FLAG AS "null_flag",
       rf.RDB$DEFAULT_SOURCE AS "default_source",
       TRIM(ty.RDB$TYPE_NAME) AS "type_name",
       f.RDB$FIELD_TYPE AS "field_type",
       f.RDB$FIELD_SUB_TYPE AS "field_sub_type",
       f.RDB$CHARACTER_LENGTH AS "character_length",
       f.RDB$FIELD_LENGTH AS "field_length",
       f.RDB$FIELD_PRECISION AS "field_precision",
       f.RDB$FIELD_SCALE AS "field_scale",
       (SELECT COUNT(*)
          FROM RDB$INDEX_SEGMENTS s
          JOIN RDB$RELATION_CONSTRAINTS rc
            ON rc.RDB$INDEX_NAME = s.RDB$INDEX_NAME
         WHERE rc.RDB$RELATION_NAME = rf.RDB$RELATION_NAME
           AND rc.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
           AND s.RDB$FIELD_NAME = rf.RDB$FIELD_NAME) AS "pk"
FROM RDB$RELATION_FIELDS rf
JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
LEFT JOIN RDB$TYPES ty
  ON ty.RDB$FIELD_NAME = 'RDB$FIELD_TYPE'
 AND ty.RDB$TYPE = f.RDB$FIELD_TYPE
WHERE rf.RDB$RELATION_NAME = ?
ORDER BY rf.RDB$FIELD_POSITION`;

/**
 * Foreign-key columns of one table. `RDB$REF_CONSTRAINTS` names the unique
 * constraint that is referenced; its index segments are matched positionally
 * with the referencing index segments, which is how Firebird stores a
 * composite foreign key.
 */
export const FOREIGN_KEYS_SQL = `SELECT TRIM(fk.RDB$FIELD_NAME) AS "fk_column",
       TRIM(fk.RDB$RELATION_NAME) AS "ref_table",
       TRIM(refs.RDB$FIELD_NAME) AS "ref_column",
       fk.RDB$FIELD_POSITION AS "segment",
       TRIM(rc.RDB$CONSTRAINT_NAME) AS "fk_name"
FROM RDB$RELATION_CONSTRAINTS rc
JOIN RDB$REF_CONSTRAINTS refc
  ON refc.RDB$CONSTRAINT_NAME = rc.RDB$CONSTRAINT_NAME
JOIN RDB$RELATION_CONSTRAINTS urc
  ON urc.RDB$CONSTRAINT_NAME = refc.RDB$CONST_NAME_UQ
JOIN RDB$INDEX_SEGMENTS fk
  ON fk.RDB$INDEX_NAME = rc.RDB$INDEX_NAME
JOIN RDB$INDEX_SEGMENTS refs
  ON refs.RDB$INDEX_NAME = urc.RDB$INDEX_NAME
 AND refs.RDB$FIELD_POSITION = fk.RDB$FIELD_POSITION
WHERE rc.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND rc.RDB$RELATION_NAME = ?
ORDER BY rc.RDB$CONSTRAINT_NAME, fk.RDB$FIELD_POSITION`;
