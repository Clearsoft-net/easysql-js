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
import { lit, select } from "@easysql/query-builder";
import { quoteIdent } from "../helpers.js";

/** Lists the user tables in the database, in name order. */
export function tablesQuery(): CompiledQuery {
  return select({ name: "name" })
    .from("sqlite_master")
    .where("type", lit("table"))
    .where("name NOT LIKE 'sqlite_%'")
    .orderBy("name")
    .compile("question");
}

/** Builds the documented `PRAGMA table_info` statement for `table`. */
export function tableInfoQuery(table: string): string {
  return `PRAGMA table_info(${quoteIdent(table)})`;
}

/** Builds the documented `PRAGMA foreign_key_list` statement for `table`. */
export function foreignKeyListQuery(table: string): string {
  return `PRAGMA foreign_key_list(${quoteIdent(table)})`;
}

/** The table-valued fallback for the column pragma. */
export function tableInfoFallbackQuery(): string {
  return "SELECT * FROM pragma_table_info(?)";
}

/** The table-valued fallback for the foreign-key pragma. */
export function foreignKeyListFallbackQuery(): string {
  return "SELECT * FROM pragma_foreign_key_list(?)";
}
