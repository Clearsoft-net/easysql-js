/**
 * The query builder: markers, conditions, a `select` builder and the compiler.
 *
 * Binding follows the "context" rule: a bare string is a raw fragment in an
 * expression position, a bound value on the right of a `where` comparison, and
 * a reference in a join `ON`. Use `ref()` to force a reference, `lit()` a
 * string literal, `fn()`/`expr()` an expression — none of which are bound.
 */

import type {
  CompiledQuery,
  CompileOptions,
  JoinSpec,
  Node,
  Operand,
  PlaceholderStyle,
  RenderContext,
  RenderState,
  SelectSpec,
} from "./types.js";

// ── markers ──────────────────────────────────────────────────────────────
/** A column reference (never bound). */
export const ref = (name: string): Node => ({ kind: "ref", name });
/** A quoted string literal (never bound). */
export const lit = (value: string): Node => ({ kind: "literal", value });
/** A raw SQL fragment (never bound). */
export const expr = (sql: string): Node => ({ kind: "raw", sql });
/** A function call, e.g. `fn("format_type", "a.atttypid")`. */
export const fn = (name: string, ...args: Operand[]): Node => ({ kind: "fn", name, args });
/** An array subscript, e.g. `idx("con.confkey", 1)`. */
export const idx = (operand: Operand, index: number): Node => ({ kind: "index", operand, index });

// ── conditions ───────────────────────────────────────────────────────────
export const eq = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: "=",
  left,
  right,
});
export const ne = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: "<>",
  left,
  right,
});
export const gt = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: ">",
  left,
  right,
});
export const gte = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: ">=",
  left,
  right,
});
export const lt = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: "<",
  left,
  right,
});
export const lte = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: "<=",
  left,
  right,
});
export const like = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: "LIKE",
  left,
  right,
});
export const notLike = (left: Operand, right: Operand): Node => ({
  kind: "binary",
  op: "NOT LIKE",
  left,
  right,
});
export const isNull = (operand: Operand): Node => ({ kind: "isNull", operand, negated: false });
export const isNotNull = (operand: Operand): Node => ({ kind: "isNull", operand, negated: true });
export const inList = (operand: Operand, items: Operand[]): Node => ({
  kind: "inList",
  operand,
  items,
});
export const between = (operand: Operand, lo: Operand, hi: Operand): Node => ({
  kind: "between",
  operand,
  lo,
  hi,
});
export const not = (operand: Operand): Node => ({ kind: "not", operand });
/** A `CASE WHEN <when> THEN <then> ELSE <otherwise> END` expression. */
export const caseWhen = (when: Operand, then: Operand, otherwise: Operand): Node => ({
  kind: "case",
  when,
  then,
  otherwise,
});
export const and = (items: Operand[]): Node => ({ kind: "logical", op: "AND", items });
export const or = (items: Operand[]): Node => ({ kind: "logical", op: "OR", items });
/** A correlated subquery, rendered as `EXISTS (SELECT 1 FROM ... WHERE ...)`. */
export const exists = (query: { from: string; where: Operand[] }): Node => ({
  kind: "exists",
  query,
});

// ── compiler ─────────────────────────────────────────────────────────────
const quoteString = (value: string): string => `'${value.replace(/'/g, "''")}'`;

function renderLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return quoteString(String(value));
}

function bind(state: RenderState, value: unknown): string {
  if (state.style === "literal") return renderLiteral(value);
  state.values.push(value);
  return state.style === "dollar" ? `$${state.values.length}` : "?";
}

function renderOperand(
  operand: Operand,
  side: "left" | "right",
  context: RenderContext,
  state: RenderState,
): string {
  if (operand === null) return "NULL";
  if (typeof operand === "object") return renderNode(operand, context, state);
  if (typeof operand === "number" || typeof operand === "boolean") return bind(state, operand);
  // A bare string: bound only on the right of a `where` comparison.
  return side === "right" && context === "where" ? bind(state, operand) : operand;
}

function renderNode(node: Node, context: RenderContext, state: RenderState): string {
  switch (node.kind) {
    case "ref":
      return node.name;
    case "value":
      return bind(state, node.value);
    case "literal":
      return quoteString(node.value);
    case "raw":
      return node.sql;
    case "fn":
      return `${node.name}(${node.args.map((a) => renderOperand(a, "left", "expr", state)).join(", ")})`;
    case "index":
      return `${renderOperand(node.operand, "left", "expr", state)}[${node.index}]`;
    case "binary":
      return `${renderOperand(node.left, "left", context, state)} ${node.op} ${renderOperand(
        node.right,
        "right",
        context,
        state,
      )}`;
    case "not":
      return `NOT (${renderOperand(node.operand, "left", context, state)})`;
    case "case":
      return `CASE WHEN ${renderOperand(node.when, "left", "expr", state)} THEN ${renderOperand(
        node.then,
        "left",
        "expr",
        state,
      )} ELSE ${renderOperand(node.otherwise, "left", "expr", state)} END`;
    case "isNull":
      return `${renderOperand(node.operand, "left", context, state)} IS ${node.negated ? "NOT " : ""}NULL`;
    case "inList":
      return `${renderOperand(node.operand, "left", context, state)} IN (${node.items
        .map((item) => renderOperand(item, "right", context, state))
        .join(", ")})`;
    case "between":
      return `${renderOperand(node.operand, "left", context, state)} BETWEEN ${renderOperand(
        node.lo,
        "right",
        context,
        state,
      )} AND ${renderOperand(node.hi, "right", context, state)}`;
    case "logical":
      return `(${node.items
        .map((item) => renderOperand(item, "left", context, state))
        .join(` ${node.op} `)})`;
    case "exists":
      return `EXISTS (SELECT 1 FROM ${node.query.from}${
        node.query.where.length > 0
          ? ` WHERE ${node.query.where
              .map((item) => renderOperand(item, "left", "where", state))
              .join(" AND ")}`
          : ""
      })`;
  }
}

