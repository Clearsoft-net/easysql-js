/**
 * Catalog queries for the SQLite engine.
 *
 * Introspection reads `sqlite_master` for the table listing and the
 * `PRAGMA table_info` / `PRAGMA foreign_key_list` pragmas for column and
 * foreign-key metadata.
 */

import { quoteIdent } from "../helpers.js";

/** Lists the user tables in the database, in name order. */
export const TABLES_SQL = `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`;

/** Builds the statement that reports the columns of `table`. */
export function tableInfoQuery(table: string): string {
  return `PRAGMA table_info(${quoteIdent(table)})`;
}

/** Builds the statement that reports the foreign keys of `table`. */
export function foreignKeyListQuery(table: string): string {
  return `PRAGMA foreign_key_list(${quoteIdent(table)})`;
}

/** Builds the statement that counts the rows of `table`. */
export function rowCountQuery(table: string): string {
  return `SELECT COUNT(*) AS c FROM ${quoteIdent(table)}`;
}
