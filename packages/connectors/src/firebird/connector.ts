/**
 * Firebird connector: local schema introspection and query execution.
 *
 * Uses `node-firebird` (an optional peer dependency). The driver is
 * callback-based, but ships promise wrappers (`attachAsync`, `queryAsync`,
 * `detachAsync`) which are used here so no callbacks leak into the connector.
 * The connection is opened explicitly with {@link FirebirdConnector.connect}
 * and released with {@link FirebirdConnector.close}. Credentials are held in
 * memory for the lifetime of the connector only and are stripped from every
 * error message that leaves the process.
 */

import firebird from "node-firebird";
import { BaseConnector } from "../base-connector.js";
import type {
  ColumnRow,
  FirebirdConnectionConfig,
  FirebirdField,
  ForeignKeyRow,
  IntrospectResult,
  RawColumn,
  RawQueryResult,
  RawTable,
  TableRow,
} from "./types.js";

export class FirebirdConnector extends BaseConnector<firebird.Database> {
  private readonly config: Required<FirebirdConnectionConfig>;

  constructor(config: FirebirdConnectionConfig) {
    super([config.password]);
    if (!config.database) throw new Error("FirebirdConnector: database is required");
    if (!config.user) throw new Error("FirebirdConnector: user is required");
    if (!config.password) throw new Error("FirebirdConnector: password is required");
    this.config = {
      host: config.host || "localhost",
      port: config.port ?? 3050,
      database: config.database,
      user: config.user,
      password: config.password,
      role: config.role ?? "",
      connectTimeoutMs: config.connectTimeoutMs ?? 10_000,
    };
  }

  /** Attaches to the database. Safe to call more than once. */
  protected async openHandle(): Promise<firebird.Database> {
    return firebird.attachAsync({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      // Result rows are keyed by the lowercase column alias, so
      // `execute()` can report the same names it uses as row keys.
      lowercase_keys: true,
      ...(this.config.role ? { role: this.config.role } : {}),
      connectTimeout: this.config.connectTimeoutMs,
    });
  }

