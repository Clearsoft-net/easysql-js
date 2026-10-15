/**
 * Catalog queries for Firebird.
 *
 * All metadata lives in the `RDB$` system tables. Names are stored fixed-width
 * and space-padded, so every query `TRIM`s them; the connector trims the same
 * way in memory. The table listing is static, while the column and foreign-key
 * queries take the table name as a parameter.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { eq, fn, isNull, lit, or, ref, select, sub } from "@easysql/query-builder";

/** Base user tables (system tables and views excluded). */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: fn("TRIM", "r.RDB$RELATION_NAME"), rows_approx: "r.RDB$STATISTICS" })
    .from("RDB$RELATIONS r")
    .where(or([eq("r.RDB$SYSTEM_FLAG", lit(0)), isNull("r.RDB$SYSTEM_FLAG")]))
    .where(isNull("r.RDB$VIEW_BLR"))
    .orderBy("1")
    .compile("question", { aliasQuote: '"' });
}

/**
 * User-table columns. `RDB$TYPES` supplies the native type name for
 * `RDB$FIELD_TYPE`; the primary-key flag is resolved through
 * `RDB$RELATION_CONSTRAINTS` → `RDB$INDEX_SEGMENTS` because a column may sit
 * in a non-PK unique index.
 */
export function columnsQuery(table: string): CompiledQuery {
  return select({
    field_name: fn("TRIM", "rf.RDB$FIELD_NAME"),
    field_position: "rf.RDB$FIELD_POSITION",
    null_flag: "rf.RDB$NULL_FLAG",
    default_source: "rf.RDB$DEFAULT_SOURCE",
    type_name: fn("TRIM", "ty.RDB$TYPE_NAME"),
    field_type: "f.RDB$FIELD_TYPE",
    field_sub_type: "f.RDB$FIELD_SUB_TYPE",
    character_length: "f.RDB$CHARACTER_LENGTH",
    field_length: "f.RDB$FIELD_LENGTH",
    field_precision: "f.RDB$FIELD_PRECISION",
    field_scale: "f.RDB$FIELD_SCALE",
    pk: sub(
      select({ c: fn("COUNT", "*") })
        .from("RDB$INDEX_SEGMENTS s")
        .innerJoin("RDB$RELATION_CONSTRAINTS rc", "rc.RDB$INDEX_NAME", "s.RDB$INDEX_NAME")
        .where("rc.RDB$RELATION_NAME", ref("rf.RDB$RELATION_NAME"))
        .where("rc.RDB$CONSTRAINT_TYPE", lit("PRIMARY KEY"))
        .where("s.RDB$FIELD_NAME", ref("rf.RDB$FIELD_NAME")),
    ),
  })
    .from("RDB$RELATION_FIELDS rf")
    .innerJoin("RDB$FIELDS f", "f.RDB$FIELD_NAME", "rf.RDB$FIELD_SOURCE")
    .leftJoin("RDB$TYPES ty", [
      eq("ty.RDB$FIELD_NAME", lit("RDB$FIELD_TYPE")),
      eq("ty.RDB$TYPE", "f.RDB$FIELD_TYPE"),
    ])
    .where("rf.RDB$RELATION_NAME", table)
    .orderBy("rf.RDB$FIELD_POSITION")
    .compile("question", { aliasQuote: '"' });
}

/**
 * Foreign-key columns of one table. `RDB$REF_CONSTRAINTS` names the unique
 * constraint that is referenced; its index segments are matched positionally
 * with the referencing index segments, which is how Firebird stores a
 * composite foreign key.
 */
export function foreignKeysQuery(table: string): CompiledQuery {
  return select({
    fk_column: fn("TRIM", "fk.RDB$FIELD_NAME"),
    ref_table: fn("TRIM", "fk.RDB$RELATION_NAME"),
    ref_column: fn("TRIM", "refs.RDB$FIELD_NAME"),
    segment: "fk.RDB$FIELD_POSITION",
    fk_name: fn("TRIM", "rc.RDB$CONSTRAINT_NAME"),
  })
    .from("RDB$RELATION_CONSTRAINTS rc")
    .innerJoin("RDB$REF_CONSTRAINTS refc", "refc.RDB$CONSTRAINT_NAME", "rc.RDB$CONSTRAINT_NAME")
    .innerJoin("RDB$RELATION_CONSTRAINTS urc", "urc.RDB$CONSTRAINT_NAME", "refc.RDB$CONST_NAME_UQ")
    .innerJoin("RDB$INDEX_SEGMENTS fk", "fk.RDB$INDEX_NAME", "rc.RDB$INDEX_NAME")
    .innerJoin("RDB$INDEX_SEGMENTS refs", [
      eq("refs.RDB$INDEX_NAME", "urc.RDB$INDEX_NAME"),
      eq("refs.RDB$FIELD_POSITION", "fk.RDB$FIELD_POSITION"),
    ])
    .where("rc.RDB$CONSTRAINT_TYPE", lit("FOREIGN KEY"))
    .where("rc.RDB$RELATION_NAME", table)
    .orderBy("rc.RDB$CONSTRAINT_NAME", "fk.RDB$FIELD_POSITION")
    .compile("question", { aliasQuote: '"' });
}
