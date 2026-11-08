# EXP-X02 delta verification — CX-VX02-2

**Verdict: FIX-FIRST.** Independently reviewed `6cd68dcad31039ceeaec943f0258e1c63a853d48` against `bf1ad4d`. The original array-comparison bypasses, overflow defect, exact-compute rounding path and unset-language routing are repaired. One **P2 regression in F1's replacement guard** remains: it rejects supported, previously admitted parenthesized subqueries. Six real-engine controls confirm this; no timeout determines the verdict. No product code was changed.

**North star:** correctness floor for P1 exact-cut reads and P4 current reads. Goals come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; expected repairs are the dispatch's Q79a–d in `lab/acceptance/RULINGS-PENDING.md` and Q39a in `RULINGS.md`. Q79 remains in the pending file; this dispatch explicitly supplies it as the review expectation. This is a delta review, not ten-goal acceptance or a performance qualification.

## Remaining finding

### F1-R2 — P2: supported parenthesized subqueries are newly refused

**Location at `6cd68dc`: `packages/xtdb/src/native/ReadOnlySql.ts:100–105`, specifically line 102.**

The token-aware guard requires the token immediately after the first `(` to be `SELECT`, `VALUES`, `WITH` or `FROM`. A valid extra query-parenthesis layer therefore looks like a forbidden array operand:

```sql
SELECT 'x' AS v WHERE 1 = ANY/**/((SELECT 1))
```

Expected and directly observed from XTDB 2.2.0: `[{"v":"x"}]`. The target's actual public `selectSql` provider instead yields `Fail(ReadError(... Native SQL rejects ANY/SOME/ALL over a non-subquery operand ...))`, without an answer. The old guard from `bf1ad4d` admits this exact statement. `SOME` and `ALL`, each with both `/**/` and ` /* subquery */ `, reproduce the same regression: **6/6 confirmed**. This is a query-availability regression under Q79a's requirement to retain supported subqueries, not a silent wrong answer. The un-commented `ANY ((SELECT 1))` is also false-refused, but that particular spelling was already refused by the old guard; it is not counted as newly regressed.

**Reproduction:** from the detached target described below, choose a fresh output filename:

```sh
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-VX02-2-subqueries-new -- node --import tsx ../subquery-regression.ts "$PWD/../subquery-regression-new.json"
```

`round2/subquery-regression.ts` compares the byte-retained `bf1ad4d` guard (`baseline-ReadOnlySql.ts`) with the target guard, invokes the target public provider, and executes the same safe query directly against the engine. `subquery-regression.json` retains all six SQL statements, old/new acceptance, complete Effect failures and raw rows. `subquery-regression-r2.log` retains their actual run output.

**Proposed fix:** recognize balanced leading query-parenthesis layers on the existing lexical token stream before classifying the operand, while continuing to scan the entire token stream for nested unsafe quantified comparisons. Keep nested arrays refused. Add public-provider regressions for these six safe forms, plus the existing nested unsafe controls. No AST rewriter or engine change is needed to demonstrate the required distinction. An alternative narrowing of the authored-native surface needs an explicit ruling; this review does not assume one.

## Disposition of F1–F4 and added variations

