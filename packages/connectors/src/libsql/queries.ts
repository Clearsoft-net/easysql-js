/**
 * Catalog queries for the libSQL/Turso engine.
 *
 * libSQL speaks SQLite, so introspection reads the SQLite catalog:
 * `sqlite_master` for the table listing and the `PRAGMA table_info` /
 * `PRAGMA foreign_key_list` pragmas for column and foreign-key metadata.
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

/** Builds the statement that reports the columns of `table`. */
export function tableInfoQuery(table: string): string {
  return pragma("table_info", quoteIdent(table));
}

/** Builds the statement that reports the foreign keys of `table`. */
export function foreignKeyListQuery(table: string): string {
  return pragma("foreign_key_list", quoteIdent(table));
}

/** Builds the statement that counts the rows of `table`. */
export function rowCountQuery(table: string): CompiledQuery {
  return select({ c: "COUNT(*)" }).from(quoteIdent(table)).compile("question");
}
