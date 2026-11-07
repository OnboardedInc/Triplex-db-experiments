# EXP-000 loop harness (shared)

## Commander's intent
When this experiment is done, any agent in any git worktree can run any gate (G0 to G2 now, G3 to G7
later) against its own isolated XTDB 2.2.0 or QLever 0.6.0 engine with one command, and get an honest,
comparable JSON receipt. The orchestrator then compares receipts across branches to promote or reject
work. Every later experiment in this project stands on this harness, so its receipts must be trustworthy:
a gate that silently skips, or a receipt that can be overwritten, would let the whole loop lie to itself.

## Point of view (the orchestrator's decision; follow it unless you find hard evidence against it)
- **Thin Node scripts, no new dependencies, no daemon.** `lab/bin/*.mjs` using only Node 22 built-ins and
  the docker CLI. We have at most 10 agents and 3 heavy slots, so mkdir-based lock directories are enough.
  Rejected: reusing the homebase controller in `qualification/devloop/*.mjs` (queue, scheduler, quota
  mount, state v2). It is built for another machine and another team and is far heavier than we need.
  You may copy small pure helpers from `qualification/devloop/io.mjs`, `evidence.mjs`, `preimages.mjs`
  if they fit; say so in a comment.
- **Docker isolation is explicit.** Every docker call passes `-H unix:///Users/sam/.colima/triplex2/docker.sock`
  (or sets DOCKER_HOST for the child). Never use the default docker context: it runs Sam's unrelated
  Onboarded stack. Never run `colima` commands. Containers are named `tx2-<lane>-<slot>` and use named
  volumes `tx2-<lane>-<slot>-data`, not bind mounts (virtiofs bind mounts are slow for databases).
- **Images are pinned by digest**: `ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a426505b95a36e4e0e1d0de88efcf4220cb6bde8f1f5e594b0a1f92a948a77`
  and `adfreiburg/qlever:0.6.0@sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec`
  (both already pulled into the VM). Start from the repo's `compose.xtdb.yaml`, `xtdb-config.yaml`,
  `compose.qlever.yaml`, `qlever-start.sh` for engine configuration; record the effective config in receipts.
- **Slots.** `dev` (resident, shared by correctness work through disjoint database scopes) and `s1`,`s2`,`s3`
  (exclusive, for performance/destructive/crash runs). Ports: XTDB pgwire dev 5470, s1..s3 5471..5473;
  QLever dev 7070, s1..s3 7071..7073 (ports 5461-5469 and 7061-7069 belong to research probes; never use
  15442/17019). Put the table in `lab/config/slots.json` with memory/CPU caps (suggested: XTDB dev 3 GiB
  with -Xmx1500m and 1g direct memory; QLever dev 2.5 GiB with -m 1500M; s1..s3 3.5 GiB each).
- **One reservation pool, enforced:** the sum of memory caps of running `tx2-*` containers (residents count once,
  research probes `tx2-probe-*` included) plus the new one must stay at or below 11 GiB of the VM's 12 GiB, and
  CPU caps are recorded; otherwise refuse with a clear message naming what is running. Also check VM disk free
  (`docker system df` plus `df` inside a throwaway `busybox` or via `docker run --rm ... df`) against a
  per-lane forecast you document (start conservative; scale experiments refine it) and refuse when it does not fit.
  Do not stop containers you did not start. Right now research probes `tx2-probe-r7` (5 GiB) and `tx2-probe-r8`
  (5 GiB) may be running; if the pool refuses the dev engines, build and unit-test everything else first, retry
  every few minutes, and report if they never fit.