| Finding | Implementing code at reviewed commit | Independent result |
| --- | --- | --- |
| F1 / Q79a | `ReadOnlySql.ts:8–85` retains comment/literal-aware tokens; `:92–106` classifies quantified comparisons | Original four unsafe forms now fail typed. Eleven new unsafe array/nested forms fail typed; supported canonical nested comparisons, comment-bearing subqueries and ALL modifiers work. **Incomplete:** F1-R2 above loses safe query-parenthesis forms. |
| F2 / Q79b | `packages/qualification/src/native/xtdb-workloads.ts:454–460` wraps `checkedInt64(physical - reserved)` in `Effect.try`; helper remains `xtdb-native-errors.ts:35–43` | Original overflow recovers with `catchTag` in both languages. Ten offline boundary/direction controls pass. Expanded live batch passes **30/30**, including additional inventory-underflow, per-ledger-overflow and positive/negative net-revenue-overflow sites. Every live overflow control also executes a second evaluation that recovers through `catchTag`; no Die. |
| F3 / Q79c, Q39a | `packages/core/src/datalog/compiler.ts:561–571` refuses exact compute for rejecting dialects; `:580–585` removes the prior DECIMAL→BIGINT carrier; `packages/xtdb/src/query/compiler.ts:20–28` enables refusal | Original `+` and `*` compiler probes now throw `DatalogValidationError`. Independent matrix covers **all five operators**, constants/stored bindings, downstream `>=`, SUM, chained compute and wrappers. Public executor discovers integer domains and yields recoverable typed failures. Values at/beyond `2^63` are hard-refused; details below. Native exact sums remain exact. |
| F4 / Q79d | `packages/qualification/src/index.ts:205–224` preserves absent language; `native/xtdb-workloads.ts:196`, `:244–253`, `:552–565` restore mixed default and SQL recursion | **213/213** mock-provider task executions pass: all 71 tasks through direct omission, explicit `undefined`, and loader-returned built-library evaluator. XTQL `state-at`, SQL other queries, SQL scratch-table recursion. Both query-path and language absent still select `xtdb-datalog`. This establishes routing compatibility, not a fresh full live mixed-library packet. |

F3 is deliberately repaired by **typed unavailability of exact Datalog compute**, including small integer computations. It is not a newly qualified exact arithmetic implementation. Number arithmetic remains available. The raw engine-only DECIMAL→BIGINT control still rounds `1000000000000000004` to `1000000000000000000`; DECIMAL→TEXT and TEXT→BIGINT preserve it. Arbitrary user-authored SQL arithmetic is not made precision-safe by this patch.

## Every earlier probe rerun

Tools are independently adapted from the existing verifier's `7392c0a` versions, not accepted from the builder's outputs. Adaptations bind imports to the detached target, resolve core via its declared built export targets, require output containment under this review, update F2/F4 expectations, and catch the now-allowed F3 compile refusal. Original query/arithmetic inputs remain unchanged. See `round2/offline-source.ts`, `probe-source.ts`, `probe-sums.ts` and their fresh `.json`/`.log` outputs.

### Earlier offline controls (`offline-source.json`)

| Probe | Fresh result |
| --- | --- |
| Inventory MAX minus negative one, XTQL | `catchTag` recovers `handled`; no defect |
| Same, SQL | `catchTag` recovers `handled`; no defect |
| Reachability edge count 100,000 | Accepted source-only control; answer call reached |
| Reachability edge count 100,001 | Typed `NativeEngineHazardError`; answer call not reached |
| Default depth exhaustion | Typed `NativeRecursionDepthError`; 9 calls (count + eight completeness checks); no answer call |
| Native language absent | `nativeLanguage === undefined`, historical mixed routing |
| Source/build consistency | **13/13** retained source-map embeddings equal the target sources |

The reachability controls use canned provider rows; they prove error/control flow, not real-engine depth or dense-graph semantics.

### Earlier SQL/compiler controls (`source-hazards.json`)

| Probe | Fresh result |
| --- | --- |
| `any-control` | Envelope refuses; public provider `Fail(ReadError)` |
| `any-comment` | Envelope refuses; public provider `Fail(ReadError)` |
| `any-bare` | Envelope refuses; public provider `Fail(ReadError)` |
| `some-comment` | Envelope refuses; public provider `Fail(ReadError)` |
| `decimal-bigint` | Raw engine still returns `1000000000000000000` (known hazard control) |
| `decimal-text` | Raw engine returns exact `1000000000000000004` |
| `text-bigint` | Raw engine returns exact `1000000000000000004` |
| `compiler-+` | `DatalogValidationError`, no arithmetic SQL executed |
| `compiler-*` | `DatalogValidationError`, no arithmetic SQL executed |

Each of the four envelope controls and its public-provider execution is separately retained: 13 records total.

### Earlier real-builder sum controls (`source-sums.json`)

Every row below ran through the actual source builders and native providers over virtual facts, once in **each language**: **20/20 pass**.

