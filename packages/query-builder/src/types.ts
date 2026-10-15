/**
 * Types for the query builder.
 *
 * The builder is a thin, SQL-first compiler: clauses are structured, but any
 * operand can be a raw SQL fragment. It is intentionally small and only models
 * what the EasySQL connectors' introspection queries need.
 */

/**
 * An operand: a bare JS value (bound as a parameter), a raw SQL fragment
 * (string, rendered as-is) or a built {@link Node}.
 */
export type Operand = string | number | boolean | null | Node;

/**
 * How a dialect handles values:
 * - `question` — positional `?` placeholders (MySQL, SQLite, DuckDB, …).
 * - `dollar`   — numbered `$1`, `$2`, … placeholders (PostgreSQL).
 * - `literal`  — values inlined as SQL literals, for dialects whose client
 *                cannot bind parameters (SQL Server, Oracle, Db2, Snowflake, …).
 */
export type PlaceholderStyle = "question" | "dollar" | "literal";

/**
 * The context an operand is rendered in. It decides whether a bare string is a
 * value (bound) or a reference:
 * - `expr`  — a column/expression position (select list, function args): raw.
 * - `where` — a predicate: the left side is a reference, the right side binds.
 * - `on`    — a join condition: both sides are references.
 */
export type RenderContext = "expr" | "where" | "on";

/** A built query node. */
export type Node =
  | { kind: "ref"; name: string }
  | { kind: "value"; value: unknown }
  | { kind: "literal"; value: string | number }
  | { kind: "raw"; sql: string }
  | { kind: "fn"; name: string; args: Operand[] }
  | { kind: "index"; operand: Operand; index: number }
  | { kind: "binary"; op: string; left: Operand; right: Operand }
  | { kind: "case"; when: Operand; then: Operand; otherwise: Operand }
  | { kind: "not"; operand: Operand }
  | { kind: "isNull"; operand: Operand; negated: boolean }
  | { kind: "inList"; operand: Operand; items: Operand[] }
  | { kind: "between"; operand: Operand; lo: Operand; hi: Operand }
  | { kind: "logical"; op: "AND" | "OR"; items: Operand[] }
  | { kind: "subquery"; spec: SelectSpec }
  | { kind: "derived"; spec: SelectSpec; alias: string }
  | { kind: "apply"; apply: "OUTER" | "CROSS"; spec: SelectSpec; alias: string }
  | { kind: "exists"; query: Subquery };

/** A correlated subquery used by `exists`. */
export interface Subquery {
  from: string;
  where: Operand[];
}

/** A join in a select. */
export interface JoinSpec {
  type: "inner" | "left" | "right";
  table: Operand;
  on: Operand[];
}

/** The structural description of a SELECT. */
export interface SelectSpec {
  /** Verbatim fragments emitted right after `SELECT` (e.g. `TOP 1`, `DISTINCT`). */
  prefix: string[];
  columns: Record<string, Operand>;
  from: Operand;
  joins: JoinSpec[];
  /** Verbatim clauses emitted after the joins (e.g. `OUTER APPLY (…) AS fk`). */
  extras: Operand[];
  where: Operand[];
  groupBy: string[];
  orderBy: string[];
}

/** Per-dialect compile options. */
export interface CompileOptions {
  /**
   * Quote character for SELECT aliases, e.g. `"`. Required by engines that fold
   * unquoted identifiers to uppercase (Oracle, Db2, SAP HANA) so the alias keeps
   * its exact case. Omit for engines that return the alias as written.
   */
  aliasQuote?: string;
}

/** A compiled query: SQL text with the dialect's placeholders and its values. */
export interface CompiledQuery {
  text: string;
  values: unknown[];
}

/** Internal renderer state (accumulates bound values, numbers `$n` params). */
export interface RenderState {
  style: PlaceholderStyle;
  values: unknown[];
  options: CompileOptions;
}
