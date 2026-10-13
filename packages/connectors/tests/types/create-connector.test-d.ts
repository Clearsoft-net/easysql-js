import {
  type BigQueryConnectorOptions,
  ConnectorEngine,
  type CreateConnectorOptions,
  type DuckDbConnectorOptions,
  type MysqlConnectorOptions,
  type OracleConnectorOptions,
  type PostgresConnectorOptions,
  type SqliteConnectionConfig,
  type SqliteConnectorOptions,
  type SqlServerConnectorOptions,
  type TrinoConnectorOptions,
} from "../../src/index.js";

const validMySql: MysqlConnectorOptions = {
  engine: ConnectorEngine.MySQL,
  connection: { socket: "/var/run/mysql.sock", user: "user", database: "db" },
};

const validPostgres: PostgresConnectorOptions = {
  engine: ConnectorEngine.PostgreSQL,
  connection: "postgresql://user:pass@localhost/db",
  provider: "neon",
  transport: "http",
};

const validRedshift: PostgresConnectorOptions = {
  engine: ConnectorEngine.PostgreSQL,
  connection: "postgresql://user:pass@cluster/db",
  provider: "redshift",
};

const validSqlite: SqliteConnectorOptions = {
  engine: ConnectorEngine.SQLite,
  connection: { file: ":memory:", readonly: false },
};

const validSqlServer: SqlServerConnectorOptions = {
  engine: ConnectorEngine.SqlServer,
  connection: "sqlserver://sa:pass@localhost:1433/db",
};

const validOracle: OracleConnectorOptions = {
  engine: ConnectorEngine.Oracle,
  connection: { host: "localhost", serviceName: "FREEPDB1", user: "u", password: "p" },
};

const validDuckDb: DuckDbConnectorOptions = {
  engine: ConnectorEngine.DuckDB,
  connection: { file: ":memory:", readonly: false },
};

const validTrino: TrinoConnectorOptions = {
  engine: ConnectorEngine.Trino,
  connection: { host: "localhost", user: "trino", catalog: "tpch" },
};

const validBigQuery: BigQueryConnectorOptions = {
  engine: ConnectorEngine.BigQuery,
  connection: { projectId: "my-project", dataset: "analytics" },
};

/** The union still narrows by `engine`, so a generic option object is assignable. */
const unionSample: CreateConnectorOptions = validSqlServer;

const invalidSqliteConnection: SqliteConnectionConfig = {
  file: "database.sqlite",
  // @ts-expect-error SQLite does not accept TCP configuration fields
  host: "localhost",
};

const invalidMysqlProvider: MysqlConnectorOptions = {
  engine: ConnectorEngine.MySQL,
  // @ts-expect-error MySQL does not accept PostgreSQL provider metadata
  provider: "neon",
  connection: "mysql://user:pass@localhost/db",
};

const invalidClickhouseProvider: CreateConnectorOptions = {
  engine: ConnectorEngine.ClickHouse,
  // @ts-expect-error ClickHouse has no PostgreSQL-style provider option
  provider: "neon",
  connection: "clickhouse://user:pass@localhost/db",
};

void [
  validMySql,
  validPostgres,
  validRedshift,
  validSqlite,
  validSqlServer,
  validOracle,
  validDuckDb,
  validTrino,
  validBigQuery,
  unionSample,
  invalidSqliteConnection,
  invalidMysqlProvider,
  invalidClickhouseProvider,
];
