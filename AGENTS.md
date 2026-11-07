# Working on Triplex

> **triplex-db-2 scope note (2026-11-07):** goals, scope and performance targets for this checkout are defined only in
> [`lab/SCOPE.md`](lab/SCOPE.md), [`lab/NORTH-STAR.md`](lab/NORTH-STAR.md) and [`lab/TARGETS.md`](lab/TARGETS.md). Where this
> file states goals, targets, scale, load profiles, lanes, queues, resource grants or devloop procedure, it is superseded
> history from the homebase. Read it only for facts about code and evidence.

Triplex is a pre-1.0, Effect-native fact database for TypeScript. Read
[CONTRIBUTING.md](CONTRIBUTING.md), [ARCHITECTURE.md](ARCHITECTURE.md), and
[Current state](docs/current-state.md) before changing its contracts. The
[modeling guide](docs/agents.md) covers building applications with Triplex.

## Setup and checks

Use Node.js 22 or newer and the pinned pnpm 10.11.0:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` is the single root check: formatting (oxfmt), linting (oxlint),
TypeScript, checked Markdown examples and generated example outputs, unit and
SQLite/workerd integration tests, package builds, and the VitePress docs build.
The docs build also checks the generated `dist/llms.txt` structure and local links.

Run `pnpm pack:check` after package changes to verify tarballs and a clean consumer.
PostgreSQL and FoundationDB integrations require external services or native
libraries and are opt-in with `pnpm test:postgres:integration` and
`pnpm test:foundationdb:integration`. Follow CONTRIBUTING.md for changes that
require these suites. Browser tests use `pnpm test:e2e` after installing Chromium
with `pnpm exec playwright install chromium`. Stress tests are opt-in with
`pnpm --filter triplex-stress stress-test`.

## Repository layout

- `packages/core`: browser-safe model, Effect services, KV storage, Datalog,
  configuration, derivations, and public runtime composition.
- `packages/sql`, `packages/sqlite`, `packages/postgres`, `packages/cloudflare`,
  `packages/foundationdb`: shared SQL and backend implementations.
- `packages/host`, `packages/http`, `packages/cli`, `packages/dashboard`,
  `packages/testkit`: hosting contracts, HTTP, tools, and reusable conformance tests.
- `examples/`: runnable demos and reference hosts.
- `test/integration`, `test/stress`, `e2e/`: cross-package, stress, and browser tests.
- `docs/`: VitePress pages and checked snippets; `docs/.vitepress/llms.ts`
  generates `llms.txt`, `llms-full.txt`, and Markdown page variants into `dist/`.
- `scripts/`: documentation and package checks.
- `.github/workflows/`: CI, docs deployment, and Changesets releases;
  `alchemy.run.ts` defines the Cloudflare documentation site.

## Conventions and boundaries

- Use ESM and TypeScript with Effect. Pin external dependencies in the root pnpm
  catalog and use workspace packages through their public exports.
- Preserve the one-way graph in ARCHITECTURE.md: core must not depend on backends
  or Node-only APIs; SQL and backend packages build on core.
- Public exports point to generated `dist` files. Add a Changeset for a
  publishable package change; keep private packages out of its frontmatter.
- Mark self-contained documentation examples with `ts check` fences; use ordinary
  `ts` fences for fragments. Keep generated outputs in sync with `pnpm docs:outputs`.
- Keep maturity claims accurate: KV and SQLite are supported, PostgreSQL is a
  pre-1.0 production candidate, and Cloudflare and FoundationDB are experimental.
- Do not edit generated `dist` files, import sibling project source, or bypass
  public package boundaries. Do not deploy manually, publish packages, or merge
  without explicit authorization; the existing workflows handle deployment and
  releases.

## Local temporal-store development loop

The current user-authorized project is the local development loop described in
[qualification/devloop/PLAN.md](qualification/devloop/PLAN.md). Read the actual
[commands and evidence contracts](qualification/devloop/README.md),
[operating decisions](wiki/decisions/operating-policy.md),
[research and failures](wiki/research.md), and [ten-goal ledger](wiki/goals.md)
before starting work. These current constraints govern this project; archived
instructions excluding DuckDB, limiting disk to12GiB, or serializing every
performance run are historical background.

- Keep three shared physical foundations (DuckDB, XTDB, QLever) and five competing
  public query paths: `duckdb-datalog`, `xtdb-datalog`, `qlever-datalog`,
  `xtdb-native` (trusted authored SQL/XTQL), and `qlever-native` (trusted authored
  SPARQL). TypeScript SDK and existing Triplex schemas remain the public boundary.
  Native paths initially share Triplex writes, history and receipts. Native
  patches/helpers are allowed when justified; no new public schema DSL or full
  native AST rewriter is required. Count the complete application path and its
  maintenance/history/SDK cost; bare native queries are diagnostic floors.
- The root agent orchestrates. All research, implementation, integration and
  verification are performed by max-effort subagents. With three worker slots,
  rotate a separate verifier role; do not self-certify a promotion. Keep two or
  three candidate hypotheses per lane for the same measured bottleneck (10–15
  live candidates), with lightweight work while expensive jobs wait.
- Production admission uses the single canonical `.devloop` queue. At most three
  expensive trials run systemwide. The initial reservation pool is10GiB, including
  resident engines once per physical foundation plus separate clients/builds.
  Vector admission may allow fewer jobs when memory, CPU or disk makes three
  physically inadmissible. Use fair aged cohorts; do not impose a universal
  serial performance mutex. Native Mac RSS watchdogs are not hard containment.
- Hard total project-owned disk is50,000,000,000 bytes, including the original ZIP,
  sparse-image backing, caches, binaries, VM images, fixtures, worktrees and
  receipts. Stop new admissions at the46GB operational threshold. New owned
  writes belong inside the quota-backed mount; do not write beneath an unmounted
  mountpoint. Read [tools/bootstrap/MOUNT.md](tools/bootstrap/MOUNT.md). Never
  change HOME or place task caches in shared/global locations.
- Use `tools/bootstrap/with-env.sh` and `tools/bootstrap/pnpm`; they check the
  mount and supply pinned tools, owned caches and the private Docker/Colima
  endpoint. Do not use the generic unwrapped install commands above for this
  project. Coordinate dependency changes with the environment owner, preserve
  pinned lock entries, and retain source/checksum/install receipts. Do not fall
  back to a default Docker daemon, global package cache or unrelated service.
  Docker owner proofs bind exact private container IDs, labels, writable mounts
  and read-back caps; a Linux guest PID is never a Mac process identity.
- Preserve lossless ZIP research/variant access and the selected import's
  portable-export provenance. Historical PASS receipts are historical, not fresh
  execution. New attempts bind source, builds, dependencies, oracle identities,
  raw result bytes, ownership and resource observations. First failures remain;
  reruns are allowed with new attempts or job IDs and an explicit reason. Do not
  forge original Git proof or retroactively anchor an old diagnostic artifact.
- Canonical state is v2 and keeps scheduling headers, not repeated full input
  arrays. Consumers use `readState` and `loadJobManifest` from
  `qualification/devloop/state.mjs`; do not read `job.manifest.inputs` directly
  or hand-edit publication anchors. New jobs preserve copied content-addressed
  source/runner/oracle/recipe preimages and actual controller bytes with byte
  indexes. Keep those copies and receipts; do not copy credential or dependency
  caches into them. Historical working-tree hash/command/query traces provide
  partial reconstruction, not complete source snapshots. Unpublished terminal
  files after a controller crash remain unqualified; explicit proven cleanup
  may release gone clients without adopting a semantic PASS.
- Run real commands through resource grants and retain actual cleanup/abort
  outcomes. Exit zero, emitted `passed:true`, generated query shape, queued work
  and unintegrated tests are not semantic acceptance. The independent verifier
  reruns relevant source-bound gates. Shared wiki entries use problem/solution
  tags and link failures, receipts and decisions. Code and authored native
  queries cite inspiration, mechanism and adaptation rationale; sources remain
  hypotheses to test, not authority over observed behavior.
- Calibrate first. Acceptance targets256 logical clients;512/1024 are stress
  profiles. Concurrent read goodput is primary while writers make sustained,
  correct visible progress. Freeze the measured writer floor and fair cohort
  before comparisons. Do not invent a production latency SLA. The common scale
  target is10m entities and100m active representative-domain facts, not archived
  fact-only samples. All ten outcome goals remain in the ledger until their
  applicable fresh gates pass; query-surface expressiveness is tracked separately.
- Keep the existing Mac C++ DuckDB engine and owner. A Linux profile is a later
  independently qualified profile, not a required rewrite. Rust in another lane
  requires a measured bottleneck and still returns through TypeScript. Preserve
  public package exports; do not import sibling project source or edit generated
  build artifacts directly. Coordinate short source-pin windows before shared
  edits/builds. Do not auto-commit parallel workers' changes.
- Cleanup requires owned paths, proven quiescence and declared retention. Keep
  unknown/forensic backend state and first-failure receipts. Never delete the
  original ZIP, unrelated files or an active foundation to make a trial fit.
