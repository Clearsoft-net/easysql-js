/**
 * Loading of the optional engine drivers.
 *
 * Engine modules are imported lazily so a consumer pays only for the driver of
 * the engine they selected. When that import fails because the driver is not
 * installed, the module error is replaced by an actionable message — the first
 * thing a user hits after installing @easysql/connectors without its driver.
 */

/** Loads an engine module, turning a missing driver into an actionable error. */
export async function loadDriver<T>(name: string, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (isMissingModule(error)) {
      throw new Error(
        `Connector dependency '${name}' is unavailable. Install the optional driver for the selected engine and ensure the runtime supports it.`,
        { cause: error },
      );
    }
    throw error;
  }
}

function isMissingModule(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    code === "ERR_UNKNOWN_BUILTIN_MODULE"
  );
}

/**
 * Memoises a lazy driver import so the module (often a native binding) is loaded
 * at most once; a failed import is retried on the next call.
 */
export function memoizedImport<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    promise ??= load().catch((error: unknown) => {
      promise = null;
      throw error;
    });
    return promise;
  };
}
