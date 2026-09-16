/**
 * Schema generation — transform the raw metadata a connector introspects into
 * the schema payload the EasySQL API consumes.
 *
 * Pure: this module performs no network, filesystem or database access. Output
 * is deterministic: tables are sorted by name, columns keep their declared
 * order (or fall back to name order), and foreign keys are emitted whole.
 */

import { mapType } from "./type-map.js";
import type { ColumnSchema, RawColumn, RawSchema, TableSchema } from "./types.js";

/**
 * Normalizes one introspected database into the API schema payload.
 *
 * @param input The single shape produced by a connector.
 * @returns The `TableSchema[]` accepted by `POST /v1/connectors` / `.../sync`.
 */
export function generateSchema(input: RawSchema): TableSchema[] {
  return [...input.tables]
    .sort((a, b) => compare(a.name, b.name))
    .map((table) => normalizeTable(input.engine, table));
}

function normalizeTable(
  engine: RawSchema["engine"],
  table: RawSchema["tables"][number],
): TableSchema {
  const columns = [...table.columns]
    .sort(compareColumns)
    .map((column) => normalizeColumn(engine, column));

  return {
    name: table.name,
    columns,
    rows_approx: table.rowsApprox ?? null,
  };
}

function normalizeColumn(engine: RawSchema["engine"], column: RawColumn): ColumnSchema {
  return {
    name: column.name,
    type: mapType(engine, column.dataType),
    nullable: column.nullable,
    primary_key: column.primaryKey ?? false,
    default: column.defaultValue ?? null,
    foreign_key: column.foreignKey
      ? { table: column.foreignKey.table, column: column.foreignKey.column }
      : null,
  };
}

/**
 * Declared order when the connector provides it; name order otherwise. Both
 * keys are compared independently so a partially-ordered input stays stable.
 */
function compareColumns(a: RawColumn, b: RawColumn): number {
  if (a.ordinal !== undefined && b.ordinal !== undefined) {
    return a.ordinal - b.ordinal;
  }
  return compare(a.name, b.name);
}

/** Locale-independent, code-unit ordering (never depends on the host locale). */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
