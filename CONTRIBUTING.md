# Contributing to EasySQL JavaScript & TypeScript SDK

Thank you for your interest in contributing to the **EasySQL JavaScript & TypeScript SDK**! We appreciate your help in making these packages better for everyone.

This document outlines the guidelines for reporting issues, suggesting features, and submitting code contributions.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and considerate when interacting with the community and maintainers.

---

## How to Contribute

### 1. Reporting Bugs

If you find a bug:
1. Check the [Issues tracker](https://github.com/Clearsoft-net/easysql-js/issues) to ensure the bug hasn't already been reported.
2. If not reported, open a new issue with:
   - A clear and descriptive title.
   - Steps to reproduce the problem.
   - Expected behavior vs. actual behavior.
   - Your environment (Node.js/Bun/Deno version, OS, package version).
   - Code snippets or minimal reproduction examples when applicable.

### 2. Suggesting Enhancements

Feature requests are always welcome!
- Open an issue describing the proposed feature and why it would be beneficial.
- Provide examples of how the new API or feature would be used in practice.

---

## Development Workflow

### Prerequisites

- [Bun](https://bun.sh/) (version 1.0 or newer)
- Git

### Setup

1. **Fork the repository** on GitHub: [Clearsoft-net/easysql-js](https://github.com/Clearsoft-net/easysql-js).
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/easysql-js.git
   cd easysql-js
   ```
3. **Install dependencies**:
   ```bash
   make install
   # or
   bun install --frozen-lockfile
   ```

### Local Scripts

You can use `make` or run Bun commands directly:

| Command | Description |
|---|---|
| `make lint` | Lint the workspace with Biome |
| `make typecheck` | Run TypeScript type checks (`tsc --noEmit`) in every package |
| `make test` | Run the unit test suite (`bun test`) in every package |
| `make build` | Compile every package to its `dist/` |
| `make generate` | Regenerate `packages/client` from the OpenAPI specification |
| `make docs` | Generate TypeDoc API documentation |
| `make check` | `verify:versions` + `make lint` + `make typecheck` + samples + `make test` |
| `make coverage` | Run tests with coverage and enforce the threshold |
| `make all` | Run full pipeline (`install` → `generate` → `check` → `build`) |

Extra checks: `bun run verify:versions` (all packages share the root version)
and `bun run smoke:node` (load every built package under Node — run after
`make build`). Coverage defaults to an 80% line threshold; without local
databases, run `COVERAGE_THRESHOLD=60 bun run coverage`.

Changes to `packages/client` are generated: never edit them by hand, run
`make generate` instead. CI fails when the generated package is modified
manually.

Before submitting any code, ensure that the workspace check passes:
```bash
make check
make build
```

---

## Commit Message Guidelines

We use **[Semantic Release](https://github.com/semantic-release/semantic-release)** to automate package versioning and publishing to npm. Because of this, commit messages **must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification**.

Format:
```text
<type>(<scope>): <subject>
```

### Supported Types:

| Type | Release Type | Description |
|---|---|---|
| `feat` | **Minor** (`1.x.0`) | A new feature or capability |
| `fix` | **Patch** (`1.0.x`) | A bug fix |
| `perf` | **Patch** (`1.0.x`) | Performance improvement |
| `docs` | None | Documentation changes |
| `refactor` | None | Code change that neither fixes a bug nor adds a feature |
| `test` | None | Adding or updating tests |
| `chore` | None | Maintenance tasks, tooling updates, dependencies |
| `ci` | None | Changes to CI/CD workflows and configuration |

### Breaking Changes:
If a commit introduces a breaking change, include `BREAKING CHANGE:` in the commit footer or add `!` after the type (e.g. `feat!: change connector config format`), which triggers a **Major** release (`2.0.0`).

### Examples:
- `feat(sdk): add stream support for natural language queries`
- `fix(auth): handle expired refresh token gracefully`
- `docs(readme): add bun installation example`
- `test(client): add unit test for custom headers`

---

## Pull Request Process

1. Create a new branch for your change:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Make your changes and write unit tests where appropriate.
3. Ensure the workspace check passes:
   ```bash
   make check
   ```
4. Commit your changes using Conventional Commits.
5. Push your branch to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```
6. Open a **Pull Request** targeting the `main` branch of `Clearsoft-net/easysql-js`.
7. Fill in the PR description with details about the changes made and link any related issues.

---

## License

By contributing to EasySQL JavaScript & TypeScript SDK, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