- **Receipts bind what actually executed (adversarial review finding 4; this is the harness's core job).**
  Each receipt records: source tree hash including uncommitted changes (e.g. `git stash create` tree id, or the
  HEAD tree plus a sha256 of `git diff HEAD --binary` and of untracked files under packages/ and lab/bin), the
  lockfile sha256, Node and pnpm versions, sha256 of every built `dist` file the gate imported (the gate runs the
  relevant `pnpm --filter ... build` first and hashes the outputs; the qualification loader imports backend
  `dist` exports, so a stale build would otherwise run), sha256 of the gate script and of oracle/fixture files,
  raw-result file hashes, and the endpoint actually contacted (assert it equals the slot's port). Missing identity
  fields make the gate FAIL.
- **Gates fail closed.** Any skipped case, zero executed cases, a missing identity, or a wrong endpoint is a FAIL.
  For XTDB G2, count executions per language from the native traces: a task counts for XTQL only if every read
  substep it ran was XTQL (likewise SQL); hybrid tasks are reported separately and count for neither.
- **Receipts are append-only.** `lab/runs/<gate>/<run-id>.json` (small, committed by the orchestrator) plus
  raw output under `runs/<gate>/<run-id>/` (gitignored). Never overwrite or delete a receipt; a rerun is a
  new run id that may reference the earlier one. A gate that runs zero tests, or whose live tests all
  skipped, is a FAIL, not a pass (live tests skip silently unless `XTDB_INTEGRATION=1` / `QLEVER_INTEGRATION=1`).

## Work
1. `lab/bin/engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh]`: acquire the slot
   lock (`lab/locks/<lane>-<slot>/owner.json` with holder, experiment id, pid, time), create or start the
   container with caps, wait for health (XTDB `/healthz/alive` or a pgwire `SELECT 1`; QLever a trivial
   SPARQL query), print shell exports (`XTDB_URL=...`, `QLEVER_URL=...`, plus any token the tests need).
   `--fresh` recreates the volume. `down` stops/removes the container and releases the lock (`dev` is
   normally left running). `status` lists slots, holders, container state, memory use.
2. `lab/bin/gate.mjs <gate> --lane xtdb|qlever [--slot dev] [--exp EXP-NNN] [--note ...]` with:
   - G0: typecheck plus pure unit tests for core, xtdb, qlever, qualification.
   - G1: unchanged44 shared conformance, current and reopen, against the slot's engine. R4 found the commands:
     XTDB `XTDB_INTEGRATION=1 XTDB_URL=... pnpm --filter @triplex-build/triplex-xtdb exec vitest run test/conformance.test.ts`;
     QLever via `packages/qualification` `test/runtime-conformance.test.ts` with `TRIPLEX_INTEGRATION=1
     TRIPLEX_QUERY_PATH=qlever-datalog QLEVER_URL=...` (verify; adapt as needed, and also find the right way to
     run the shared 44 against the native query paths if one exists).
   - G2: native142 via `packages/qualification/workloads/runner.ts` with `TRIPLEX_QUERY_PATH=xtdb-native` or
     `qlever-native`. Report XTQL and SQL call tallies separately for XTDB from the result traces.
   - Receipt fields: gate, lane, slot, run id, git SHA and dirty flag, branch, engine image digest (from
     `docker inspect`), engine config hash, fixture/packet id and sha256, start/end, pass/fail/skip counts,
     first failures (kept), timings, co-running `tx2-*` containers, peak container memory/CPU sampled during
     the run (`docker stats --no-stream` every few seconds), volume bytes.
3. Replace homebase coupling (R4, `lab/research/R4-codebase-harness-map.md` "Replace before running"):
   - The admission block in `packages/qualification/workloads/runner.ts` lines 61-110: add a lab admission path
     (for example `TRIPLEX_LAB_SLOT_OWNER=<path to owner.json>` checked to be a held slot lock, with output under
     `runs/`), keeping the existing homebase branch intact for provenance. Comment why.
   - Hard-coded ports/token files in the QLever entry scripts and `verify-xtdb-entry.ts`: make them read env.
   - Fix the two breakages: qualification vitest picking up `node:test` files / missing duckdb `dist`
     (exclude or build; our lanes do not need DuckDB at runtime), and `test_engine_cases.mjs` needing the
     missing `qualification/adapter/scale-fixture.mjs` (restore from git history of the archive if present,
     otherwise make the dependency explicit and skip with a recorded reason).
4. `lab/bin/scorecard.mjs`: rebuild the "Gates by lane" table in `lab/SCORECARD.md` from the newest receipt per
   gate/lane on `main` (do not touch the goal table; the orchestrator owns it).
5. `lab/bin/heavy.mjs -- <cmd...>`: a local lock allowing at most 4 concurrent heavy local commands
   (typecheck, full test runs) across all agents; waits with a visible message.
6. Smoke proof: bring up `dev` for both lanes and leave them running; run G0 fully; run G1 and G2 for both
   lanes at least on the smallest subset that proves the wiring (one conformance case and one native workload),
   and if time allows the full G1 and G2. Full baselines and their failure triage belong to EXP-001 (XTDB) and
   EXP-002 (QLever), so do not chase lane-specific semantic failures here; record them.

## Boundaries
- Work directly on `main` in /Users/sam/projects/triplex-db-2 (you are the only code writer right now; research
  agents only write under `lab/research/`). Commit in small logical commits ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.
- Do not touch /Users/sam/projects/triplex-db or its services. Do not change HOME or global caches; pnpm store is
  `/Users/sam/projects/triplex-db-2/.pnpm-store`.
- Code comments carry the reasoning: `// [EXP-000] Why: ... Rejected: ...`.

## Gates for this experiment
- `node lab/bin/gate.mjs G0 --lane xtdb` and `--lane qlever` produce PASS receipts.
- G1 and G2 smoke receipts exist for both lanes (PASS or a recorded FAIL with first failures).
- `node lab/bin/engine.mjs status` shows both dev engines healthy with their caps.

## Report
Write `lab/experiments/EXP-000-loop-harness/REPORT.md`: result class (PROGRESSED/FAILED/...), the commands, receipt
paths, what is still manual, surprises, and anything later experiments must know (ports, env vars, quirks). Final
message to the orchestrator: ≤300 words with receipt paths and known gaps.
