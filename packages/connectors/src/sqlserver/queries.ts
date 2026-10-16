/**
 * Catalog queries for Microsoft SQL Server.
 *
 * Both queries read the `sys.*` catalog: one joined query lists the tables (with
 * an approximate row count) and another returns every column of the database in
 * a single result set, which the connector then groups in memory.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { caseWhen, derived, eq, fn, inList, isNull, ref, select } from "@easysql/query-builder";

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
      inList("p.index_id", [0, 1]),
    ])
    .where("t.is_ms_shipped", 0)
    .groupBy("t.object_id", "s.name", "t.name")
    .orderBy("s.name", "t.name", "t.object_id")
    .compile("literal");
}

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
    column_default: "dc.definition",
    is_primary: caseWhen(isNull("pk.column_id"), 0, 1),
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
    .leftJoin(
      derived(
        select({ object_id: "ic.object_id", column_id: "ic.column_id" })
          .from("sys.indexes AS i")
          .innerJoin("sys.index_columns AS ic", [
            eq("ic.object_id", "i.object_id"),
            eq("ic.index_id", "i.index_id"),
          ])
          .where("i.is_primary_key", 1),
        "pk",
      ),
      [eq("pk.object_id", "c.object_id"), eq("pk.column_id", "c.column_id")],
    )
    .outerApply(
      select({ referenced_table: "ref_t.name", referenced_column: "ref_c.name" })
        .prefix("TOP 1")
        .from("sys.foreign_key_columns AS fkc")
        .innerJoin("sys.tables AS ref_t", "ref_t.object_id", "fkc.referenced_object_id")
        .innerJoin("sys.columns AS ref_c", [
          eq("ref_c.object_id", "fkc.referenced_object_id"),
          eq("ref_c.column_id", "fkc.referenced_column_id"),
        ])
        .where("fkc.parent_object_id", ref("c.object_id"))
        .where("fkc.parent_column_id", ref("c.column_id"))
        .orderBy("fkc.constraint_object_id", "fkc.constraint_column_id"),
      "fk",
    )
    .where("t.is_ms_shipped", 0)
    .orderBy("s.name", "t.name", "t.object_id", "c.column_id")
    .compile("literal");
}
