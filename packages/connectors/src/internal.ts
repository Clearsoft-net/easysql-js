/**
 * Pure, stateless helpers shared by every connector (sync and async).
 *
 * They carry no I/O and no connection state so both {@link BaseConnector} and
 * {@link SyncBaseConnector} — and the connectors themselves — can reuse the
 * exact same query-result assembly, credential redaction and guard message.
 */

import { type QueryResult, sanitizeErrorMessage } from "@easysql/common";
import type { RawQueryResult } from "./types.js";

/** Projects a driver row onto the reported columns, preserving their order. */
export function pickRows(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of columns) out[column] = row[column];
  return out;
}

/** Wraps an error, stripping every secret (password, token, DSN) from its message. */
export function wrapError(error: unknown, secrets: string[]): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(sanitizeErrorMessage(message, secrets));
}

/** The single "call connect() first" guard error every connector raises. */
export function notConnectedError(name: string): Error {
  return new Error(`${name}: not connected — call connect() first`);
}

/**
 * Normalises a driver's ordinal (a number, a numeric string, `bigint` or `null`)
 * to the {@link RawColumn.ordinal} shape, dropping anything non-finite.
 */
export function toOrdinal(value: string | number | bigint | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

/**
 * Normalises a driver's row estimate (a number, a numeric string, `bigint` or
 * `null`) to `number | null`, dropping anything non-finite.
 */
export function toNullableNumber(
  value: string | number | bigint | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Groups rows by a string key, preserving the first-seen order. */
export function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(key(row));
    if (group) group.push(row);
    else grouped.set(key(row), [row]);
  }
  return grouped;
}

/**
 * Assembles the public {@link QueryResult} from an engine's {@link RawQueryResult}.
 * `rowCount` defaults to the number of returned rows, which every engine except
 * the ones reporting an affected-row count relies on.
 */
export function buildQueryResult(raw: RawQueryResult, started: number): QueryResult {
  const { columns, rows, rowCount } = raw;
  return {
    columns,
    rows: rows.map((row) => pickRows(row, columns)),
    rowCount: rowCount ?? rows.length,
    durationMs: Date.now() - started,
  };
}
