# EXP-X02 adversarial verification — CX-VX02

**Verdict: FIX-FIRST.** Reviewed target `exp/X02-xtql-parity` at `bf1ad4d`, continuing `verify/X02` WIP `636839e` without discarding it. The switch is implemented and the retained answers show substantial parity, but two new error/guard defects are independently reproduced below. The explicitly requested Q39a compiler audit also reproduces silent rounding on the public Datalog path. Timeouts do **not** determine this verdict. No implementation under review was changed.

**North star:** correctness floor for P1 exact-cut reads and P4 current reads; language parity under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md` §4.1. The current lab protocol and this dispatch supersede the older brief's model, commit-trailer and exclusive-slot restrictions. No other agents were spawned. This review claims no performance target, production readiness or completion of the ten goals.

## Findings

### F1 — P1: the new quantified-comparison guard admits wrong-answer queries

**Location:** `packages/xtdb/src/native/ReadOnlySql.ts:83-85`.

The look-ahead checks raw characters after `ANY`/`SOME`/`ALL`, rather than SQL tokens. A block comment before `(`, or a bare array operand, bypasses the guard. Through the actual source-built public `selectSql` provider on XTDB 2.2.0:

```sql
SELECT 'x' AS v FROM (VALUES (1)) t (k)
WHERE k = ANY/**/(ARRAY[1,2]) AND 1 = 1
```

Expected `[{v:'x'}]`; observed `rows: []` with no error. `ANY ARRAY[1,2]` and `SOME/**/(ARRAY[1,2])` also return empty answers. The ordinary `ANY(ARRAY[1,2])` control is correctly refused. No packet builder currently uses these forms, so this is an authored-native API protection defect, not an observed packet mismatch.

**Reproduction:** `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-VX02-any-repro -- node --import tsx lab/verify/X02/probe-source.ts lab/verify/X02/source-hazards-new.json` (choose a fresh output name).

**Fix:** apply the check to the same comment-aware token stream used by the envelope; recognize the quantified comparison operand, including its bare-expression form, while preserving `UNION ALL`/`SELECT ALL` and supported subqueries. Add public-provider regressions for the three reproductions. Evidence: `source-hazards-r2.json`, probes `any-comment`, `any-bare`, `some-comment`.

### F2 — P1: inventory overflow escapes as an Effect defect

**Location:** `packages/qualification/src/native/xtdb-workloads.ts:456`; throwing helper `packages/qualification/src/native/xtdb-native-errors.ts:35-42`.

For physical total `9223372036854775807` and reservation total `-1`, both ledger totals fit int64; availability is `9223372036854775808`. The synchronous `checkedInt64` call throws inside `Effect.gen`. Both language paths produce **`Cause([Die(NativeIntegerOverflowError ...)])`**, rather than a typed `Fail`. A normal `Effect.catchTag('NativeIntegerOverflowError', ...)` cannot recover it. The older live verifier's error-name substring check would accept this defect as a typed refusal.

**Reproduction:** `node --import tsx lab/verify/X02/offline-source.ts lab/verify/X02/offline-source-new.json`; live engine reproduction: `node lab/bin/heavy.mjs --label CX-VX02-sum-repro -- node --import tsx lab/verify/X02/probe-sums.ts lab/verify/X02/source-sums-new.json` with the private `DOCKER_HOST` above.

**Fix:** lift the checked subtraction into the Effect error channel, or make the checked helper return an Effect and yield it. Assert `Fail` versus `Die` and recovery with `catchTag`, for both languages. Evidence: `offline-source.json` → `inventory`; `source-sums.json` → both `availableOverflow` controls. This is newly introduced by X02; it is sufficient to block promotion independently of the older compiler issue.

### F3 — P1, pre-existing and already tracked by Q39a: exact Datalog arithmetic rounds silently

**Location:** `packages/core/src/datalog/compiler.ts:572`, reached unchanged by `packages/xtdb/src/query/compiler.ts:143-166`.

Both `1000000000000000004 + integer(0)` and `× integer(1)` compile through DECIMAL → BIGINT and return **`1000000000000000000`**, with no error. Fresh `compileXtdb` output was executed against a one-row virtual relation with the original generated conditions and bindings retained; the only replacement was the physical assertion source. The expected answer is the original exact integer. Control casts show DECIMAL → TEXT and TEXT → BIGINT preserve `1000000000000000004`; DECIMAL → BIGINT loses four.

**Reproduction:** the F1 command; inspect `compiler-+`, `compiler-*`, `decimal-bigint`, `decimal-text` and `text-bigint` in `source-hazards-r2.json`. This is an actual engine execution of adapter-generated SQL, not a BigInt simulation; it is not a persisted-fixture SDK end-to-end test.

**Fix:** preserve the exact decimal result as text through range checking/decoding, or refuse that arithmetic with a typed error until exact lowering exists. Avoid the lossy cast for all five exact compute operators and downstream computations/predicates/aggregates that consume them. The native sum builders audited here use integer halves and text result carriers, so this defect does **not** falsify their observed exact results. Direct integer min/max and DECIMAL aggregate results read as text do not take this cast. This is the existing EXP-R02/Q39a debt, not a regression caused by X02; its disposition must remain explicit.

### F4 — P2: the native switch is default-on, contrary to the brief's unset-behaviour criterion

**Location:** `packages/qualification/src/index.ts:212`; `packages/qualification/src/native/xtdb-workloads.ts:202`.

With `TRIPLEX_QUERY_PATH=xtdb-native` and the language variable absent, the new loader selects `xtql`; main/merge-base used the existing mixed native library, with SQL scratch-table recursion. In particular the new default can refuse closure beyond depth 8, whereas the SQL alternative retains its separate 100-round budget. `offline-source.json` records the unset selection; the source diff against merge-base `baf4edf` and current main shows the change. With both the query-path and language variables absent, the existing default remains `xtdb-datalog`.

**Fix/disposition:** retain main's behaviour when the language switch is absent, or explicitly revise the brief's compatibility criterion and independently qualify the intended default change. Simply passing the unset unit tests does not prove unchanged native semantics. XTQL being the primary lane is consistent with the scope, but does not establish this separate compatibility assertion.

## Checks 1–7

| Brief check | Evidence and result |
| --- | --- |
| 1. Language purity and recording | Reviewed every builder pair and public envelope. The source tests exercise all 71 logical tasks in each language, including multi-call branches. Completed retained XTQL calls have bare `XTQL (...)` statements with XTQL `limit`, and completed SQL calls/substeps remain SQL. `evidence-summary.json` audits 245 retained verifier XTQL calls, 105 verifier SQL calls and 192 author SQL calls: no shape/cut violations. Failed calls without traces prove no purity claim. Runner reports record `nativeLanguage`; outer historical gate receipts retain language tallies plus the hashed raw report, rather than a separate top-level switch field. |
| 2. Independent expectations and parity | Re-read `expect.py`: stdlib model reads assertions, cuts and case parameters, never `expected_rows`, implementation builders or engine output. Recomputed all 71 logical answers; all 142 current/reopen expectations equal the packet. Retained verifier XTQL matches 119/142; verifier SQL matches 78/142, with 26 executions missing after ingestion failure. Their jointly matching sample is 73 executions / **39** distinct tasks / 12 builders. Including the retained author's 142/142 SQL run gives 119 matched executions / **62** distinct tasks across **all 20 builders**. The complete table is `sample-table.md`; the SQL execution in that larger sample was authored, not freshly executed by this reviewer, and the two reports use separately replayed scopes rather than one common physical snapshot. The requested independently executed 40-task, same-fixture two-language check is therefore not closed. No successful non-timeout answer disagrees with the independent expectation. |
| 3. Engine hazards | F1 reproduces the ANY bypass. Static `(p) IS TRUE` guards are present in 09, 12, 13, 18 and the SQL reachability round; edge sources exclude NULL endpoints. Source-only threshold probes accept count 100,000 and return typed `NativeEngineHazardError` at 100,001 without an answer call. This does not prove the optimizer's mark-join build-side bound on dense multi-hop relations. See the exclusive backlog below. The cast audit reproduces F3. |
| 4. Exact sums and typed errors | Fresh real-engine executions of the actual builders over virtual native facts: **18/20** controls pass. In both languages: exact near-1e18, int64 min/max, mixed cancellation, carry-normalization counterexample `9223372032559808513`, typed `Fail` above/below int64, three `2^62` overflow, and net revenue `5` even when each side alone exceeds int64. Both failures are F2's inventory `Die`. Virtual-source diagnostics isolate arithmetic; they do not certify the full persisted input loader. |
| 5. Cuts and basis | Source pins every later call to the first result's recorded position, preserving each operation's deliberate valid/knowledge coordinates. Retained writer checks for workflows and lineage pass in both languages; one support-count XTQL check passes, then the old run aborts on an unknown write outcome. Fresh writer results are recorded below. Today's native basis is `{scope, recordedPosition, validAt, recordedAt?}`. It reports neither Q58a's `{low, high}`/route nor session `after` tokens/typed availability errors. Q58a remains unimplemented in this target; a one-cut task is not evidence that the broader native-token contract is done. |
| 6. Switch unset | Fresh changed-package Vitest suite: **42 passed, 130 expected integration skips**, 0 failures; qualification Node suite: **18/18 passed**. See `unset-tests-r3.log` and `unset-node-tests.log`. Integration flags were explicitly absent. No fresh G0/G1, build, pack check or entire-root check was run; the old G0 931/931 and G1 88/88 are historical. F4 documents the native default change. |
| 7. Shared-resident load rerun | The prior independent shared XTQL rerun completed 142 tasks, with 119 correct and 23 timeouts; it meets the requested once-on-shared run, but is historical. SQL's independent shared run has 38 timeouts and 26 missing tasks; **10** of the XTQL timed-out executions also time out in that SQL run. Per-task lists and exact overlap are in `evidence-summary.json` and `comparison-independent.md`. SQL timeouts and missing tasks are different categories. Fresh rerun status is recorded below. No timeout alone drives FIX-FIRST. |

## Fresh execution status and retained failures

The fresh shared XTQL diagnostic was **aborted after failure**, with its original partial report retained: **28/142 executions recorded, 27 PASS and one timeout** (`04/claim29-corrected`, reopen). Workload 05 fails setup with `ReadError: XTDB read failed`; 06 fails with unknown write outcome, operation **`beecf834-e7c4-4fd6-acc9-fa5ab3ba52c2`**; 07 is still marked ingesting. No remaining execution is counted as run. The report's `RUNNING` label is not a terminal qualification claim. `shared-abort-request.json` records why only this review's heavy-wrapper PID was signalled; the wrapper observed child termination and exited **128**, releasing its heavy token. The ordinary sandbox denied the first signal attempt; the scoped retry was approved and succeeded. No engine was stopped, restarted, recreated or deleted. In-flight writes are not assumed rolled back, including workload 07; retain that fixture state.

The fresh writer attempt completed and closed its clients normally (process exit **0**), with **3/10 controls passing and 7 incomplete due to timeouts**; exit zero is not acceptance. Passed: XTQL workflow (3 API calls), SQL price (2 API calls), and SQL closure (1 API call). The first two exercise a write between task calls; SQL closure's write lands after its one public API call, so that control does not test a write between the helper's internal rounds. SQL workflow's pinned answer is correct but its fresh read times out. Both lineage and both support-count controls, XTQL price, and XTQL closure remain incomplete. No completed, non-timeout result is wrong. See `writer-report.json` for the full returned bases, traces, errors, writer positions and row sets. All fresh results here are diagnostics on the shared resident, not official G2 candidate receipts.

The first `probe-source` attempt had a verifier-only virtual-relation alias error in its compiler probes; the second attempt adds the required alias and reproduces F3. Both are retained (`source-hazards.json` and `source-hazards-r2.json`). Two pnpm test attempts fail before tests because pinned pnpm rejects `--store-dir` on `test`/`exec`; the successful rerun invokes the installed Vitest executable directly, without installing dependencies or changing pnpm settings. The first copied packet-runner attempt fails before execution because the verifier directory lacks qualification's package self-link; the next attempt resolves the existing declared public `dist/index.js` target explicitly. These are review-tool failures, not engine correctness failures.

`offline-source.json` checks 13 relevant source-map embeddings against their current TypeScript source and records source/dist hashes. This verifies those retained local exports without rebuilding or editing generated files; it is not a complete reproducible-build proof. `collect-evidence.py` asserts that `packet-runner.ts` differs from the original only in output-root containment, public-export resolution and its explanatory header. Historical receipts preserve their original Git identity and dirty-source status; the diagnostic 142/142 receipt at `baf4edf` is dirty and is not upgraded to a clean `bf1ad4d` candidate pass.

## Exactly what remains for an exclusive slot

Admission is blocked by ownership/caps, not physical RSS. Initially EXP-P4 held s2 and reservations were 10 GiB / 11 GiB; s1 requires another 3.5 GiB. During this review P4 released s2, retaining its volume, but CX-K01 acquired s1. The latest `engine-status-final.txt` observes its container running/healthy with that ownership still held; this reviewer has no permission to restart, recreate or take it. Recheck ownership/admission before proceeding. No slot was acquired or engine lifecycle changed by this reviewer.

After F1/F2 are fixed and F3/F4 explicitly dispositioned, the independent verifier still owes:

1. Acquire **s1 through `lab/bin/engine.mjs` under its own holder**, only after the current owner releases it and admission succeeds. Do not stop either dev resident or another holder's engine. Recheck host free disk ≥ 5 GiB.
2. On an immutable reviewed source/build, rerun strict pure-XTQL **candidate G2, all 142 executions**, with one pinned cut per task and preserved raw outcomes. Run the matched SQL packet against independent expectations, including at least 40 logical tasks across every builder in both languages at the same fixture receipt position; retain every timeout and first failure. A shared diagnostic is not a substitute for this clean exclusive candidate receipt.
3. Complete real-engine default-**D=8** depth controls: a 9-edge chain must produce typed `Fail(NativeRecursionDepthError)` and no truncated answer; an 8-edge chain must succeed. Cover membership/resource inheritance, container closure, recall, dependency closure/vulnerable deployments and support closure as applicable. The current source-only D=8 probe verifies control flow, not XTDB semantics. The old lowered-D=2 live refusal is useful partial evidence; D=4 and default-D=8 attempts timed out.
4. Complete the 5,050-edge / 125,000-length-3-walk dense graph test with 150 reachable nodes, below the edge-count guard but above the mark-join spill threshold in path multiplicity. Establish whether edge-count guarding actually bounds every planned build side; if not, require typed refusal or a safe query/engine workaround. The earlier fixture failed setup, so no semantic conclusion is available. Run NULL-bearing controls alongside 09/12/13/18/reachability and inspect plans/answers.
5. Rerun the **seven incomplete** writer controls: SQL workflow; lineage in both languages; support count in both languages; XTQL price; XTQL closure. Check both the original pinned answer and a fresh post-write answer. If claiming an interleaving inside the one-call SQL closure helper, add a hook inside its internal query/round sequence; the existing pass does not exercise that. Verify error **channels**, not just class names. Retain cleanup/connection/slot-release outcomes; do not delete uncertain historical fixture state.

The exclusive backlog remains a qualification gap even if every shared diagnostic eventually passes. Conversely, the demonstrated correctness defects already justify FIX-FIRST without treating a resource timeout as a semantic error.

## Evidence and hand-back

All newly authored tools, outputs and this report are under `lab/verify/X02/` on `verify/X02`. `evidence-manifest.json` binds the local evidence and the explicitly retained external files in `/Users/sam/Claude/Projects/triplex-db-2/V-X02/`; `evidence-summary.json` contains status denominators, source trace audits, timeout overlap and sum results. These links are local paths, not uploads.

No package implementation, oracle, acceptance contract, main-checkout source, shared engine lifecycle or existing WIP was changed. No merge, push, deployment or package publication was performed. The report's containing commit is the final review commit; its hash is supplied in the hand-back.
