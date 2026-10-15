/**
 * Catalog queries for IBM Db2.
 *
 * Metadata is read from `SYSCAT` in four batched queries — tables, columns,
 * primary keys and foreign keys — never one per table. Aliases are quoted
 * because Db2 folds unquoted identifiers to uppercase.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { eq, expr, select } from "@easysql/query-builder";

/** Db2's current-schema keyword is the SQL-standard `CURRENT SCHEMA` (no parens). */
const CURRENT_SCHEMA = expr("CURRENT SCHEMA");

/** Base tables in the current schema, with the optimizer's row estimate. */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "TABNAME", rows_approx: "CARD" })
    .from("SYSCAT.TABLES")
    .where("TYPE", "T")
    .where("TABSCHEMA", CURRENT_SCHEMA)
    .orderBy("TABNAME")
    .compile("literal", { aliasQuote: '"' });
}

/** Every column of the current schema. */
export function columnsQuery(): CompiledQuery {
  return select({
    table_name: "TABNAME",
    column_name: "COLNAME",
    data_type: "TYPENAME",
    nulls: expr('"NULLS"'),
    column_default: expr('"DEFAULT"'),
    ordinal: "COLNO",
  })
    .from("SYSCAT.COLUMNS")
    .where("TABSCHEMA", CURRENT_SCHEMA)
    .orderBy("TABNAME", "COLNO")
    .compile("literal", { aliasQuote: '"' });
}

/** Primary-key columns of the current schema. */
export function primaryKeysQuery(): CompiledQuery {
  return select({ table_name: "k.TABNAME", column_name: "k.COLNAME" })
    .from("SYSCAT.KEYCOLUSE k")
    .innerJoin("SYSCAT.TABCONST c", [
      eq("c.CONSTNAME", "k.CONSTNAME"),
      eq("c.TABSCHEMA", "k.TABSCHEMA"),
      eq("c.TABNAME", "k.TABNAME"),
    ])
    .where("c.TYPE", "P")
    .where("k.TABSCHEMA", CURRENT_SCHEMA)
    .orderBy("k.TABNAME", "k.COLNAME")
    .compile("literal", { aliasQuote: '"' });
}

/** Foreign-key columns of the current schema. */
export function foreignKeysQuery(): CompiledQuery {
  return select({
    table_name: "k.TABNAME",
    column_name: "k.COLNAME",
    ref_table: "r.REFTABNAME",
    ref_column: "rk.COLNAME",
  })
    .from("SYSCAT.KEYCOLUSE k")
    .innerJoin("SYSCAT.TABCONST c", [
      eq("c.CONSTNAME", "k.CONSTNAME"),
      eq("c.TABSCHEMA", "k.TABSCHEMA"),
      eq("c.TABNAME", "k.TABNAME"),
    ])
    .innerJoin("SYSCAT.REFERENCES r", [
      eq("r.CONSTNAME", "c.CONSTNAME"),
      eq("r.TABSCHEMA", "c.TABSCHEMA"),
      eq("r.TABNAME", "c.TABNAME"),
    ])
    .innerJoin("SYSCAT.KEYCOLUSE rk", [
      eq("rk.CONSTNAME", "r.REFKEYNAME"),
      eq("rk.TABSCHEMA", "r.REFTABSCHEMA"),
      eq("rk.TABNAME", "r.REFTABNAME"),
      eq("rk.COLSEQ", "k.COLSEQ"),
    ])
    .where("c.TYPE", "F")
    .where("k.TABSCHEMA", CURRENT_SCHEMA)
    .orderBy("k.TABNAME", "k.COLNAME")
    .compile("literal", { aliasQuote: '"' });
}
