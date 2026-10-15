/**
 * Catalog queries for the PostgreSQL family.
 *
 * Every PostgreSQL-compatible server exposes `pg_catalog`, but the columns
 * available differ by server lineage. `pg_class.relispartition` was added in
 * PostgreSQL 10, so Redshift (derived from PostgreSQL 8.0) must not reference
 * it. The queries are therefore selected per provider instead of assumed.
 */

import type { CompiledQuery } from "../dsl/index.js";
import { eq, exists, fn, gt, idx, lit, not, ref, select } from "../dsl/index.js";
import type { PostgresProvider } from "./types.js";

/**
 * Lists base tables in the current schema. `relispartition` is only referenced
 * on servers that have it; elsewhere the filter is omitted so the query still
 * parses.
 */
export function tablesQuery(provider: PostgresProvider): CompiledQuery {
  const query = select({ table_name: "c.relname", rows_approx: "c.reltuples::bigint" })
    .from("pg_class c")
    .innerJoin("pg_namespace n", "n.oid", "c.relnamespace")
    .where("n.nspname", fn("current_schema"))
    .where("c.relkind", lit("r"));
  if (provider !== "redshift") query.where(not("c.relispartition"));
  return query.orderBy("c.relname").compile("dollar");
}

/** Lists the columns of one table, with primary and foreign key metadata. */
export function columnsQuery(table: string): CompiledQuery {
  return select({
    column_name: "a.attname",
    data_type: fn("format_type", "a.atttypid", "a.atttypmod"),
    is_nullable: not("a.attnotnull"),
    column_default: fn("pg_get_expr", "d.adbin", "d.adrelid"),
    is_primary: exists({
      from: "pg_index i",
      where: [
        eq("i.indrelid", ref("c.oid")),
        eq("a.attnum", fn("ANY", "i.indkey")),
        "i.indisprimary",
      ],
    }),
    foreign_table: "ref.relname",
    foreign_column: "ref_att.attname",
    ordinal: "a.attnum",
  })
    .from("pg_attribute a")
    .innerJoin("pg_class c", "c.oid", "a.attrelid")
    .innerJoin("pg_namespace n", "n.oid", "c.relnamespace")
    .leftJoin("pg_attrdef d", [eq("d.adrelid", "a.attrelid"), eq("d.adnum", "a.attnum")])
    .leftJoin("pg_constraint con", [
      eq("con.conrelid", "c.oid"),
      eq("a.attnum", fn("ANY", "con.conkey")),
      eq("con.contype", lit("f")),
    ])
    .leftJoin("pg_class ref", "ref.oid", "con.confrelid")
    .leftJoin("pg_attribute ref_att", [
      eq("ref_att.attrelid", "ref.oid"),
      eq("ref_att.attnum", idx("con.confkey", 1)),
    ])
    .where("n.nspname", fn("current_schema"))
    .where("c.relname", table)
    .where(gt("a.attnum", 0))
    .where(not("a.attisdropped"))
    .orderBy("a.attnum")
    .compile("dollar");
}
