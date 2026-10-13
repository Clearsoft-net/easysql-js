import { describe, expect, it } from "bun:test";
import { loadDriver } from "../../src/driver-loading.js";

/** Rejection shaped like the one a runtime produces for an uninstalled driver. */
function missingModule(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error("Cannot find module 'pg'"), { code });
}

const unavailable =
  "Connector dependency 'pg' is unavailable. Install the optional driver for the selected engine and ensure the runtime supports it.";

describe("loadDriver", () => {
  it("returns the loaded engine module", async () => {
    const engine = { ClickhouseConnector: class {} };
    await expect(loadDriver("@clickhouse/client", async () => engine)).resolves.toBe(engine);
  });

  it("explains every missing-module code and keeps the original cause", async () => {
    for (const code of ["ERR_MODULE_NOT_FOUND", "MODULE_NOT_FOUND", "ERR_UNKNOWN_BUILTIN_MODULE"]) {
      const failure = (await loadDriver("pg", () => Promise.reject(missingModule(code))).catch(
        (error: Error & { cause?: NodeJS.ErrnoException }) => error,
      )) as Error & { cause?: NodeJS.ErrnoException };

      expect(failure.message).toBe(unavailable);
      expect(failure.cause?.code).toBe(code);
    }
  });

  it("rethrows unrelated failures untouched", async () => {
    const denied = Object.assign(new Error("permission denied"), { code: "EACCES" });
    await expect(loadDriver("pg", () => Promise.reject(denied))).rejects.toBe(denied);

    // No code at all: an ordinary failure inside the engine module.
    const plain = new Error("SyntaxError: unexpected token");
    await expect(loadDriver("pg", () => Promise.reject(plain))).rejects.toBe(plain);

    // Rejections are not always Errors.
    await expect(loadDriver("pg", () => Promise.reject("nope"))).rejects.toBe("nope");
  });
});
