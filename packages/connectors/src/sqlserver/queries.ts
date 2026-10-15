/**
 * Catalog queries for Microsoft SQL Server.
 *
 * Both queries read the `sys.*` catalog: one joined query lists the tables (with
 * an approximate row count) and another returns every column of the database in
 * a single result set, which the connector then groups in memory.
 */

/**
 * Base tables with an approximate row count. `sys.partitions` holds one row per
 * index partition; `index_id` 0 is a heap and 1 is the clustered index, so
 * summing those gives the table's row count without scanning it (unlike
 * `COUNT(*)`). `object_id` travels along so columns can be grouped reliably
 * even when two schemas declare the same table name.
 */
export const TABLES_SQL = `SELECT t.object_id AS table_id,
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
export const COLUMNS_SQL = `SELECT t.object_id AS table_id,
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
