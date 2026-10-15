import { describe, expect, it } from "bun:test";
import {
  caseWhen,
  derived,
  eq,
  exists,
  fn,
  gt,
  idx,
  isNull,
  like,
  lit,
  not,
  notLike,
  or,
  ref,
  select,
  sub,
  value,
} from "../src/index.js";

describe("query builder — binding by context", () => {
  it("binds the right side of a where comparison", () => {
    const q = select({ table_name: "TABNAME" })
      .from("SYSCAT.TABLES")
      .where("TABSCHEMA", "APP")
      .compile("question");
    expect(q.text).toBe("SELECT TABNAME AS table_name FROM SYSCAT.TABLES WHERE TABSCHEMA = ?");
    expect(q.values).toEqual(["APP"]);
  });

  it("numbers placeholders for the dollar style", () => {
    const q = select({ n: "1" }).from("t").where("a", 1).where("b", 2).compile("dollar");
    expect(q.text).toBe("SELECT 1 AS n FROM t WHERE a = $1 AND b = $2");
    expect(q.values).toEqual([1, 2]);
  });

  it("inlines values for the literal style", () => {
    const q = select({ x: "a" }).from("t").where("k", "table").where(gt("n", 3)).compile("literal");
    expect(q.text).toBe("SELECT a AS x FROM t WHERE k = 'table' AND n > 3");
    expect(q.values).toEqual([]);
  });

  it("quotes aliases when asked", () => {
    const q = select({ table_name: "t.TABLE_NAME", rows_approx: "t.NUM_ROWS" })
      .from("ALL_TABLES t")
      .compile("literal", { aliasQuote: '"' });
    expect(q.text).toBe(
      'SELECT t.TABLE_NAME AS "table_name", t.NUM_ROWS AS "rows_approx" FROM ALL_TABLES t',
    );
  });

  it("treats both sides of a join ON as references", () => {
    const q = select({ x: "c.oid" })
      .from("pg_class c")
      .innerJoin("pg_namespace n", "n.oid", "c.relnamespace")
      .compile("question");
    expect(q.text).toBe(
      "SELECT c.oid AS x FROM pg_class c INNER JOIN pg_namespace n ON n.oid = c.relnamespace",
    );
    expect(q.values).toEqual([]);
  });

  it("never binds refs, function calls, literals or subscripts", () => {
    const q = select({
      is_primary: exists({
        from: "pg_index i",
        where: [eq("i.indrelid", ref("c.oid")), eq("a.attnum", fn("ANY", "i.indkey"))],
      }),
    })
      .from("pg_attribute a")
      .leftJoin("pg_constraint con", [
        eq("con.conrelid", ref("c.oid")),
        eq("a.attnum", fn("ANY", "con.conkey")),
        eq("con.contype", lit("f")),
      ])
      .leftJoin("pg_attribute ref_att", eq("ref_att.attnum", idx("con.confkey", 1)))
      .where("c.relname", "t")
      .where(gt("a.attnum", 0))
      .where(not("a.attisdropped"))
      .compile("dollar");

    expect(q.text).toBe(
      "SELECT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.oid AND a.attnum = ANY(i.indkey)) AS is_primary " +
        "FROM pg_attribute a " +
        "LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND a.attnum = ANY(con.conkey) AND con.contype = 'f' " +
        "LEFT JOIN pg_attribute ref_att ON ref_att.attnum = con.confkey[1] " +
        "WHERE c.relname = $1 AND a.attnum > $2 AND NOT (a.attisdropped)",
    );
    // Only the two `where` values are bound; every reference/expression is not.
    expect(q.values).toEqual(["t", 0]);
  });

  it("defaults to SELECT * when no columns are given", () => {
    expect(select().from("t").where("a", 1).compile("question")).toEqual({
      text: "SELECT * FROM t WHERE a = ?",
      values: [1],
    });
    expect(select({}).from("t").compile("question").text).toBe("SELECT * FROM t");
  });

  it("nests SELECTs via sub(), derived() and outerApply()", () => {
    const scalar = select({
      pk: sub(
        select({ c: fn("COUNT", "*") })
          .from("s")
          .where("s.a", ref("o.a")),
      ),
    })
      .from("o")
      .compile("question");
    expect(scalar.text).toBe("SELECT (SELECT COUNT(*) AS c FROM s WHERE s.a = o.a) AS pk FROM o");
    expect(scalar.values).toEqual([]);

    const joined = select({ x: "t.x" })
      .from("t")
      .leftJoin(derived(select({ id: "d.id" }).from("d").where("d.ok", 1), "d"), "d.id", "t.id")
      .compile("literal");
    expect(joined.text).toBe(
      "SELECT t.x AS x FROM t LEFT JOIN (SELECT d.id AS id FROM d WHERE d.ok = 1) AS d ON d.id = t.id",
    );

    const applied = select({ x: "t.x" })
      .from("t")
      .outerApply(select({ v: "s.v" }).prefix("TOP 1").from("s").orderBy("s.v"), "f")
      .compile("literal");
    expect(applied.text).toBe(
      "SELECT t.x AS x FROM t OUTER APPLY (SELECT TOP 1 s.v AS v FROM s ORDER BY s.v) AS f",
    );
  });

  it("renders a table-valued function in FROM and binds a value()", () => {
    expect(select().from(fn("duckdb_tables")).where("x", 1).compile("question")).toEqual({
      text: "SELECT * FROM duckdb_tables() WHERE x = ?",
      values: [1],
    });
    expect(
      select()
        .from(fn("pragma_table_info", value("roles")))
        .compile("question"),
    ).toEqual({
      text: "SELECT * FROM pragma_table_info(?)",
      values: ["roles"],
    });
  });

  it("renders LIKE / NOT LIKE and CASE WHEN", () => {
    const q = select({ flag: caseWhen(isNull("pk.id"), 0, 1) })
      .from("t")
      .where(notLike("name", lit("sqlite_%")))
      .where(like("kind", lit("a%")))
      .compile("literal");
    expect(q.text).toBe(
      "SELECT CASE WHEN pk.id IS NULL THEN 0 ELSE 1 END AS flag FROM t WHERE name NOT LIKE 'sqlite_%' AND kind LIKE 'a%'",
    );
    expect(q.values).toEqual([]);
  });

  it("supports OR and array conditions (implicit AND)", () => {
    const q = select({ x: "a" })
      .from("t")
      .where(or([eq("k", "table"), eq("k", "view")]))
      .where(["b > 0", not("c")])
      .compile("question");
    expect(q.text).toBe("SELECT a AS x FROM t WHERE (k = ? OR k = ?) AND b > 0 AND NOT (c)");
    expect(q.values).toEqual(["table", "view"]);
  });

  it("renders GROUP BY, raw clauses and ORDER BY in order", () => {
    const q = select({ table_name: "t.name" })
      .from("sys.tables t")
      .raw("OUTER APPLY (SELECT 1 AS x) AS fk")
      .where("t.is_ms_shipped", 0)
      .groupBy("t.name")
      .orderBy("t.name")
      .compile("literal");
    expect(q.text).toBe(
      "SELECT t.name AS table_name FROM sys.tables t OUTER APPLY (SELECT 1 AS x) AS fk " +
        "WHERE t.is_ms_shipped = 0 GROUP BY t.name ORDER BY t.name",
    );
  });
});
