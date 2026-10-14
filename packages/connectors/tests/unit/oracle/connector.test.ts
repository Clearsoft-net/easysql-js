import { describe, expect, it } from "bun:test";
import { OracleConnector, sanitizeErrorMessage } from "../../../src/oracle/index";

describe("OracleConnector configuration", () => {
  it("constructs with documented defaults", () => {
    const connector = new OracleConnector({
      host: "db.example.com",
      serviceName: "FREEPDB1",
      user: "readonly",
      password: "secret",
    });
    // Port defaults to 1521; the effective Easy Connect string is host:port/service.
    expect(connector.connectString).toBe("db.example.com:1521/FREEPDB1");
  });

  it("honours an explicit port and an explicit connect string", () => {
    const withPort = new OracleConnector({
      host: "db.example.com",
      port: 1522,
      serviceName: "XEPDB1",
      user: "u",
      password: "p",
    });
    expect(withPort.connectString).toBe("db.example.com:1522/XEPDB1");

    const withConnectString = new OracleConnector({
      connectString: "localhost/FREEPDB1",
      user: "u",
      password: "p",
    });
    expect(withConnectString.connectString).toBe("localhost/FREEPDB1");
  });

  it("accepts host plus serviceName without a connect string", () => {
    const connector = new OracleConnector({
      host: "h",
      serviceName: "s",
      user: "u",
      password: "p",
    });
    expect(connector).toBeInstanceOf(OracleConnector);
  });

  it("rejects a missing user", () => {
    expect(
      () => new OracleConnector({ host: "h", serviceName: "s", user: "", password: "p" }),
    ).toThrow("user is required");
  });

  it("rejects configurations without connectString or host+serviceName", () => {
    const missing = "connectString or host and serviceName is required";
    expect(() => new OracleConnector({ user: "u", password: "p" })).toThrow(missing);
    expect(() => new OracleConnector({ host: "h", user: "u", password: "p" })).toThrow(missing);
    expect(() => new OracleConnector({ serviceName: "s", user: "u", password: "p" })).toThrow(
      missing,
    );
    expect(
      () =>
        new OracleConnector({
          connectString: "",
          host: "",
          serviceName: "",
          user: "u",
          password: "p",
        }),
    ).toThrow(missing);
  });

  it("requires connect() before introspect/execute", async () => {
    const connector = new OracleConnector({
      host: "h",
      serviceName: "s",
      user: "u",
      password: "p",
    });
    await expect(connector.introspect()).rejects.toThrow("not connected");
    await expect(connector.execute("SELECT 1 FROM dual")).rejects.toThrow("not connected");
  });

  it("closes safely when never connected", async () => {
    const connector = new OracleConnector({
      host: "h",
      serviceName: "s",
      user: "u",
      password: "p",
    });
    await expect(connector.close()).resolves.toBeUndefined();
  });

  it("has no module-level state — several connectors can coexist", () => {
    const a = new OracleConnector({ host: "a", serviceName: "s", user: "u", password: "p" });
    const b = new OracleConnector({ host: "b", serviceName: "s", user: "u", password: "p" });
    expect(a).not.toBe(b);
    expect(a.connectString).not.toBe(b.connectString);
  });
});

describe("sanitizeErrorMessage", () => {
  it("redacts every occurrence of a secret", () => {
    expect(
      sanitizeErrorMessage("ORA-01017: invalid credential or not authorized (hunter2)", [
        "hunter2",
      ]),
    ).toBe("ORA-01017: invalid credential or not authorized (****)");
  });

  it("ignores empty secrets", () => {
    expect(sanitizeErrorMessage("boom", ["", undefined])).toBe("boom");
  });
});
