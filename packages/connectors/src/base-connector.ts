/**
 * Shared connector lifecycles.
 *
 * Every engine keeps only what is genuinely driver-specific — how to open and
 * close its handle, how to run a raw query, and how to introspect. The two base
 * classes below own the rest: idempotent `connect`/`close`, the `execute`
 * template (timing plus {@link QueryResult} assembly) and credential redaction.
 *
 * There are two of them because the `Connector` contract allows either a
 * synchronous or an asynchronous implementation, and `sqlite` (Node's built-in
 * `node:sqlite`) is deliberately synchronous. A single async base would change
 * that public contract, so the sync engines get their own mirror.
 */

import type { Connector, QueryResult, RawSchema } from "@easysql/common";
import { buildQueryResult, notConnectedError, wrapError } from "./internal.js";
import type { RawQueryResult } from "./types.js";

/** Base for asynchronous (network-backed) connectors. */
export abstract class BaseConnector<THandle> implements Connector {
  private handle: THandle | null = null;

  protected constructor(private readonly secrets: string[] = []) {}

  /** Opens the connection. Idempotent. */
  async connect(): Promise<void> {
    if (this.handle) return;
    try {
      this.handle = await this.openHandle();
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Closes the connection and clears it. Safe to call when not connected. */
  async close(): Promise<void> {
    if (!this.handle) return;
    const handle = this.handle;
    this.handle = null;
    await this.closeHandle(handle);
  }

  /** Executes a validated SQL statement and returns typed rows. */
  async execute(sql: string): Promise<QueryResult> {
    const handle = this.requireHandle();
    const started = Date.now();
    try {
      return buildQueryResult(await this.runQuery(handle, sql), started);
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Reads local metadata only. Engine-specific: each catalog query differs. */
  abstract introspect(): Promise<RawSchema>;

  /** Opens the underlying driver handle. Called once by {@link connect}. */
  protected abstract openHandle(): Promise<THandle>;
  /** Releases a handle obtained from {@link openHandle}. */
  protected abstract closeHandle(handle: THandle): Promise<void>;
  /** Runs `sql` and returns the columns and raw rows of the result set. */
  protected abstract runQuery(handle: THandle, sql: string): Promise<RawQueryResult>;

  /** The open handle, or a `not connected` error. */
  protected requireHandle(): THandle {
    if (!this.handle) throw this.notConnected();
    return this.handle;
  }

  /** The guard error raised when a method runs before {@link connect}. */
  protected notConnected(): Error {
    return notConnectedError(this.constructor.name);
  }

  /** Wraps a driver error, stripping the configured secrets from its message. */
  protected wrap(error: unknown): Error {
    return wrapError(error, this.secrets);
  }
}

/**
 * Base for synchronous connectors. Mirrors {@link BaseConnector} but keeps the
 * `void`/value contract of `Connector` intact (no promises anywhere).
 */
export abstract class SyncBaseConnector<THandle> implements Connector {
  private handle: THandle | null = null;

  protected constructor(private readonly secrets: string[] = []) {}

  /** Opens the database. Idempotent. */
  connect(): void {
    if (this.handle) return;
    try {
      this.handle = this.openHandle();
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Closes the database and clears it. Safe to call when not connected. */
  close(): void {
    if (!this.handle) return;
    const handle = this.handle;
    this.handle = null;
    this.closeHandle(handle);
  }

  /** Executes a validated SQL statement and returns typed rows. */
  execute(sql: string): QueryResult {
    const handle = this.requireHandle();
    const started = Date.now();
    try {
      return buildQueryResult(this.runQuery(handle, sql), started);
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Reads local metadata only. Engine-specific: each catalog differs. */
  abstract introspect(): RawSchema;

  /** Opens the underlying driver handle. Called once by {@link connect}. */
  protected abstract openHandle(): THandle;
  /** Releases a handle obtained from {@link openHandle}. */
  protected abstract closeHandle(handle: THandle): void;
  /** Runs `sql` and returns the columns and raw rows of the result set. */
  protected abstract runQuery(handle: THandle, sql: string): RawQueryResult;

  /** The open handle, or a `not connected` error. */
  protected requireHandle(): THandle {
    if (!this.handle) throw this.notConnected();
    return this.handle;
  }

  /** The guard error raised when a method runs before {@link connect}. */
  protected notConnected(): Error {
    return notConnectedError(this.constructor.name);
  }

  /** Wraps a driver error, stripping the configured secrets from its message. */
  protected wrap(error: unknown): Error {
    return wrapError(error, this.secrets);
  }
}
