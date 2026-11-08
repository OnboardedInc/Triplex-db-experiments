# EXP-C8 round 3 delta verification

**Verdict: ACCEPT — safe to merge after the separate X02 review accepts its fixes.** No unresolved product-code finding in this C8 delta. Both round-3 gaps are closed; all earlier reviewer probes and the added variations pass on the exact merged target.

Reviewer: CX-VC8-3, independent adversarial reviewer. Target: `exp/C8-read-only-frontier` at `514c3b6d05eef11cad9d5208292c98ff793d3ef5`; implementation merge `b5a995a37343c1be6f36f4c2253c8b9bc58b3262`, parents `0527233c21c0073280c5eaf56bf6077e101c2cf2` and `6cd68dcad31039ceeaec943f0258e1c63a853d48`. Reviewer branch: `verify/C8`, starting at `029f9d3`.

North star: **P1 correctness floor**, trustworthy detection of mutations during pinned recursive reads. Goals and targets: main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`. Expected behavior: Q77c and Q81b from main-checkout `lab/acceptance/RULINGS-PENDING.md`, copied and hashed under `round3/inputs/`. Historical inherited devloop procedure was not used.

## Source binding and scope

All target execution uses an ignored Git archive under `round3/sut/`, with **845 tracked files verified against target Git blobs**, including all package source/tests, qualification fixtures, configuration and the lockfile. Installed-worktree and target lockfile SHA-256 both equal `7a02f735718ecdd29fdbfaf8ec2e2b05c92ad773cdc27d1920a278c5c7f4ba14`. Dependencies were reused, with no install or lock change. The original 15-test reviewer suite/config and light-live probe match their `74e5627` bytes; the 10-test round-2 delta matches `029f9d3` bytes. Their import depth is preserved in the target archive. `round3/source-manifest.json` records every file, hashes, tree identity, reviewer inputs and rule copies. `round3/source-audit.json` rechecks unchanged source and the merge facts below.

The builder's report was treated as a claim to check, not independent evidence. Product code, main-checkout files and previous review evidence were not edited. Generated files, where needed, come from running the target build inside the ignored archive.

## Findings

No new product-code finding reproduced in this delta. The previous **P2 F4-R2** (unknown HTTP operation counted clean) and **P2 F5-R2** (traffic following a parser exception counted clean after reset) are closed by the source and reproductions below. The missing-build first attempt is a reviewer snapshot preparation issue; its failure is retained and is not attributed to C8.

## Round-3 repairs: implementation and new variations

All source line references in this report are at **514c3b6**.

**F4-R2 / unknown HTTP requests: PASS.** `packages/qualification/src/engine-write-counter.ts:480-495` requires a query, update, command or allowlisted health operation, flags unknown parameter names, and conservatively counts multipart/unsupported bodies. The request handler applies the classification before forwarding at lines 524-535. Unknown requests now increment `writes` (and QLever `commits`); they no longer become clean commands merely because parameters exist. Existing known read/session operations remain clean.

`round3/variations.test.ts` exercises **61 forwarded unknown requests**, all counted as writes: GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE, TRACE and PROPFIND; root/unknown paths and health paths with unknown parameters; standalone access-token, timeout, send, action and query-planning-budget metadata; a query with an unknown option; duplicate known/unknown command fields; malformed percent escapes; malformed JSON/form/multipart bodies and opaque text bodies across GET/POST/OPTIONS. Eight clean controls cover health/ping, a GET query with metadata, SPARQL-query POST, form-query POST, stats and clear-cache. Three malformed HTTP framing cases (invalid Content-Length, conflicting Content-Length/Transfer-Encoding, invalid method spacing) receive 400 before any upstream forwarding. These local fake-server observations establish classification/refusal, not that a real QLever accepts any malformed operation or commits a mutation.

**F5-R2 / pgwire exception across resets: PASS.** The proxy's per-connection `broken` latch at `packages/qualification/src/engine-write-counter.ts:352-365` calls `opaque()` on every later forwarded chunk. The latch belongs to the connection, while `reset()` only replaces tally state at line 66. Nonthrowing parser-stop behavior remains independently fail-closed at lines 239-242. Prepared statements and portals remain outside the tally at lines 226-227; Bind/Execute handling at lines 288-300 retains classification across resets.

The unchanged round-2 malformed-Parse probe now passes. New tests first execute a clean prepared read, then send a pipeline containing a valid read, an unterminated **Parse, Bind, Execute or Close** packet, and a trailing DELETE/Sync. The exception window records the first read plus an opaque write. Each of the four connections then survives six new reset windows with a prior read portal Execute, Sync alone, a one-byte fragment, DELETE, a COMMIT pipeline, and one opaque byte. Multi-byte windows are also split into two sends. All 24 post-exception windows record writes and unparsed traffic, with the fixture waiting for actual upstream byte receipt. Once opaque, a connection remains conservatively opaque even for a previously prepared read; exact statement/commit counts are deliberately not inferred from those bytes.

## X02 merge and C8 read-only preservation

**PASS for the requested merge spot checks; independent full X02 review remains separate.**

- `packages/xtdb/src/native/ReadOnlySql.ts:104-123` retains the comment-aware token guard. Its entire file is byte-identical to X02 fix `6cd68dc`. New probes reject commented/bare ANY/SOME/ALL array operands after a comparison and preserve SELECT ALL, UNION ALL and a commented ANY subquery. The package's public-provider guard tests also run in the offline XTDB suite.
- `packages/core/src/datalog/compiler.ts:561-571` retains typed exact-computation refusal before DECIMAL arithmetic/rounding. This entire compiler file is byte-identical to `6cd68dc`. `packages/xtdb/src/query/compiler.ts:22-28` sets `rejectExactCompute: true`. For each of `+ - * / %`, the new public-executor probe observes `Fail(DatalogValidationError)`, no Die, recovery with catchTag, and only type-domain SELECTs, with no DECIMAL/BIGINT answer computation executed. This verifies refusal, not a precision-safe live implementation.
- C8's core frontier, XTDB native reachability/rule recursion, QLever rule recursion/basis relations and both read-only client facades are byte-identical to previously reviewed `0527233` (`source-audit.json` lists the seven paths). The merge does not restore their scratch-write helpers.
- The shared edit in `packages/qualification/src/native/xtdb-workloads.ts:250-305` keeps unset point reads in XTQL and other unset calls in SQL, using seeded `selectWithReachability` / `selectSqlWithReachability` closures. The mark-join guard remains at lines 306-330. Offline qualification tests exercise all 71 cases in explicit XTQL, explicit SQL and unset modes; C8 closure wiring still requires a single read-only seeded call per closure task and retains typed mark-join refusal. Long cyclic WL20 support probes return three at the pinned cut in XTQL, SQL and QLever.

The prior `READ-PATHS.md` limitation remains: storage and operation-resolution read implementations retain writable client capabilities, though the exercised methods issue queries only. This review accepts the repaired C8 counter/closure delta; it does not upgrade that inventory to a universal capability sandbox.

## Every earlier reviewer probe, rerun unchanged

All **25 passed**, zero failures. Full assertion results: `round3/probe-results.json`; raw output: `round3/probes.log`; independently counted log totals: `round3/probe-summary.json`.

| Prior suite | Probe title | Result |
| --- | --- | --- |
| adversarial.test.ts | exhausts every directed 3-node graph including loops, cycles, diamonds, disconnected seeds | PASS |
| adversarial.test.ts | high fanout, duplicates and exact limits / one past visited, edges, roundRows, pairs, rounds | PASS |
| adversarial.test.ts | BUG: refuses a cycle that adds a reached seed beyond maxRounds | PASS |
| adversarial.test.ts | BUG: ruleClosure honors explicitly supplied maxRounds | PASS |
| adversarial.test.ts | BUG: ruleClosure honors explicitly supplied maxVisited | PASS |
| adversarial.test.ts | BUG: path counts on a 12000-node DAG within default frontier budgets do not overflow the JS stack | PASS |
| adversarial.test.ts | all storage read methods on both lanes send query only, although constructors retain writable clients | PASS |
| adversarial.test.ts | submit/update guards refuse without delegation, nested facade retains overlay identity | PASS |
| adversarial.test.ts | staged XTDB rows reach main, count and rule selection queries through the same client identity | PASS |
| adversarial.test.ts | QLever attribute-tail refusal is typed | PASS |
| adversarial.test.ts | XTDB public attribute-tail refusal is a typed ReadError with no partial answer | PASS |
| adversarial.test.ts | both lane evaluators preserve maxDepth and tail constraints on controlled direct-read relations | PASS |
| adversarial.test.ts | BUG: pgwire execute of an existing prepared write after reset cannot silently count zero | PASS |
| adversarial.test.ts | classifies required SQL adversaries as writes | PASS |
| adversarial.test.ts | QLever GET/form LOAD and CLEAR updates count; unknown multipart must count or fail | PASS |
| delta.test.ts | F1: three-node terminal cycle refuses at two rounds and succeeds at three; empty confirmation stays legal | PASS |
| delta.test.ts | F2: rule cycle enforces round and distinct-endpoint budgets including duplicate base rows | PASS |
| delta.test.ts | F3: 24000-edge DAG and deep cyclic graph count exactly without recursive stack use; pathSteps edge is typed | PASS |
| delta.test.ts | F4: unknown request forms must count or refuse, while health and query controls stay clean | PASS |
| delta.test.ts | F5: prepared reads, writes, commits, rebindings and Close remain classified across six resets | PASS |
| delta.test.ts | F5 variation: bytes forwarded after a parser exception cannot become zero-write traffic after reset | PASS |
| delta.test.ts | Q76b: initialization never submits tx_query_relations schema | PASS |
| delta.test.ts | Q76d: xtql workload counts three long cyclic supports at the requested cut | PASS |
| delta.test.ts | Q76d: xtdb-sql workload counts three long cyclic supports at the requested cut | PASS |
| delta.test.ts | Q76d: qlever workload counts three long cyclic supports at the requested cut | PASS |

Nine additional variation tests passed, for **34 reviewer tests total**. The earlier light live probes and offline suites are listed below.

## Fresh execution

All source fingerprinting, suites, builds and engine checks used main-checkout `lab/bin/heavy.mjs`; queue waits remain in driver logs. Host disk free was about 29 GiB before admission and 28 GiB on a later check, above the 5 GiB minimum. Node v22.23.2; existing dependencies were reused. No pnpm command, Docker command, engine lifecycle operation or exclusive slot was used.

| Run | Passed | Skipped | Evidence under `round3/` |
| --- | ---: | ---: | --- |
| Core offline | 849 | 0 | `offline-core.log` |
| XTDB offline | 38 | 84 | `offline-xtdb.log` |
| QLever offline | 27 | 21 | `offline-qlever.log` |
| Qualification offline, after building the pinned XTDB public artifact | 92 | 50 | `offline-qualification-retry.log`, `build-qualification-runs.json` |
| Qualification Node tests | 18 | 0 | `offline-node.log` |
| Original reviewer suite | 15 | 0 | `probes.log`, `probe-results.json` |
| Unchanged round-2 delta | 10 | 0 | same |
| New variations / merge spot checks | 9 | 0 | same, `probe-summary.json` |
| Light live QLever cycle/diamond | 1 | 0 | `light-live.log`; 3 + 5 statements, zero writes/commits/unparsed |
| Live QLever counter + write positive control and cleanup | 1 | 63 filtered/skipped | `counter-live.log` |
| Reduced C8 live QLever boundary | 1 | 1 (XTDB) | `c8-live.log`, `live-runs.json`; 29 statements per read window, zero writes/commits/unparsed |
| Source snapshot and merge checks | PASS | n/a | `source-manifest.json`, `source-audit.json` |

Final offline package/Node total: **1,024 passed / 155 skipped / zero failures**. Reviewer probes: **34 passed / zero failures**. Live functional checks: **three passed**. The earlier missing-build failure remains in its original receipt below; it is not silently discarded or included as a passing attempt.

**First failure preserved.** The initial qualification suite reports 91 passed / 1 failed / 50 skipped because this fresh source-only snapshot did not contain `packages/xtdb/dist/index.js`. X02's new unset-language test deliberately loads that built public export; the failure is `Cannot find module`, before any engine or product assertion. The original `offline-qualification.log`, `offline-runs.json` and driver log retain this attempt. The retry runs the target's standard XTDB `tsdown` configuration (JavaScript build only, not declaration/type acceptance), then reruns the entire qualification suite with unchanged product/test source. `build-xtdb.log` and `build-qualification-runs.json` retain the exact build and retry commands. No source, test expectation, dependency or public export was patched to make the test pass. Raw tool/runner logs preserve original trailing spaces and blank lines, so the staged whitespace check reports those evidence bytes; the check excluding raw `.log` files passes. The first sandboxed Git staging dry-run also needed the authorized Git-metadata escalation; it did not change source or constitute a test result.

## Reproduction

Run from this reviewer worktree, preserving existing logs by choosing a new output directory/attempt name on subsequent runs:

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-3-prepare -- node lab/verify/C8/round3/prepare.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-3-probes -- node lab/verify/C8/round3/run.mjs probes
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-3-offline -- node lab/verify/C8/round3/run.mjs offline
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-3-build-qualification -- node lab/verify/C8/round3/run.mjs build-qualification
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-3-live -- node lab/verify/C8/round3/run.mjs live
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-3-source-audit -- node lab/verify/C8/round3/audit-source.mjs
```

