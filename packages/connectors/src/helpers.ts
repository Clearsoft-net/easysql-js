/**
 * SQL construction helpers shared by the connectors.
 *
 * The small, engine-agnostic pieces every introspection query needs: quoting
 * identifiers and string literals, and building a stable key for a
 * (table, column) pair. Engine-specific catalog SQL lives in each engine's
 * `queries.ts`.
 */

/** Quotes an identifier with double quotes, doubling any embedded quotes. */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Single-quotes a SQL string literal, doubling any embedded quotes. */
export function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** A stable, collision-free key for a (table, column) pair. */
export function columnKey(table: string, column: string): string {
  return `${table}\u0000${column}`;
}
