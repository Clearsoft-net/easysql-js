import type { EngineSchema } from "../types.js";

export type { Connector, QueryResult, RawColumn, RawSchema, RawTable } from "@easysql/common";

/** Explicit connection configuration for a Snowflake account. */
export interface SnowflakeConnectionConfig {
  /** Account identifier, e.g. "xy12345.us-east-1". */
  account: string;
  user: string;
  password: string;
  database: string;
  schema?: string;
  warehouse?: string;
  role?: string;
  connectTimeoutMs?: number; // default 60000 (cloud warehouses are slower to connect)
}

export type IntrospectResult = EngineSchema<"snowflake">;
