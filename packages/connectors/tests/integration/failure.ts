/**
 * Runs a statement that must fail and hands back the error the connector
 * surfaced, so the test can assert on its message. Shared by the integration
 * suites because every engine exercises the same error wrapper.
 */

import type { Connector } from "../../src/types.js";

export async function failureOf(connector: Connector, statement: string): Promise<Error> {
  try {
    await connector.execute(statement);
  } catch (error) {
    return error as Error;
  }
  throw new Error(`expected '${statement}' to fail`);
}
