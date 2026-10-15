# @easysql/query-builder

A thin, SQL-first query builder with context-aware parameter binding. It backs
the catalog (introspection) queries of the [`@easysql/connectors`](../connectors)
package, and is published on its own so it can be reused and tested in isolation.

The builder models just enough structure — `select`, `from`, joins, `where`,
`groupBy`, `orderBy` — and treats any operand as a raw SQL fragment when needed.
It is deliberately not a universal ORM: it exists to keep the connectors' SQL
readable and parameter binding correct across fifteen very different engines.

## Install

```sh
npm install @easysql/query-builder
```

## Usage

```ts
import { eq, fn, lit, not, select } from "@easysql/query-builder";

const query = select({ table_name: "c.relname", rows_approx: "c.reltuples::bigint" })
  .from("pg_class c")
  .innerJoin("pg_namespace n", "n.oid", "c.relnamespace")
  .where("n.nspname", fn("current_schema"))
  .where("c.relkind", lit("r"))
  .where(not("c.relispartition"))
  .orderBy("c.relname")
  .compile("dollar");

query.text; // "SELECT c.relname AS table_name, … WHERE n.nspname = current_schema() AND c.relkind = 'r' AND NOT (c.relispartition) ORDER BY c.relname"
query.values; // []
```

A compiled query is `{ text, values }`: the SQL with the dialect's placeholders
and the values to pass alongside it.

Omit `columns` for `SELECT *`, and pass a table-valued function to `from()`
the same way as a table name:

```ts
select().from(fn("pragma_table_info", value("roles"))).compile("question");
// { text: "SELECT * FROM pragma_table_info(?)", values: ["roles"] }
```

### Nested SELECTs

`sub()` nests a `SELECT` as a scalar or predicate, `derived()` puts one in
`from`/joins, and `outerApply()` appends an `OUTER APPLY`:

```ts
select({ pk: sub(select({ c: fn("COUNT", "*") }).from("s").where("s.a", ref("o.a"))) })
  .from("o")
  .compile("question");
// SELECT (SELECT COUNT(*) AS c FROM s WHERE s.a = o.a) AS pk FROM o

select({ x: "t.x" })
  .from("t")
  .leftJoin(derived(select({ id: "d.id" }).from("d"), "d"), "d.id", "t.id")
  .compile("question");
// SELECT t.x AS x FROM t LEFT JOIN (SELECT d.id AS id FROM d) AS d ON d.id = t.id
```

## Binding rules

A bare string is interpreted by **position**:

- in an **expression** position (the select list, a function argument) it is a
  raw SQL fragment;
- on the **right of a `where` comparison** it is a **bound value**;
- in a join **`ON`** it is a **reference** (both sides).

Use the markers when the context does not say it for you: `ref()` forces a
reference, `lit()` a quoted string literal, `expr()` a raw fragment, `fn()` a
function call, `idx()` an array subscript and `value()` a value that is always
bound. Only `value()` (and a bare number or boolean) binds regardless of
context; every other marker is never bound.

The convention the connectors follow: a **dynamic** value (a schema or table
name) is passed bare so it binds, a fixed **constant** is wrapped in `lit()` so
it is inlined and the query stays parameter-free, and a **column** on the right
of a comparison is wrapped in `ref()`. `lit()` is required — not optional —
where a bare string would be read as raw SQL: the arguments of `fn()`, the `ON`
of a join, and the select list.

```ts
select({ is_primary: fn("EXISTS", …) })
  .from("pg_attribute a")
  .where("c.relname", table) // `table` is bound
  .where(eq("a.attnum", fn("ANY", "i.indkey"))); // never bound
```

## Placeholder styles

`compile(style)` selects how values are written:

| Style | Output | Engines |
|---|---|---|
| `question` | `?` | MySQL, SQLite, DuckDB, libSQL, D1, Firebird |
| `dollar` | `$1`, `$2`, … | PostgreSQL |
| `literal` | inlined literals | SQL Server, Oracle, Db2, Snowflake, Trino |

`compile` also accepts options, e.g. `{ aliasQuote: '"' }` to quote every SELECT
alias for engines that fold unquoted identifiers to uppercase (Oracle, Db2, HANA).

## Tests

```sh
bun test
```
