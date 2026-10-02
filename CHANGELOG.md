# [3.0.0](https://github.com/Clearsoft-net/easysql-js/compare/v2.3.0...v3.0.0) (2026-10-02)


* refactor(sdk)!: rename connectors to connections in the API client ([#21](https://github.com/Clearsoft-net/easysql-js/issues/21)) ([b8e9bf4](https://github.com/Clearsoft-net/easysql-js/commit/b8e9bf49f7bffe6a79e218901c9e88f63d170a1c))


### Features

* **sdk:** regenerate API types from OpenAPI spec ([#15](https://github.com/Clearsoft-net/easysql-js/issues/15)) ([48e6728](https://github.com/Clearsoft-net/easysql-js/commit/48e6728b85c44067b0196b036ced01a7a752fdc4))
* **sdk:** regenerate API types from OpenAPI spec ([#16](https://github.com/Clearsoft-net/easysql-js/issues/16)) ([f5633d2](https://github.com/Clearsoft-net/easysql-js/commit/f5633d252c428ea36283ba34f704ad808c6c8448))
* **sdk:** regenerate API types from OpenAPI spec ([#17](https://github.com/Clearsoft-net/easysql-js/issues/17)) ([d805191](https://github.com/Clearsoft-net/easysql-js/commit/d8051914664ca7f239529c7c0fa9dea2b7603fc0))
* **sdk:** regenerate API types from OpenAPI spec ([#18](https://github.com/Clearsoft-net/easysql-js/issues/18)) ([d5bc2d4](https://github.com/Clearsoft-net/easysql-js/commit/d5bc2d46a6581c2f34bc37b3a5d1c4e19922f769))
* **sdk:** regenerate API types from OpenAPI spec ([#19](https://github.com/Clearsoft-net/easysql-js/issues/19)) ([ab6c3c3](https://github.com/Clearsoft-net/easysql-js/commit/ab6c3c367a60b2b5234caac55bf36b9fe2dc6177))
* **sdk:** regenerate API types from OpenAPI spec ([#20](https://github.com/Clearsoft-net/easysql-js/issues/20)) ([69e184b](https://github.com/Clearsoft-net/easysql-js/commit/69e184bf74096206294f9ac9642a04825fb6d17d))


### BREAKING CHANGES

* the API client method names and paths changed; consumers
(CLI, MCP) must update to @easysql/client >= 3.

# [2.3.0](https://github.com/Clearsoft-net/easysql-js/compare/v2.2.0...v2.3.0) (2026-09-27)


### Features

* **sdk:** regenerate API types from OpenAPI spec ([#13](https://github.com/Clearsoft-net/easysql-js/issues/13)) ([4046240](https://github.com/Clearsoft-net/easysql-js/commit/40462400f2b8648ddf716e4fbbd900e02d2e24a1))
* **sdk:** regenerate API types from OpenAPI spec ([#14](https://github.com/Clearsoft-net/easysql-js/issues/14)) ([1cfb5cd](https://github.com/Clearsoft-net/easysql-js/commit/1cfb5cdee1ccb2d71f63c8252c578408e04de716))

# [2.2.0](https://github.com/Clearsoft-net/easysql-js/compare/v2.1.0...v2.2.0) (2026-09-25)


### Features

* **connectors:** add ClickHouse connector support ([#12](https://github.com/Clearsoft-net/easysql-js/issues/12)) ([749e7ea](https://github.com/Clearsoft-net/easysql-js/commit/749e7ea8fd7333f1689bc0e983c633002556903a))

# [2.1.0](https://github.com/Clearsoft-net/easysql-js/compare/v2.0.0...v2.1.0) (2026-09-25)


### Features

* **sdk:** regenerate API types from OpenAPI spec ([#11](https://github.com/Clearsoft-net/easysql-js/issues/11)) ([7623a30](https://github.com/Clearsoft-net/easysql-js/commit/7623a30791f5753651dd0fee7c32b1700e79c60d))

# [2.0.0](https://github.com/Clearsoft-net/easysql-js/compare/v1.1.1...v2.0.0) (2026-09-16)


* refactor(sdk)!: restructure into a multipackage repository (EZSQL-51) ([#9](https://github.com/Clearsoft-net/easysql-js/issues/9)) ([c023986](https://github.com/Clearsoft-net/easysql-js/commit/c0239864562187165d4ead713c30e67faec871cc))


### BREAKING CHANGES

* @clearsoft/easysql-sdk was replaced by @easysql/client (new
package name and import path); connectors and schema generation are new
packages.

* ci: scope connector integration env to the integration and coverage jobs

The global env exposed EASYSQL_TEST_*_URL to the check job, whose runner has no database services, so the connector integration tests failed with ECONNREFUSED.

## [1.1.1](https://github.com/Clearsoft-net/easysql-js/compare/v1.1.0...v1.1.1) (2026-09-11)


### Bug Fixes

* **tests:** update tests for OIDC auth ([aa571f6](https://github.com/Clearsoft-net/easysql-js/commit/aa571f62d341069ad90dbf8e2589a1d3510a372e))

# [1.1.0](https://github.com/Clearsoft-net/easysql-js/compare/v1.0.1...v1.1.0) (2026-09-07)


### Features

* **sdk:** regenerate API types from OpenAPI spec ([#8](https://github.com/Clearsoft-net/easysql-js/issues/8)) ([c43b1b4](https://github.com/Clearsoft-net/easysql-js/commit/c43b1b4db414826b094d2534acf9c13df1bf3c22))

# 1.0.0 (2026-09-04)


### Bug Fixes

* **docs:** use light logo with forced background for npm registry ([c46976a](https://github.com/Clearsoft-net/easysql-js/commit/c46976ab0e5e4ceabfec9c39b87b6d7243c36c18))
* regenerate API types using astToString for openapi-typescript v7 ([d64c3a8](https://github.com/Clearsoft-net/easysql-js/commit/d64c3a818da46ae327b4069fffbca52fdcb6f9db))


### Features

* initial project scaffold ([01157a8](https://github.com/Clearsoft-net/easysql-js/commit/01157a851bacc364c7dcd5a0283ccee12af7bc6a))
* **sdk:** add schema_only field to ConnectorResponse type ([55ade34](https://github.com/Clearsoft-net/easysql-js/commit/55ade34af95abf53068adf112ed734ec6f6ea1b6))
* **sdk:** regenerate API types from OpenAPI spec ([4a1262b](https://github.com/Clearsoft-net/easysql-js/commit/4a1262b1e06c5b70dc8077b2021219312521485b))
* **sdk:** regenerate API types from OpenAPI spec ([f24b931](https://github.com/Clearsoft-net/easysql-js/commit/f24b9315aba59e40d8ae3906d58ffa807a4e1e10))

## [1.0.1](https://github.com/Clearsoft-net/easysql-js/compare/v1.0.0...v1.0.1) (2026-09-04)


### Bug Fixes

* **docs:** use light logo with forced background for npm registry ([0890dfd](https://github.com/Clearsoft-net/easysql-js/commit/0890dfd9a3e8e8225561aac61fe842b1a95a1db3))

# 1.0.0 (2026-09-04)


### Bug Fixes

* regenerate API types using astToString for openapi-typescript v7 ([3fb60a1](https://github.com/Clearsoft-net/easysql-js/commit/3fb60a193ff60529660fa214a4d2defcb5bc6d14))


### Features

* initial project scaffold ([01157a8](https://github.com/Clearsoft-net/easysql-js/commit/01157a851bacc364c7dcd5a0283ccee12af7bc6a))
* **sdk:** add schema_only field to ConnectorResponse type ([c1ce773](https://github.com/Clearsoft-net/easysql-js/commit/c1ce773dcb70cb08ec759daca8496d5ae88c3a19))
* **sdk:** regenerate API types from OpenAPI spec ([d6a4427](https://github.com/Clearsoft-net/easysql-js/commit/d6a442706a849d1e9b4c091157a4c82a1a407814))
* **sdk:** regenerate API types from OpenAPI spec ([5deb849](https://github.com/Clearsoft-net/easysql-js/commit/5deb84950a36baa521d43d85a3ad44cb156ddf03))

# Changelog

## [0.2.0] — 2026-06-03

### Breaking

- **SDK rewritten.** Class-based API (`AuthApi`, `ConnectorsApi`, etc.) replaced with
  `createEasySQLClient()` returning named methods (`client.login()`, `client.me()`, etc.).
- **Property names now use snake_case** (matching the API JSON response). Previously
  the SDK converted to camelCase via `FromJSON`/`ToJSON` transformers.
- **Runtime dependencies changed.** `openapi-generator` (Java) replaced with
  `openapi-typescript` + `openapi-fetch`. Consumers now depend on `openapi-fetch`.

### Added

- `make generate` — downloads the OpenAPI spec and auto-generates `src/api-types.ts`,
  `src/client.ts`, and `docs/API.md`.
- **Named methods** on the client (`client.login()`, `client.createConnector()`, etc.)
  with full type safety, `@example` tags, and flattened parameters.
- **Unit tests** — 10 tests covering auth, request body, path/query params, and
  response parsing. Run with `make test` or `bun test`.
- **Markdown API reference** — `docs/API.md` grouped by category, with real parameter
  names from the spec.
- **Typedoc HTML documentation** — `make docs` generates interactive HTML docs.
- **Retry logic** for spec download (3 attempts with exponential backoff).

### Changed

- **CI workflow** now uses `make` targets and runs `make test` before build.
- **Build tooling** switched from npm to Bun (`bun install`, `bun run`).
- **File structure** simplified: 33 generated files → 2 (`api-types.ts` + `client.ts`).
- **Smoke test** moved from `src/test.ts` to root `test.ts` (not compiled to `dist/`).

### Removed

- `src/apis/`, `src/models/`, `src/runtime.ts` — replaced by `openapi-fetch`.
- `openapi-generator-cli` (Java dependency in CI).
- `tsx` — Bun runs TypeScript natively.
- `@types/node` — no longer needed after moving smoke test outside `src/`.

## [0.1.0] — 2026-05-30

- Initial release. Class-based SDK generated by OpenAPI Generator (`typescript-fetch`).
