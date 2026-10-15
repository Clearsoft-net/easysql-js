/**
 * Catalog queries for the Cloudflare D1 engine.
 *
 * D1 exposes the SQLite catalog over its REST API. The table listing reads
 * `sqlite_master`; column and foreign-key metadata use the `PRAGMA table_info`
 * and `PRAGMA foreign_key_list` statements that Cloudflare documents as
 * compatible, with the table-valued functions as a fallback for endpoints that
 * reject the PRAGMA form.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { lit, notLike, select } from "@easysql/query-builder";
import { pragma, quoteIdent } from "../helpers.js";

/** Lists the user tables in the database, in name order. */
export function tablesQuery(): CompiledQuery {
  return select({ name: "name" })
    .from("sqlite_master")
    .where("type", lit("table"))
    .where(notLike("name", lit("sqlite_%")))
    .orderBy("name")
    .compile("question");
}

/** Builds the documented `PRAGMA table_info` statement for `table`. */
export function tableInfoQuery(table: string): string {
  return pragma("table_info", quoteIdent(table));
}

/** Builds the documented `PRAGMA foreign_key_list` statement for `table`. */
export function foreignKeyListQuery(table: string): string {
  return pragma("foreign_key_list", quoteIdent(table));
}

/** The table-valued fallback for the column pragma (the table name is bound as `?`). */
export function tableInfoFallbackQuery(): string {
  return select({ "*": "*" }).from("pragma_table_info(?)").compile("question").text;
}

/** The table-valued fallback for the foreign-key pragma (the table name is bound as `?`). */
export function foreignKeyListFallbackQuery(): string {
  return select({ "*": "*" }).from("pragma_foreign_key_list(?)").compile("question").text;
}
