# EXP-X02 round 2 — CX-X02-R2

Result: F1–F4 repaired for independent review. This is a builder hand-back, not a promotion or an independent qualification verdict.

North star: correctness floor for P1 pinned reads and P4 current reads. Goals and numeric policy come from the main checkout's `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; Q79a–d in `lab/acceptance/RULINGS-PENDING.md` and Q39a in `RULINGS.md` govern this patch. Review baseline: `bf1ad4d`; reviewer reproductions read directly from `7392c0a` (`verify/X02`). The containing commit is the round-2 implementation/report commit.

## Repairs

- **F1 / Q79a:** `ReadOnlySql.ts` now retains lexical tokens from its existing comment/literal-aware scan. Quantified comparisons inspect those tokens, including bare operands. `ANY/**/(ARRAY[1,2])`, `ANY ARRAY[1,2]`, and `SOME/**/(ARRAY[1,2])` are refused in the public provider's Effect failure channel. Comparison context distinguishes quantified `ALL` from `SELECT ALL`, `UNION ALL`, aggregate modifiers and `FOR ALL VALID_TIME`. Comment-bearing supported subqueries and quoted text remain admitted. No authored task uses the rejected forms.
- **F2 / Q79b:** inventory availability checks execute inside `Effect.try`. An out-of-int64 subtraction now yields `Fail(NativeIntegerOverflowError)` rather than `Die`; both languages recover through `catchTag`. Exact ledger totals and successful boundary sums are unchanged.
- **F3 / Q79c / Q39a:** core's exact-compute lowering no longer emits either BIGINT cast around decimal arithmetic. It retains a DECIMAL carrier, reading text for range selection and final projection. XTDB explicitly sets `rejectExactCompute`, causing core to throw `DatalogValidationError` for all five exact operators before generating their arithmetic. The adapter's existing public executor preserves that error in its typed failure channel. This deliberately refuses even small exact computations until an exact XTDB lowering is qualified; there is no partial result or numeric fallback. Downstream computations, predicates, aggregates and wrappers cannot consume a refused computed binding. Ordinary number arithmetic, stored integer reads/comparisons, and the native exact-sum builders retain their paths. Compiler tests cover 1e18+4, both int64 limits, MAX+1 and MIN-1 results beyond signed int64, all five operators and downstream uses; executor tests prove `Fail` and `catchTag` recovery.
- **F4 / Q79d:** an absent `TRIPLEX_XTDB_NATIVE_LANGUAGE` remains absent in the loader and selects the historical mixed library: XTQL `state-at` reads, SQL other tasks, SQL scratch-table recursion with the existing 100-round budget. Both explicit language selections remain pure. Unit tests exercise all 71 logical tasks with the switch absent, and all 71 in each explicit language. This restores default routing/recursion compatibility; the requested correctness repairs and already introduced task-cut pinning still apply. The ordinary default query-path selection was not changed.

Only the five named implementation files changed (core compiler, XTDB compiler/envelope, qualification loader/task library), plus their tests and this experiment's report/evidence. No dependencies, public exports, engine lifecycle, main-checkout files or generated build artifacts were edited manually.

## Fresh checks

| Check | Result | Evidence |
| --- | --- | --- |
| G0, final attempt | **PASS: 949 executed, 949 pass, 0 fail; 130 expected skips, 0 unexpected**. Includes fresh builds/typechecks for core, testkit, XTDB, qualification; their offline Vitest suites; qualification/engine Node suites and packet-oracle checks. | `lab/runs/G0/G0-xtdb-20261108T214545Z-0f4929.json`; `runs/G0/G0-xtdb-20261108T214545Z-0f4929/`; `round2/G0-final.log` |
| Qualification offline suite | 26 pass; 46 expected integration skips | `round2/qualification-offline.log` |
| Reviewer offline reproduction, adapted expectations | Both inventory paths recover through `catchTag`; no defects; depth/edge guard controls retained; unset language is historical mixed; 13 source-map embeddings match fresh sources | `round2/offline-source.json`, `offline-source-retry.log` |
| Reviewer public-provider SQL probes | Four non-subquery quantified forms (including ordinary control) fail typed; compiler `+` / `*` probes refuse with `DatalogValidationError` | `round2/source-hazards.json`, `.jsonl`, `.log` |
| Reviewer real-engine native sum probes | **20/20 pass**, both languages: 1e18+4, int64 min/max, over/underflow, three 2^62 terms, cancellation, carry counterexample, availability overflow and net cancellation of overflowing sides | `round2/source-sums.json`, `.jsonl`, `source-sums-retry.log` |
| Formatting / lint / diff | oxfmt passes for all ten changed source/test files; oxlint passes for all five implementation files; `git diff --check` passes | Commands recorded below; no warnings/errors from lint |

Live probes used only the existing shared XTDB endpoint `127.0.0.1:5470`, the private Docker host setting, max one client connection per process, virtual relations and 15-second per-query timeouts. Both clients closed in `finally`, both wrappers exited zero and released their heavy tokens. No fixture writes or engine lifecycle operations occurred. They are light diagnostics, not G2 acceptance or performance measurements.

