/**
 * Schema generation re-exports the shared contracts from `@easysql/common` so
 * existing consumers keep importing them from this package.
 */

export type {
  ColumnSchema,
  ConnectorEngine,
  RawColumn,
  RawSchema,
  RawTable,
  SchemaType,
  TableSchema,
} from "@easysql/common";
