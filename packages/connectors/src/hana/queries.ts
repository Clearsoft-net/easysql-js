/**
 * Catalog queries for SAP HANA.
 *
 * Metadata is read from the `SYS` catalog in batched queries — tables, columns,
 * primary keys, foreign keys and (best-effort) row counts — never one per table.
 * Aliases are quoted because HANA folds unquoted identifiers to uppercase.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { expr, select } from "@easysql/query-builder";

/** HANA's current-schema keyword has no parentheses. */
const CURRENT_SCHEMA = expr("CURRENT_SCHEMA");

/** Base tables in the current schema. */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "TABLE_NAME" })
    .from("SYS.TABLES")
    .where("SCHEMA_NAME", CURRENT_SCHEMA)
    .where("IS_TEMPORARY", "FALSE")
    .orderBy("TABLE_NAME")
    .compile("literal", { aliasQuote: '"' });
}

/** Every column of the current schema. */
export function columnsQuery(): CompiledQuery {
  return select({
    table_name: "TABLE_NAME",
    column_name: "COLUMN_NAME",
    data_type: "DATA_TYPE_NAME",
    is_nullable: "IS_NULLABLE",
    column_default: "DEFAULT_VALUE",
    ordinal: "POSITION",
  })
    .from("SYS.TABLE_COLUMNS")
    .where("SCHEMA_NAME", CURRENT_SCHEMA)
    .orderBy("TABLE_NAME", "POSITION")
    .compile("literal", { aliasQuote: '"' });
}

/** Primary-key columns of the current schema. */
export function primaryKeysQuery(): CompiledQuery {
  return select({ table_name: "TABLE_NAME", column_name: "COLUMN_NAME" })
    .from("SYS.CONSTRAINTS")
    .where("SCHEMA_NAME", CURRENT_SCHEMA)
    .where("IS_PRIMARY_KEY", "TRUE")
    .orderBy("TABLE_NAME", "POSITION")
    .compile("literal", { aliasQuote: '"' });
}

/**
 * Foreign-key columns of the current schema. `SYS.REFERENTIAL_CONSTRAINTS`
 * carries the referenced table/column for each key column.
 */
export function foreignKeysQuery(): CompiledQuery {
  return select({
    table_name: "TABLE_NAME",
    column_name: "COLUMN_NAME",
    ref_table: "REFERENCED_TABLE_NAME",
    ref_column: "REFERENCED_COLUMN_NAME",
  })
    .from("SYS.REFERENTIAL_CONSTRAINTS")
    .where("SCHEMA_NAME", CURRENT_SCHEMA)
    .orderBy("TABLE_NAME", "POSITION")
    .compile("literal", { aliasQuote: '"' });
}

/**
 * Best-effort row-count sources, tried in order. `SYS.M_TABLE_STATISTICS`
 * carries `RECORD_COUNT` on some HANA versions; when the view or column is
 * unavailable (or the user lacks access) the estimate falls back to
 * `SYS.M_TABLES`.
 */
export function rowCountSources(): CompiledQuery[] {
  const source = (table: string): CompiledQuery =>
    select({ table_name: "TABLE_NAME", record_count: "RECORD_COUNT" })
      .from(table)
      .where("SCHEMA_NAME", CURRENT_SCHEMA)
      .compile("literal", { aliasQuote: '"' });
  return [source("SYS.M_TABLE_STATISTICS"), source("SYS.M_TABLES")];
}