  /** Detaches from the database. Safe to call when not connected. */
  protected async closeHandle(db: firebird.Database): Promise<void> {
    try {
      await db.detachAsync();
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs `sql` and reports its columns and rows. */
  protected async runQuery(db: firebird.Database, sql: string): Promise<RawQueryResult> {
    const result = await db.queryAsync<Record<string, unknown>>(sql, undefined, {
      withMeta: true,
    });
    const rows = Array.isArray(result.rows) ? result.rows : [];
    return {
      columns: columnNames(result.fields, rows),
      rows,
      rowCount: rows.length > 0 ? rows.length : (result.affectedRows ?? 0),
    };
  }

  /** Introspects the attached database and returns the raw schema. */
  async introspect(): Promise<IntrospectResult> {
    try {
      const tableRows = await this.query<TableRow>(
        `SELECT TRIM(r.RDB$RELATION_NAME) AS "table_name",
                r.RDB$STATISTICS AS "rows_approx"
         FROM RDB$RELATIONS r
         WHERE (r.RDB$SYSTEM_FLAG = 0 OR r.RDB$SYSTEM_FLAG IS NULL)
           AND r.RDB$VIEW_BLR IS NULL
         ORDER BY 1`,
      );

      const tables: RawTable[] = [];
      for (const row of tableRows) {
        const name = trimName(row.table_name);
        const columns = await this.query<ColumnRow>(COLUMNS_SQL, [name]);
        const foreignKeys = await this.query<ForeignKeyRow>(FOREIGN_KEYS_SQL, [name]);

        const fkByColumn = new Map<string, { table: string; column: string }>();
        for (const fk of foreignKeys) {
          fkByColumn.set(trimName(fk.fk_column), {
            table: trimName(fk.ref_table),
            column: trimName(fk.ref_column),
          });
        }

        tables.push({
          name,
          columns: columns.map((column) => toRawColumn(column, fkByColumn)),
          rowsApprox: toNullableNumber(row.rows_approx),
        });
      }

      return { engine: "firebird", tables };
    } catch (error) {
      throw this.wrap(error);
    }
  }

  /** Runs one introspection query, wrapping driver failures like every other call. */
  private async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = this.requireHandle();
    try {
      return (await db.queryAsync<T>(sql, params ?? [])) as T[];
    } catch (error) {
      throw this.wrap(error);
    }
  }
}

/**
 * User-table columns. `RDB$TYPES` supplies the native type name for
 * `RDB$FIELD_TYPE`; the primary-key flag is resolved through
 * `RDB$RELATION_CONSTRAINTS` → `RDB$INDEX_SEGMENTS` because a column may sit
 * in a non-PK unique index.
 */
const COLUMNS_SQL = `SELECT TRIM(rf.RDB$FIELD_NAME) AS "field_name",
       rf.RDB$FIELD_POSITION AS "field_position",
       rf.RDB$NULL_FLAG AS "null_flag",
       rf.RDB$DEFAULT_SOURCE AS "default_source",
       TRIM(ty.RDB$TYPE_NAME) AS "type_name",
       f.RDB$FIELD_TYPE AS "field_type",
       f.RDB$FIELD_SUB_TYPE AS "field_sub_type",
       f.RDB$CHARACTER_LENGTH AS "character_length",
       f.RDB$FIELD_LENGTH AS "field_length",
       f.RDB$FIELD_PRECISION AS "field_precision",
       f.RDB$FIELD_SCALE AS "field_scale",
       (SELECT COUNT(*)
          FROM RDB$INDEX_SEGMENTS s
          JOIN RDB$RELATION_CONSTRAINTS rc
            ON rc.RDB$INDEX_NAME = s.RDB$INDEX_NAME
         WHERE rc.RDB$RELATION_NAME = rf.RDB$RELATION_NAME
           AND rc.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
           AND s.RDB$FIELD_NAME = rf.RDB$FIELD_NAME) AS "pk"
FROM RDB$RELATION_FIELDS rf
JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
LEFT JOIN RDB$TYPES ty
  ON ty.RDB$FIELD_NAME = 'RDB$FIELD_TYPE'
 AND ty.RDB$TYPE = f.RDB$FIELD_TYPE
WHERE rf.RDB$RELATION_NAME = ?
ORDER BY rf.RDB$FIELD_POSITION`;

/**
 * Foreign-key columns of one table. `RDB$REF_CONSTRAINTS` names the unique
 * constraint that is referenced; its index segments are matched positionally
 * with the referencing index segments, which is how Firebird stores a
 * composite foreign key.
 */
const FOREIGN_KEYS_SQL = `SELECT TRIM(fk.RDB$FIELD_NAME) AS "fk_column",
       TRIM(fk.RDB$RELATION_NAME) AS "ref_table",
       TRIM(refs.RDB$FIELD_NAME) AS "ref_column",
       fk.RDB$FIELD_POSITION AS "segment",
       TRIM(rc.RDB$CONSTRAINT_NAME) AS "fk_name"
FROM RDB$RELATION_CONSTRAINTS rc
JOIN RDB$REF_CONSTRAINTS refc
  ON refc.RDB$CONSTRAINT_NAME = rc.RDB$CONSTRAINT_NAME
JOIN RDB$RELATION_CONSTRAINTS urc
  ON urc.RDB$CONSTRAINT_NAME = refc.RDB$CONST_NAME_UQ
JOIN RDB$INDEX_SEGMENTS fk
  ON fk.RDB$INDEX_NAME = rc.RDB$INDEX_NAME
JOIN RDB$INDEX_SEGMENTS refs
  ON refs.RDB$INDEX_NAME = urc.RDB$INDEX_NAME
 AND refs.RDB$FIELD_POSITION = fk.RDB$FIELD_POSITION
WHERE rc.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND rc.RDB$RELATION_NAME = ?
ORDER BY rc.RDB$CONSTRAINT_NAME, fk.RDB$FIELD_POSITION`;

function toRawColumn(
  row: ColumnRow,
  fkByColumn: Map<string, { table: string; column: string }>,
): RawColumn {
  const name = trimName(row.field_name);
  const primaryKey = Number(row.pk ?? 0) > 0;
  return {
    name,
    dataType: toDataType(row),
    // A primary key is never nullable, even though RDB$NULL_FLAG is left
    // unset for some legacy primary-key declarations.
    nullable: primaryKey ? false : Number(row.null_flag ?? 0) === 0,
    primaryKey,
    defaultValue: sanitizeDefault(row.default_source),
    foreignKey: fkByColumn.get(name) ?? null,
    ordinal: Number(row.field_position ?? 0) + 1,
  };
}

/** Rebuilds a readable native type from the catalog's numeric descriptor. */
function toDataType(row: ColumnRow): string {
  const typeName = sanitizeDefault(row.type_name) ?? "UNKNOWN";
  const length = toNullableNumber(row.character_length) ?? toNullableNumber(row.field_length);
  const scale = Math.abs(Number(row.field_scale ?? 0));

  if (typeName === "TEXT") return `VARCHAR(${length ?? 0})`;
  if (typeName === "CHAR") return `CHAR(${length ?? 0})`;
  if (typeName === "VARYING") return `VARCHAR(${length ?? 0})`;
  if (typeName === "BLOB") return "BLOB";
  if (scale > 0) {
    const precision = toNullableNumber(row.field_precision) ?? length;
    return `${typeName}(${precision ?? 0},${scale})`;
  }
  return typeName;
}

/** Firebird stores `DEFAULT` clauses as the full source text. */
function sanitizeDefault(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const match = /^DEFAULT\s+(.+)$/i.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

/** Trims Firebird's fixed-width, space-padded catalog names. */
function trimName(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function toNullableNumber(value: number | string | bigint | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Column names in result order. `lowercase_keys` makes the driver key rows by
 * the lowercased alias, and the same alias is what `fields` reports; row keys
 * are the fallback for a driver version that omits `fields`.
 */
function columnNames(
  fields: FirebirdField[] | undefined,
  rows: Record<string, unknown>[],
): string[] {
  if (fields && fields.length > 0) {
    return fields.map((field) => field.alias || field.field || "");
  }
  const first = rows[0];
  return first ? Object.keys(first) : [];
}
