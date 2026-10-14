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
