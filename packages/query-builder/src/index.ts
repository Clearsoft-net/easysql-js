/**
 * The query builder.
 *
 * A thin, SQL-first builder for the connectors' introspection queries:
 * structured clauses (`from`, `join`, `where`, `groupBy`, `orderBy`) over raw
 * SQL fragments, with context-aware parameter binding. See `./build.ts` for the
 * binding rules and `./types.ts` for the node model.
 */

export {
  and,
  between,
  caseWhen,
  eq,
  exists,
  expr,
  fn,
  gt,
  gte,
  idx,
  inList,
  isNotNull,
  isNull,
  like,
  lit,
  lt,
  lte,
  ne,
  not,
  notLike,
  or,
  ref,
  SelectBuilder,
  select,
  value,
} from "./build.js";
export type {
  CompiledQuery,
  CompileOptions,
  JoinSpec,
  Node,
  Operand,
  PlaceholderStyle,
  RenderContext,
  SelectSpec,
} from "./types.js";
