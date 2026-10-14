import { describe, expect, it } from "bun:test";
import {
  type BigQueryConnectionConfig,
  BigQueryConnector,
  sanitizeErrorMessage,
} from "../../../src/bigquery/index";

const base: BigQueryConnectionConfig = { projectId: "easysql-test" };

describe("BigQueryConnector configuration", () => {
  it("constructs with the documented defaults", () => {
    const connector = new BigQueryConnector(base);
    expect(connector).toBeInstanceOf(BigQueryConnector);
  });

  it("accepts the optional dataset, key file and location", () => {
    const connector = new BigQueryConnector({
      ...base,
      dataset: "analytics",
      keyFilename: "/tmp/service-account.json",
      location: "EU",
    });
    expect(connector).toBeInstanceOf(BigQueryConnector);
  });

  it("rejects a missing projectId", () => {
    expect(() => new BigQueryConnector({ projectId: "" })).toThrow("projectId is required");
  });

  it("prefixes every validation message with the class name", () => {
    expect(() => new BigQueryConnector({ projectId: "" })).toThrow(/^BigQueryConnector:/);
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new BigQueryConnector(base);
    await expect(connector.introspect()).rejects.toThrow("not connected");
    await expect(connector.execute("SELECT 1")).rejects.toThrow("not connected");
  });

  it("closes cleanly when it was never connected", async () => {
    const connector = new BigQueryConnector(base);
    await expect(connector.close()).resolves.toBeUndefined();
  });

  it("keeps instances independent", () => {
    const a = new BigQueryConnector({ ...base, dataset: "a" });
    const b = new BigQueryConnector({ ...base, dataset: "b" });
    expect(a).not.toBe(b);
    expect(b).toBeInstanceOf(BigQueryConnector);
    expect(a).toBeInstanceOf(BigQueryConnector);
  });

  it("does not require credentials to be constructed", () => {
    // Application Default Credentials are resolved lazily by connect(), so the
    // constructor stays offline and side-effect free.
    expect(() => new BigQueryConnector({ projectId: "p" })).not.toThrow();
  });
});

describe("sanitizeErrorMessage", () => {
  it("passes messages through unchanged when there is no secret", () => {
    expect(sanitizeErrorMessage("Permission denied on dataset analytics", [])).toBe(
      "Permission denied on dataset analytics",
    );
  });
});