The raw engine-only DECIMAL→BIGINT control deliberately **still reproduces XTDB 2.2.0's rounding** (`1000000000000000004` → `1000000000000000000`); decimal/text and text/BIGINT controls preserve the value. This control calls the engine client directly to demonstrate why the generated Datalog path is refused. The patch does not repair XTDB itself or claim arbitrary user-authored SQL arithmetic is precision-safe. Native sum builders avoid this cast and passed all controls.

## Commands and execution adaptations

G0 used the branch's existing `lab/bin/gate.mjs` with its per-step shared heavy admission, rather than invoking the main checkout's newer runner against main source. Command:

```sh
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/gate.mjs G0 --lane xtdb --exp EXP-X02-R2 --previous G0-xtdb-20261108T214444Z-145b50 --note 'Fix FOR ALL VALID_TIME regression; restore skip title; execute unchanged package scripts with owned-store shim'
```

The retained `round2/bin/pnpm` shim keeps G0's original build/typecheck/test sequence and expected-skip contract. Pinned pnpm 10.11.0 rejects `--store-dir` for `exec` and recursive `run`, so the shim executes the unchanged declared build/typecheck scripts sequentially in package order and the installed package Vitest directly. Its only actual pnpm invocation is `pnpm --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store --version`. No install, lockfile update, global cache or pnpm configuration change occurred. The shim is retained and checksum-bound in `round2/manifest.json`; the G0 receipt records the wrapper command names and raw output. This is a disclosed local execution adaptation, not a claim of an unmodified pnpm invocation.

Reproductions:

```sh
node lab/bin/heavy.mjs --label CX-X02-R2-reviewer-offline-retry -- node --import tsx lab/experiments/EXP-X02-xtql-parity/round2/offline-source.ts lab/experiments/EXP-X02-xtql-parity/round2/offline-source.json
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-X02-R2-light-source -- node --import tsx lab/experiments/EXP-X02-xtql-parity/round2/probe-source.ts lab/experiments/EXP-X02-xtql-parity/round2/source-hazards.json
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-X02-R2-light-sums-retry -- node --import tsx lab/experiments/EXP-X02-xtql-parity/round2/probe-sums.ts lab/experiments/EXP-X02-xtql-parity/round2/source-sums.json
```

Use new output filenames for reruns (the reproduction tools refuse overwrites). Reproduction tools are adapted from the reviewer's exact `7392c0a` versions: relative paths/output containment move into this experiment; root-level core imports resolve the declared public `dist` export targets because the root has no package self-link; offline assertions expect recovered overflow and unset language; compiler probes catch and record the newly permitted typed refusal. Probe queries and arithmetic inputs remain the reviewer's originals. `manifest.json` binds all resulting source, scripts, outputs and G0 receipts.

## Retained failures

1. Two initial direct Vitest invocations used both `--root packages/...` and a root-prefixed config path; Vitest resolved a doubled path and failed before collecting tests. Corrected qualification invocation passed; G0 subsequently executed all relevant suites.
2. `G0-xtdb-20261108T214352Z-4be4d9` failed before build/typecheck/Vitest because the initial shim used CommonJS in this ESM repo. Retained receipt and raw output; repaired shim in a new attempt.
3. `G0-xtdb-20261108T214444Z-145b50` retained: pnpm rejected the owned-store flag on recursive run; the broad first token guard rejected `FOR ALL VALID_TIME` (one public-provider regression); renaming an integration test produced one unexpected skip. Fixed the guard to recognize comparison context, retained the established integration-test title/skip identity, and used unchanged package scripts directly in the shim. New G0 attempt passed.
4. First copied offline/live-sum scripts failed module resolution before executing probes; original root-level bare core imports lack a self-link here. Retained `offline-source.log` and `source-sums.log`; resolved the same public package export targets explicitly and used new log names. The first attempts created no semantic JSON outputs.
5. Gate source capture printed `error: could not write index` from optional `git stash create` under the sandbox. Receipts retain HEAD, full tracked patch/source hashes and built-output hashes, with `stashCommit` absent. This is not an immutable clean-commit gate. No source was changed during the passing G0 or live probes; final source hashes are retained. The final explicit git commit is separate from that optional capture.

## Limits and hand-back

No independent verification/promotion, full G1/G2 rerun, exclusive slot, dense-graph spill qualification, complete writer-interleaving suite, PostgreSQL/FoundationDB integration, root-wide check, package tarball check, deployment, merge or push was performed. The reviewer's exclusive G2/depth/dense-graph/writer backlog and Q58a basis contract remain open; this patch does not close them. Other SQL dialects' exact arithmetic was not live-qualified here. XTDB exact Datalog compute remains deliberately unavailable with typed refusal until a later qualified implementation replaces it. An independent reviewer should rerun the same gates on the committed source and assess default compatibility plus the disclosed execution shim.
