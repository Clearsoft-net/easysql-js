/**
 * Catalog queries for the PostgreSQL family.
 *
 * Every PostgreSQL-compatible server exposes `pg_catalog`, but the columns
 * available differ by server lineage. `pg_class.relispartition` was added in
 * PostgreSQL 10, so Redshift (derived from PostgreSQL 8.0) must not reference
 * it. The queries are therefore selected per provider instead of assumed.
 */

import type { PostgresProvider } from "./types.js";

/**
 * Lists base tables in the current schema. `relispartition` is only referenced
 * on servers that have it; elsewhere the filter is omitted so the query still
 * parses.
 */
export function tablesQuery(provider: PostgresProvider): string {
  const partitionFilter = provider === "redshift" ? "" : "AND NOT c.relispartition";
  return `SELECT c.relname AS table_name,
                 c.reltuples::bigint AS rows_approx
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = current_schema()
            AND c.relkind = 'r'
            ${partitionFilter}
          ORDER BY c.relname`;
}

/** Lists the columns of one table, with primary and foreign key metadata. */
export function columnsQuery(): string {
  return `SELECT a.attname AS column_name,
                 format_type(a.atttypid, a.atttypmod) AS data_type,
                 NOT (a.attnotnull) AS is_nullable,
                 pg_get_expr(d.adbin, d.adrelid) AS column_default,
                 EXISTS (
                   SELECT 1 FROM pg_index i
                   WHERE i.indrelid = c.oid AND a.attnum = ANY(i.indkey) AND i.indisprimary
                 ) AS is_primary,
                 ref.relname AS foreign_table,
                 ref_att.attname AS foreign_column,
                 a.attnum AS ordinal
          FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND a.attnum = ANY(con.conkey) AND con.contype = 'f'
          LEFT JOIN pg_class ref ON ref.oid = con.confrelid
          LEFT JOIN pg_attribute ref_att ON ref_att.attrelid = ref.oid AND ref_att.attnum = con.confkey[1]
          WHERE n.nspname = current_schema()
            AND c.relname = $1
            AND a.attnum > 0
            AND NOT a.attisdropped
          ORDER BY a.attnum`;
}