The runners retain exact commands, cwd, environment overrides, timestamps and exits in the `*-runs.json` receipts. `prepare.mjs` refuses mismatched target bytes; it never silently swaps a different source revision into an existing snapshot. To isolate a variation, run Vitest from `round3/sut/` with `--config lab/verify/C8/vitest.config.ts lab/verify/C8/variations.test.ts -t <title>`, still through heavy admission.

## Limits and open questions

No fresh XTDB resident integration/transaction-overlay execution, full G1/G2, quiet exclusive-slot gate, root build/docs/pack check, PostgreSQL/FoundationDB integration, performance-load qualification or sustained-writer-progress acceptance was performed. P1/P2 latency bars and Q76f remain open separately. Historical receipt rehashes in the previous report remain historical; they do not become fresh qualification of this target. The original source inventory is not a new whole-program audit.

The reduced C8 QLever integration used one reader and 2,000 ms writer windows. It took 139.8 seconds and completed one recursive-read iteration. Both the initial and loaded read windows each recorded 29 statements and zero writes/commits/unparsed traffic. It observed one writer commit in each writer window (about 5.4 s alone and 4.3 s loaded), which establishes no sustained-progress or latency bar. The inline cycle/diamond probe recorded 3 + 5 statements with zero writes/commits/unparsed traffic. The standalone write-counter probe and C8 positive control passed their write assertions and cleanup; the C8 test retains its uniquely scoped fixture/writer facts under its existing test contract. No unknown or forensic state was deleted.

No product source fix, main-checkout edit, shared resident lifecycle operation, cleanup of unknown backend state, merge, push, release or deployment was performed. Verification tools, evidence and this report are committed only under `lab/verify/C8/` on `verify/C8`.
