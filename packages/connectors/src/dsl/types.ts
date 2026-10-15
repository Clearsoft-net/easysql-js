/**
 * Types for the query DSL (`src/dsl/`).
 *
 * The DSL is a thin, SQL-first builder: clauses are structured, but any operand
 * can be a raw SQL fragment. It is intentionally small and only models what the
 * connectors' introspection queries need.
 */

/**
 * An operand: a bare JS value (bound as a parameter), a raw SQL fragment
 * (string, rendered as-is) or a built {@link Node}.
 */
export type Operand = string | number | boolean | null | Node;

/** How a dialect writes bound parameters. */
export type PlaceholderStyle = "question" | "dollar";

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
  | { kind: "literal"; value: string }
  | { kind: "raw"; sql: string }
  | { kind: "fn"; name: string; args: Operand[] }
  | { kind: "index"; operand: Operand; index: number }
  | { kind: "binary"; op: string; left: Operand; right: Operand }
  | { kind: "not"; operand: Operand }
  | { kind: "isNull"; operand: Operand; negated: boolean }
  | { kind: "inList"; operand: Operand; items: Operand[] }
  | { kind: "between"; operand: Operand; lo: Operand; hi: Operand }
  | { kind: "logical"; op: "AND" | "OR"; items: Operand[] }
  | { kind: "exists"; query: Subquery };

/** A correlated subquery used by `exists`. */
export interface Subquery {
  from: string;
  where: Operand[];
}

/** A join in a select. */
export interface JoinSpec {
  type: "inner" | "left" | "right";
  table: string;
  on: Operand[];
}

/** The structural description of a SELECT. */
export interface SelectSpec {
  columns: Record<string, Operand>;
  from: string;
  joins: JoinSpec[];
  where: Operand[];
  orderBy: string[];
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
}