| Input/control | XTQL | SQL |
| --- | --- | --- |
| `near1e18`: `1000000000000000004` | Exact | Exact |
| `max`: `9223372036854775807` | Exact | Exact |
| `min`: `-9223372036854775808` | Exact | Exact |
| `maxPlus1` | Typed Fail, no Die | Typed Fail, no Die |
| `minMinus1` | Typed Fail, no Die | Typed Fail, no Die |
| `three2p62` | Typed Fail, no Die | Typed Fail, no Die |
| `cancellation`: MAX, MAX, −MAX, −MAX, 5 | `5` | `5` |
| `carryCounterexample` | `9223372032559808513` | `9223372032559808513` |
| `availableOverflow`: physical MAX, reserved −1 | Typed Fail, no Die | Typed Fail, no Die |
| `netCancelsOverflowingSides` | `5` | `5` |

These diagnostics do not certify persisted input loading, SDK fixture ingestion or packet parity at scale.

## Additional regression evidence

**`delta-offline.json`: all checks passed.** Ten inventory controls span positive overflow, negative overflow, opposite extrema, exact MAX and exact MIN in both languages. The exact-compute matrix contains **120 checks**: 105 compiler/executor checks over valid `1e18+4`, MAX and MIN operands (five operators × six compile variants plus typed executor recovery), and 15 constructor refusals for `2^63`, `2^63+1` and `−2^63−1` (each across the five planned operators). Constructor refusals are synchronous `RangeError`, not claimed to be Effect failures; in-range MAX+1/MIN−1 computations are refused through the compiler/executor path. No out-of-range input is silently coerced. The default-routing matrix contains 213 task executions plus the ordinary default-path check; canned responses drive multi-call branches.

**`delta-live.json`: 22 exploratory controls.** Nine array comparisons cover ANY/SOME/ALL with block comments, tabs/newlines and CRLF line comments; two more put unsafe quantified comparisons inside nested query/Boolean contexts. All eleven are blocked typed by the envelope. Seven supported statement controls return their expected rows: nested safe quantified comparisons, comment-bearing SELECT subquery, WITH subquery, SELECT ALL, UNION ALL, aggregate ALL and quoted keyword text. One quoted-identifier control checks the envelope only. Two deliberately parenthesized quantifier-operand attempts (`k = (ANY...)`, `k = ((SOME...))`) are engine syntax errors; both fail typed with no answer, and are **not product findings**. Their original stricter guard-error expectation remains recorded as `pass:false`. The remaining `ANY ((SELECT 1))` control proves a safe query is false-refused. Thus the raw 19/22 expectation-match count must not be described as three correctness defects.

**`subquery-regression.json`: six confirmed F1-R2 regressions**, with baseline acceptance, new public refusal and correct raw-engine answers for every case. This follow-up separates the newly lost comment-bearing forms from the pre-existing plain-parenthesis limitation.

**`delta-sums.json`: 30/30 pass.** This repeats all 20 original language controls and adds ten executions: `availableUnderflow`, `ledgerOverflow-physical`, `ledgerOverflow-reservation`, `netOverflow-positive`, `netOverflow-negative`, each in both languages. All **18 overflow executions** in this expanded batch also recover from a second real-engine evaluation using `catchTag('NativeIntegerOverflowError', ...)`. Every client closes in `finally`; wrapper exit zero is recorded separately from semantic results.

## Fresh G0, source binding and operations

Created a detached worktree at `lab/verify/X02/round2/target`, exactly `6cd68dc`, with no tracked source edits. Reused existing installed dependency links; no install, lockfile or pnpm configuration change occurred. Package-local workspace links point to this detached target's packages, and package builds ran there, avoiding shared builder outputs. The target remains retained and gitignored by `round2/.gitignore`; its source is reconstructible from the reviewed Git commit. Generated build files were created only by the declared build scripts.

**Fresh G0 PASS:** `G0-xtdb-20261108T215157Z-138fc7`, **949 executed / 949 pass / 0 fail / 130 expected skips / 0 unexpected skips**. The receipt records clean source (`dirty:false`, exact HEAD/tree, empty tracked patch), Node `v22.23.2`, pnpm `10.11.0`, lockfile, source/build hashes and raw outputs. No optional stash snapshot is claimed. `round2/G0-receipt.json`, `G0-raw/` and `G0.log` retain the receipt and all raw step outputs; target-local content-addressed preimages remain retained in `target/runs/objects/`.

