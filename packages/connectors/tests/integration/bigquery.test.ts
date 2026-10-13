/**
 * Integration test against a real BigQuery project.
 *
 * Runs only when EASYSQL_TEST_BIGQUERY_PROJECT is set *and* Application Default
 * Credentials look available (EASYSQL_TEST_BIGQUERY_KEYFILE, or
 * GOOGLE_APPLICATION_CREDENTIALS, or the gcloud ADC file). Set
 * EASYSQL_TEST_BIGQUERY_DATASET to restrict introspection to one dataset.
 * Skipped with an explicit message otherwise, so CI without credentials stays
 * green.
 *
 * Credentials served by the GCE/GKE metadata server (workload identity) cannot
 * be detected from the filesystem, so those environments must point
 * GOOGLE_APPLICATION_CREDENTIALS at a key file for this test to run.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { BigQueryConnectionConfig } from "../../src/bigquery/index";
import { BigQueryConnector } from "../../src/bigquery/index";

const projectId = process.env.EASYSQL_TEST_BIGQUERY_PROJECT;
const dataset = process.env.EASYSQL_TEST_BIGQUERY_DATASET;
const keyFilename =
  process.env.EASYSQL_TEST_BIGQUERY_KEYFILE ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
const adcFile = join(homedir(), ".config", "gcloud", "application_default_credentials.json");
const hasCredentials = Boolean(keyFilename && existsSync(keyFilename)) || existsSync(adcFile);
const enabled = Boolean(projectId) && hasCredentials;

function config(): BigQueryConnectionConfig {
  return {
    projectId: projectId as string,
    ...(dataset ? { dataset } : {}),
    ...(keyFilename && existsSync(keyFilename) ? { keyFilename } : {}),
  };
}

describe.skipIf(!enabled)("BigQueryConnector integration", () => {
  let connector: BigQueryConnector;

  beforeAll(async () => {
    connector = new BigQueryConnector(config());
    await connector.connect();
  });

  afterAll(async () => {
    await connector?.close();
  });

  it("introspects a deterministic schema", async () => {
    const first = await connector.introspect();
    const second = await connector.introspect();
    expect(first).toEqual(second);
    expect(first.engine).toBe("bigquery");
    for (const table of first.tables) {
      for (const column of table.columns) {
        expect(typeof column.ordinal).toBe("number");
        // BigQuery has no primary/foreign keys in table metadata.
        expect(column.primaryKey).toBe(false);
        expect(column.foreignKey).toBeNull();
      }
    }
  });

  it("executes a select and returns rows", async () => {
    const result = await connector.execute("SELECT 1 AS n");
    expect(result.columns).toEqual(["n"]);
    expect(result.rowCount).toBe(1);
    expect(Number(result.rows[0]?.n)).toBe(1);
  });
});

describe.skipIf(enabled)("BigQueryConnector integration (skipped)", () => {
  it("is skipped without EASYSQL_TEST_BIGQUERY_PROJECT and credentials", () => {
    expect(enabled).toBe(false);
  });
});
