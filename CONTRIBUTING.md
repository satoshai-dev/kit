# Contributing

## Setup

```bash
pnpm install        # installs deps + sets up husky hooks via "prepare" script
pnpm build          # build the library (tsup → ESM + CJS + .d.ts)
pnpm test           # run unit tests (vitest)
```

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/my-feature
```

### 2. Make your changes

Edit code in `packages/kit/src/`. Run tests locally:

```bash
pnpm test           # unit tests
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
```

### 3. Add a changeset

Every PR that changes the library **must** include a changeset.

```bash
pnpm changeset
```

This prompts you to:

1. **Select the package** — pick `@satoshai/kit`
2. **Choose the bump type**:
   - `patch` — bug fixes, docs, internal changes
   - `minor` — new features, non-breaking additions
   - `major` — breaking API changes
3. **Write a summary** — one-line description of what changed (this goes into the changelog)

Commit this file alongside your code changes.

**When to skip**: Changes that don't affect the published package (CI config, repo docs, test-only changes) don't need a changeset.

### 4. Commit

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Tooling, deps, CI, build changes |

Examples:

```bash
git commit -m "feat: add stx_signMessage wallet method"
git commit -m "fix: handle empty post-conditions array"
git commit -m "chore: bump @stacks/transactions to 7.4.0"
```

### 5. Push and open a PR

```bash
git push -u origin feat/my-feature
```

## Git Hooks

Husky runs these automatically:

| Hook | Runs | What it does |
|---|---|---|
| `pre-commit` | Before every commit | `pnpm lint && pnpm typecheck` |
| `pre-push` | Before every push | `pnpm test` |
| `commit-msg` | On commit | Validates conventional commit format via commitlint |

## Scripts Reference

| Script | What it does |
|---|---|
| `pnpm build` | Build the library (tsup → `dist/`) |
| `pnpm test` | Run unit tests (vitest) |
| `pnpm test:unit` | Same as `pnpm test` |
| `pnpm lint` | ESLint across all packages |
| `pnpm typecheck` | TypeScript type checking across all packages |
| `pnpm clean` | Remove `dist/` directories |
| `pnpm changeset` | Create a new changeset |
| `pnpm version-packages` | Consume changesets and bump versions |
| `pnpm release` | Build and publish to npm |