G0 used the builder's **unchanged, committed owned-store pnpm shim**, invoked through `heavy.mjs`; the gate also admits its expensive substeps. It executes the unchanged declared build/typecheck scripts in package order and installed Vitest directly because pinned pnpm rejects the store flag on these run/exec forms. Its actual pnpm version invocation supplies the required store. This is the disclosed execution adaptation already reviewed in the builder notes, not an unmodified pnpm/root-check claim:

```sh
# cwd: lab/verify/X02/round2/target
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-VX02-2-G0 -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-VX02-2 --note 'Independent committed 6cd68dc delta rerun; unchanged builder pnpm owned-store shim'
```

All earlier and added probes ran through `node lab/bin/heavy.mjs --label <id> -- node --import tsx ../<probe>.ts "$PWD/../<fresh-output>.json"` from that same target directory. Live commands explicitly set the private Docker host, contact only shared XTDB `127.0.0.1:5470`, use one client connection per process and 15-second query timeouts. They perform no fixture writes, migrations or engine lifecycle operations. No unrelated service, excluded port or main-checkout source was touched. Heavy admission caused waits; it was not bypassed. Disk observations were above the 5 GiB host-free floor.

The first follow-up launch used the target working directory while trying to create tools at an outer-worktree-relative path. It failed module resolution before any query; `subquery-regression.log` retains exit-1 output. Tools were then created in the correct verifier directory and a separately labelled attempt (`subqueries-r2`, new log) completed. The earlier delta-live expectation mismatches are retained and interpreted above; none was erased or counted as a pass. `exec-outcomes.json` records all wrapper exits, including this tool failure. All final semantic JSON outputs completed; there are no newly unresolved writes or partial fixtures from this round.

`round2/manifest.json` indexes the tools, receipts and outputs plus target source/build hashes and the shim hash. `round2/summary.json` preserves counts and raw expectation mismatches. `collect-round2.py` is the retained evidence-indexing tool. The target package/lockfile diff against `6cd68dc` is empty.

## Still required on an exclusive slot

This review does **not** close the prior qualification backlog. Final `engine-status-final.txt` observes 9.25 GiB of the 11 GiB pool reserved by the XTDB, QLever and Datomic residents; only 1.75 GiB is available, insufficient for a 3.5 GiB exclusive slot. No slot was acquired, resident parked or engine restarted. Only the orchestrator may park Datomic. After the guard repair, preserve the earlier first failures and perform these source-bound independent reruns:

1. Obtain an XTDB exclusive reservation with the verifier's own holder through `engine.mjs`, once admission permits it; check host disk again and retain cleanup/release evidence.
2. Run strict pure-XTQL candidate G2, all **142 executions**, and the matched SQL packet against independent expectations. Establish at least **40 logical tasks covering every builder in both languages at the same fixture receipt position**. Shared virtual-relation diagnostics and historical partial packets do not satisfy this.
3. Complete real-engine **default D=8** recursion controls: eight-edge success and nine-edge typed depth refusal without a truncated answer, across applicable membership/resource, container, recall, dependency/vulnerability and support closures. This round's canned depth check is not that evidence.
4. Complete the **5,050-edge / 125,000 length-three-walk** dense graph control, with 150 reachable nodes, plus NULL-bearing 09/12/13/18/reachability controls and relevant plans. The edge-count guard alone does not prove the optimizer's build-side bound.
5. Complete the prior **seven incomplete writer controls**: SQL workflow; lineage in both languages; support count in both languages; XTQL price; XTQL closure. Verify original pinned and fresh post-write answers. A claim about interleaving within SQL scratch recursion needs a hook inside its rounds, not merely a write after one API call. Check Fail versus Die and recovery.

Q58a's broader basis/token contract remains separate and unimplemented in this reviewed target. No fresh G1, full G2, full writer suite, PostgreSQL/FoundationDB integration, root-wide check, pack check or performance/GS qualification was performed. Other SQL dialects' exact-compute execution was not live-tested. This review did not repair product code, acquire an exclusive slot, spawn agents, merge, push, deploy or publish. The sole blocking delta finding is F1-R2; fixing it and passing shared probes would still leave the exclusive qualification work above.
