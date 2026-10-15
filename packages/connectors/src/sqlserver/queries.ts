/**
 * Catalog queries for Microsoft SQL Server.
 *
 * Both queries read the `sys.*` catalog: one joined query lists the tables (with
 * an approximate row count) and another returns every column of the database in
 * a single result set, which the connector then groups in memory.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { eq, expr, fn, select } from "@easysql/query-builder";

/**
 * Base tables with an approximate row count. `sys.partitions` holds one row per
 * index partition; `index_id` 0 is a heap and 1 is the clustered index, so
 * summing those gives the table's row count without scanning it (unlike
 * `COUNT(*)`). `object_id` travels along so columns can be grouped reliably
 * even when two schemas declare the same table name.
 */
export function tablesQuery(): CompiledQuery {
  return select({
    table_id: "t.object_id",
    schema_name: "s.name",
    table_name: "t.name",
    rows_approx: fn("SUM", "p.rows"),
  })
    .from("sys.tables AS t")
    .innerJoin("sys.schemas AS s", "s.schema_id", "t.schema_id")
    .leftJoin("sys.partitions AS p", [
      eq("p.object_id", "t.object_id"),
      expr("p.index_id IN (0, 1)"),
    ])
    .where("t.is_ms_shipped", 0)
    .groupBy("t.object_id", "s.name", "t.name")
    .orderBy("s.name", "t.name", "t.object_id")
    .compile("literal");
}

/** The primary-key derived table, joined back on the column's object/column id. */
const PRIMARY_KEYS_JOIN =
  "(SELECT ic.object_id, ic.column_id FROM sys.indexes AS i " +
  "JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id " +
  "WHERE i.is_primary_key = 1) AS pk";

/** The `OUTER APPLY` that picks at most one foreign-key target per column. */
const FOREIGN_KEY_APPLY =
  "OUTER APPLY (SELECT TOP 1 ref_t.name AS referenced_table, ref_c.name AS referenced_column " +
  "FROM sys.foreign_key_columns AS fkc " +
  "JOIN sys.tables AS ref_t ON ref_t.object_id = fkc.referenced_object_id " +
  "JOIN sys.columns AS ref_c ON ref_c.object_id = fkc.referenced_object_id " +
  "AND ref_c.column_id = fkc.referenced_column_id " +
  "WHERE fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id " +
  "ORDER BY fkc.constraint_object_id, fkc.constraint_column_id) AS fk";

/**
 * Every column of every user table in a single joined result set:
 * `sys.columns` joined to `sys.types` (native type name),
 * `sys.default_constraints` (default expression), a primary-key derived table
 * over `sys.indexes`/`sys.index_columns`, and an `OUTER APPLY` that picks at
 * most one foreign-key target per column (a column can belong to more than one
 * foreign key, so a plain join would duplicate the row).
 */
export function columnsQuery(): CompiledQuery {
  return select({
    table_id: "t.object_id",
    schema_name: "s.name",
    table_name: "t.name",
    column_name: "c.name",
    data_type: "ty.name",
    is_nullable: "c.is_nullable",
    default_value: "dc.definition",
    is_primary_key: expr("CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END"),
    foreign_table: "fk.referenced_table",
    foreign_column: "fk.referenced_column",
    ordinal: "c.column_id",
  })
    .from("sys.tables AS t")
    .innerJoin("sys.schemas AS s", "s.schema_id", "t.schema_id")
    .innerJoin("sys.columns AS c", "c.object_id", "t.object_id")
    .innerJoin("sys.types AS ty", "ty.user_type_id", "c.user_type_id")
    .leftJoin("sys.default_constraints AS dc", [
      eq("dc.parent_object_id", "c.object_id"),
      eq("dc.parent_column_id", "c.column_id"),
    ])
    .leftJoin(PRIMARY_KEYS_JOIN, [
      eq("pk.object_id", "c.object_id"),
      eq("pk.column_id", "c.column_id"),
    ])
    .raw(FOREIGN_KEY_APPLY)
    .where("t.is_ms_shipped", 0)
    .orderBy("s.name", "t.name", "t.object_id", "c.column_id")
    .compile("literal");
}