function renderJoin(join: JoinSpec, state: RenderState): string {
  const keyword =
    join.type === "inner" ? "INNER JOIN" : join.type === "left" ? "LEFT JOIN" : "RIGHT JOIN";
  const on = join.on.map((cond) => renderOperand(cond, "left", "on", state)).join(" AND ");
  return `${keyword} ${join.table} ON ${on}`;
}

function renderColumn(alias: string, operand: Operand, state: RenderState): string {
  const rendered = renderOperand(operand, "left", "expr", state);
  const quote = state.options.aliasQuote;
  if (quote) return `${rendered} AS ${quote}${alias}${quote}`;
  return rendered === alias ? rendered : `${rendered} AS ${alias}`;
}

function compileSelect(
  spec: SelectSpec,
  style: PlaceholderStyle,
  options: CompileOptions,
): CompiledQuery {
  const state: RenderState = { style, values: [], options };
  const entries = Object.entries(spec.columns);
  const columns =
    entries.length === 0
      ? "*"
      : entries.map(([alias, operand]) => renderColumn(alias, operand, state)).join(", ");

  const parts = [`SELECT ${columns}`, `FROM ${spec.from}`];
  for (const join of spec.joins) parts.push(renderJoin(join, state));
  parts.push(...spec.extras);
  if (spec.where.length > 0) {
    parts.push(
      `WHERE ${spec.where.map((c) => renderOperand(c, "left", "where", state)).join(" AND ")}`,
    );
  }
  if (spec.groupBy.length > 0) parts.push(`GROUP BY ${spec.groupBy.join(", ")}`);
  if (spec.orderBy.length > 0) parts.push(`ORDER BY ${spec.orderBy.join(", ")}`);
  return { text: parts.join(" "), values: state.values };
}

// ── builder ──────────────────────────────────────────────────────────────
/** A `SELECT` under construction. Compile it with {@link SelectBuilder.compile}. */
export class SelectBuilder {
  private readonly spec: SelectSpec;

  constructor(columns?: Record<string, Operand>) {
    this.spec = {
      columns: columns ?? {},
      from: "",
      joins: [],
      extras: [],
      where: [],
      groupBy: [],
      orderBy: [],
    };
  }

  from(table: string): this {
    this.spec.from = table;
    return this;
  }

  innerJoin(table: string, on: Operand | Operand[], right?: Operand): this {
    return this.addJoin("inner", table, on, right);
  }

  leftJoin(table: string, on: Operand | Operand[], right?: Operand): this {
    return this.addJoin("left", table, on, right);
  }

  rightJoin(table: string, on: Operand | Operand[], right?: Operand): this {
    return this.addJoin("right", table, on, right);
  }

  /** Appends a verbatim clause after the joins, before `WHERE` (e.g. `OUTER APPLY`). */
  raw(fragment: string): this {
    this.spec.extras.push(fragment);
    return this;
  }

  where(condition: Operand | Operand[], right?: Operand): this {
    if (right !== undefined) this.spec.where.push(eq(condition as Operand, right));
    else if (Array.isArray(condition)) this.spec.where.push(...condition);
    else this.spec.where.push(condition);
    return this;
  }

  groupBy(...columns: string[]): this {
    this.spec.groupBy.push(...columns);
    return this;
  }

  orderBy(...columns: string[]): this {
    this.spec.orderBy.push(...columns);
    return this;
  }

  compile(style: PlaceholderStyle, options: CompileOptions = {}): CompiledQuery {
    return compileSelect(this.spec, style, options);
  }

  private addJoin(
    type: JoinSpec["type"],
    table: string,
    on: Operand | Operand[],
    right?: Operand,
  ): this {
    const conditions: Operand[] =
      right !== undefined ? [eq(on as Operand, right)] : Array.isArray(on) ? on : [on];
    this.spec.joins.push({ type, table, on: conditions });
    return this;
  }
}

/**
 * Starts a `SELECT`. `columns` maps an alias to its expression; omit it (or pass
 * none) for `SELECT *`.
 */
export function select(columns?: Record<string, Operand>): SelectBuilder {
  return new SelectBuilder(columns);
}
