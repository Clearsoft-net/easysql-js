/**
 * Catalog queries for the Trino engine.
 *
 * Introspection reads `information_schema`: `tables` for the base tables in the
 * current schema and `columns` for their column metadata.
 */

import { quoteLiteral } from "../helpers.js";

/** Lists the base tables in the current schema. */
export const TABLES_SQL = `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = current_schema
           AND table_type = 'BASE TABLE'
         ORDER BY table_name`;

/** Lists the columns of one table, interpolating `tableName` as a literal. */
export function columnsQuery(tableName: string): string {
  return `SELECT column_name,
                  data_type,
                  is_nullable,
                  column_default,
                  ordinal_position
           FROM information_schema.columns
           WHERE table_schema = current_schema
             AND table_name = ${quoteLiteral(tableName)}
           ORDER BY ordinal_position`;
}
