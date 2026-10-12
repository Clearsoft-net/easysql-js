import {
  ConnectorEngine,
  type MysqlConnectorOptions,
  type PostgresConnectorOptions,
  type SqliteConnectionConfig,
  type SqliteConnectorOptions,
} from "../../src/index.js";

const validMySql: MysqlConnectorOptions = {
  engine: ConnectorEngine.MySQL,
  connection: { socket: "/var/run/mysql.sock", user: "user", database: "db" },
};

const validPostgres: PostgresConnectorOptions = {
  engine: ConnectorEngine.PostgreSQL,
  connection: "postgresql://user:pass@localhost/db",
  provider: "neon",
};

const validSqlite: SqliteConnectorOptions = {
  engine: ConnectorEngine.SQLite,
  connection: { file: ":memory:", readonly: false },
};

const invalidSqliteConnection: SqliteConnectionConfig = {
  file: "database.sqlite",
  // @ts-expect-error SQLite does not accept TCP configuration fields
  host: "localhost",
};

const invalidMysqlProvider: MysqlConnectorOptions = {
  engine: ConnectorEngine.MySQL,
  // @ts-expect-error MySQL does not accept Neon provider metadata
  provider: "neon",
  connection: "mysql://user:pass@localhost/db",
};

void [validMySql, validPostgres, validSqlite, invalidSqliteConnection, invalidMysqlProvider];
