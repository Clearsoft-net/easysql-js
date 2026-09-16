import { describe, expect, it } from "bun:test";
import { mergeConnection, parseConnectionUrl } from "../src/index";

describe("parseConnectionUrl", () => {
  it("parses a standard MySQL URL", () => {
    const c = parseConnectionUrl("mysql://alice:secret@db.example.com:3307/shop");
    expect(c).toEqual({
      type: "mysql",
      host: "db.example.com",
      port: 3307,
      user: "alice",
      password: "secret",
      database: "shop",
      ssl: false,
    });
  });

  it("parses a postgresql URL with the default port", () => {
    const c = parseConnectionUrl("postgresql://bob:hunter2@pg.local/analytics");
    expect(c.type).toBe("postgresql");
    expect(c.port).toBe(5432);
  });

  it("decodes percent-encoded credentials", () => {
    const c = parseConnectionUrl("mysql://user%40dom:p%40ss@db/x");
    expect(c.user).toBe("user@dom");
    expect(c.password).toBe("p@ss");
  });

  it("parses a sqlite URL into the file path", () => {
    const c = parseConnectionUrl("sqlite:///tmp/db.sqlite");
    expect(c).toMatchObject({ type: "sqlite", database: "/tmp/db.sqlite", host: "", port: 0 });
  });

  it("rejects unsupported protocols and missing fields", () => {
    expect(() => parseConnectionUrl("mongodb://localhost/db")).toThrow(/Unsupported protocol/);
    expect(() => parseConnectionUrl("mysql://host/db")).toThrow(/user/i);
    expect(() => parseConnectionUrl("mysql://user@host")).toThrow(/database/i);
  });
});

describe("mergeConnection", () => {
  it("overrides individual fields and keeps base defaults", () => {
    const base = parseConnectionUrl("mysql://alice:secret@db/x");
    const merged = mergeConnection(base, { port: 3307, password: "new" });
    expect(merged.port).toBe(3307);
    expect(merged.password).toBe("new");
    expect(merged.host).toBe("db");
  });

  it("throws when user or database is missing", () => {
    expect(() => mergeConnection({}, {})).toThrow(/user/i);
    expect(() => mergeConnection({ user: "u" }, {})).toThrow(/database/i);
  });
});
