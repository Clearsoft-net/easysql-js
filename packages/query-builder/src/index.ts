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
  lit,
  lt,
  lte,
  ne,
  not,
  or,
  ref,
  SelectBuilder,
  select,
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
