# EXP-C8 delta adversarial verification, round 2

**Verdict: FIX-FIRST.** All 15 original reviewer tests now pass on `0527233`. F1–F3 pass new boundary variants, the original F4 multipart case is repaired, and the original F5 prepared-execution/reset case is repaired. Two adjacent Q77c failures remain: unclassified GET requests can be forwarded with zero writes, and bytes forwarded after a pgwire parser exception become invisible after tally resets. No mutating application read was demonstrated.

Reviewer: **CX-VC8-2**. Reviewed head: `0527233c21c0073280c5eaf56bf6077e101c2cf2` (`exp/C8-read-only-frontier`); delta commits `0ed655a`, `f049bbf`, `0527233` over `d9b2dc8`. Reviewer branch: `verify/C8`, starting at `74e5627`. Product files on that branch were not edited, checked out, merged, or fixed. Source under `round2/sut/` is an ignored, reproducible Git archive of the reviewed revision, with source aliases resolving into that snapshot. Existing installed dependencies are reused; the installed worktree lockfile exactly matches the reviewed lockfile. `round2/source-manifest.json` binds all 845 extracted tracked files to Git blob identities and SHA-256 hashes and confirms the three original reviewer input files match `74e5627` byte for byte.

North star: **P1**, exact pinned reads that never block writers. This is a recursion correctness and measurement-integrity recheck, not throughput, writer-progress, or production acceptance. Goals/targets come from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure comes from `lab/PROTOCOL.md`. Q76/Q77 rulings and those inputs are retained in `round2/inputs/`. Main-checkout files were read only.

## Remaining findings

### F4-R2 — P2: nonempty GET parameters bypass the final unknown-operation branch

**Location:** reviewed `packages/qualification/src/engine-write-counter.ts:478-484`, with unknown keys treated as commands at `:504`.

**Reproduction:** run the `F4: unknown request forms` regression in `round2/delta.test.ts:179`. A local fake HTTP upstream returns 200 after recording every forwarded request. Each of these requests is forwarded:

| Request | statements | writes | commits | commands | unparsed |
| --- | ---: | ---: | ---: | ---: | ---: |
| `GET /?unexpected-operation=change-data` | 0 | 0 | 0 | 1 | 0 |
| `GET /?action=unclassified` | 0 | 0 | 0 | 0 | 0 |
| `GET /?access-token=generic` | 0 | 0 | 0 | 0 | 0 |

`unknown` requires `params.size === 0`, so any parameter suppresses this guard even without a query, update, known command, or health operation. The POST JSON and multipart-query variations correctly count writes, and actual health/query controls remain clean. These are three manifestations of one missing final positive-classification requirement, not three separate findings.

**Impact:** Q77c requires every unknown forwarded operation to count as a write or be refused. That claim is still false. The fake-upstream test does not establish that QLever accepts these shapes as mutations; no such operation was sent to a resident.

**Proposed fix:** positively identify a supported query/update/allowlisted command/health/session operation before allowing a clean tally. Validate any standalone settings operation against an explicit supported set; merely having parameters, including protocol metadata, cannot establish a read/session classification. Otherwise count or refuse the entire request. Preserve the existing explicit health and cancellation controls.

### F5-R2 — P2: the proxy exception latch silently skips later traffic across resets

**Location:** reviewed `packages/qualification/src/engine-write-counter.ts:352-359`; forwarding continues at `:362`.

**Reproduction:** run `F5 variation: bytes forwarded after a parser exception` in `round2/delta.test.ts:279`. Send a valid-framed Parse packet whose payload is `unterminated`, causing `cstring` to throw. The initial window correctly records an opaque write. In each of three later windows, reset the tally, send a framed `Q("DELETE FROM t")` followed by Sync, and wait until the fake upstream has received all bytes. Every later window is exactly zero: statements, writes, commits, unparsed, commands, and connections. The new per-parser `stopped` branch charges later opaque traffic, but this exception path exits earlier through `if (broken) return`, so that protection never runs.

**Impact:** Q77c's fail-closed guarantee and the builder's claim that unknown traffic cannot become clean in a later window are still false. This is an instrumentation failure using a malformed packet and fake upstream, not evidence that XTDB executes later SQL after this protocol error. Ordinary prepared read/write/COMMIT sequences, retained portals, rebinding, and closing names all pass across resets.

**Proposed fix:** after any parser exception, either count every subsequently forwarded chunk as opaque in its current tally window, or terminate both sides and refuse further forwarding. The error state must outlive `reset()` without turning later bytes into clean traffic. Do not fix only `createPgwireFrontendParser`'s separate `stopped` state.

## Original reproducers, each rerun unchanged

`round2/original.log` and `round2/original-results.json`: **15 passed, zero failed**. The old `BUG:` titles are deliberately unchanged.

| Prior test | Result |
| --- | --- |
| exhausts every directed 3-node graph including loops, cycles, diamonds, disconnected seeds | PASS |
| high fanout, duplicates and exact limits / one past visited, edges, roundRows, pairs, rounds | PASS |
| BUG: refuses a cycle that adds a reached seed beyond maxRounds | PASS |
| BUG: ruleClosure honors explicitly supplied maxRounds | PASS |
| BUG: ruleClosure honors explicitly supplied maxVisited | PASS |
| BUG: path counts on a 12000-node DAG within default frontier budgets do not overflow the JS stack | PASS |
| all storage read methods on both lanes send query only, although constructors retain writable clients | PASS |
| submit/update guards refuse without delegation, nested facade retains overlay identity | PASS |
| staged XTDB rows reach main, count and rule selection queries through the same client identity | PASS |
| QLever attribute-tail refusal is typed | PASS |
| XTDB public attribute-tail refusal is a typed ReadError with no partial answer | PASS |
| both lane evaluators preserve maxDepth and tail constraints on controlled direct-read relations | PASS |
| BUG: pgwire execute of an existing prepared write after reset cannot silently count zero | PASS |
| classifies required SQL adversaries as writes | PASS |
| QLever GET/form LOAD and CLEAR updates count; unknown multipart must count or fail | PASS |

## Implementing code and new variations for F1–F5

All implementation locations below refer to `0527233`, not the review branch's older product files. New tests are in `round2/delta.test.ts`; their imports resolve after the runner copies the file into the snapshot's original reviewer-test directory.

| Finding | Implementing code at reviewed head | New variation and observed result |
| --- | --- | --- |
| F1 | `packages/core/src/native/FrontierClosure.ts:209-211` | Three-node terminal cycle refuses at maxRounds=2 and succeeds at 3; a two-edge chain still permits an empty third confirmation read. **PASS** (`delta.test.ts:37`). |
| F2 | `packages/core/src/native/FrontierClosure.ts:325-333` and `:397-399` | Cyclic predecessor graph with duplicate base pairs: maxRounds=1 refuses; maxRounds=2/maxVisited=4 succeeds; maxVisited=3 refuses; maxDepth=1 stays a semantic cutoff; the base-only visited boundary refuses. **PASS** (`:61`). |
| F3 | `packages/core/src/native/FrontierClosure.ts:474-490`, `:498-508`, `:510-529` | 24,000-edge DAG and a deep cycle with a backedge: exact count 1, exact pathSteps success, one-less typed refusal; origin=target returns 0. **PASS** (`:105`). |
| F4 | `packages/qualification/src/engine-write-counter.ts:473-490` | POST JSON and multipart containing a query count as writes; health/query controls stay clean. Three other unclassified GET shapes fail closed-accounting assertions. **PARTIAL / F4-R2** (`:179`). |
| F5 | `packages/qualification/src/engine-write-counter.ts:221-222`, `:289-315`, `:342-347` | Prepared reads, DELETE and COMMIT, retained named portals, Close, and rebinding survive six alternating resets plus three Close/rebind windows. **PASS** (`:236`). Exception-latched traffic across three more resets fails. **PARTIAL / F5-R2** (`:279`). |

Final new suite: **8 passed, 2 failed**, with six failing assertions grouped into the two findings above. Evidence: `round2/delta.log`, `round2/delta-results.json`, `round2/delta-runs.json`. Failures were retained, not fixed or waived.

## Q76b and Q76d

- **Q76b PASS:** `packages/xtdb/src/XtdbStorageAdapter.ts:622-640` initializes the schema without `tx_query_relations`. The reviewer captures every initialization submit and verifies that none mentions it (`delta.test.ts:294`). No existing resident table/data was dropped.
- **Q76d PASS OFFLINE:** XTQL and SQL WL20 branches at `packages/qualification/src/native/xtdb-workloads.ts:851-866`, and SPARQL at `packages/qualification/src/native/qlever-workloads.ts:581-593`, call `countSupportPaths`. That helper (`packages/qualification/src/native/support-paths.ts:12-22`) constructs a complete bounded closure and calls `countSimplePaths`. Each surface's reviewer test counts **3** simple paths on a graph containing a five-edge path, a shortcut, duplicate edges, and a cycle. Each makes one native select with maxRows=100000 and the requested `{recordedAt:1007, validAt:1000000}` basis. The 99,999-edge admission plus overflow-witness limit remains explicit. These are actual workload-wiring tests with a controlled session, not live WL20 engine acceptance.

## Offline and light resident execution

All expensive commands, including source binding, ran under the canonical main-checkout `lab/bin/heavy.mjs` semaphore. Disk free was over 30 GiB before admissions (above the 5 GiB minimum). No dependency install or pnpm invocation was needed. Node was v22.23.2.

| Run | Result | Evidence under `round2/` |
| --- | --- | --- |
| Core offline | 848 passed | `offline-core.log` |
| XTDB offline | 25 passed, 84 skipped | `offline-xtdb.log` |
| QLever offline | 27 passed, 21 skipped | `offline-qlever.log` |
| Qualification offline | 86 passed, 50 skipped | `offline-qualification.log` |
| Qualification node tests | 18 passed | `offline-node.log` |
| Original reviewer suite | 15 passed | `original.log`, `original-results.json` |
| New delta suite | 8 passed, 2 failed | `delta.log`, `delta-results.json` |
| Light QLever inline cycle/diamond closure | 1 passed; 3 + 5 counted statements, zero writes/commits/unparsed | `light-live.log` |
| QLever live wire counter, positive control and cleanup | 1 passed, 61 filtered/skipped | `counter-live.log` |
| C8 QLever boundary integration (1 reader, 2000 ms writer windows) | 1 passed, XTDB skipped; 29 read-window statements, zero writes/commits/unparsed | `c8-live.log`, `live-runs.json` |

The reduced C8 run took 108.8 seconds on the shared resident, completed one recursive-read iteration, and recorded one writer commit in each writer window. Those samples establish no latency or sustained-progress bar. Offline total: **1,004 passed / 155 skipped / zero failures**. Read-window zeroes in the successful light checks are scoped observations; the two instrumentation findings prevent upgrading them to an unconditional fail-closed guarantee.

Commands, from this reviewer worktree:

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-2-prepare -- node lab/verify/C8/round2/prepare.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-2-original -- node lab/verify/C8/round2/run.mjs original
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-2-delta -- node lab/verify/C8/round2/run.mjs delta
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-2-offline -- node lab/verify/C8/round2/run.mjs offline
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-VC8-2-live -- node lab/verify/C8/round2/run.mjs live
```

The delta command intentionally exits 1 while F4-R2/F5-R2 remain. To isolate one variation, run Vitest from `round2/sut` using the original reviewer config and `-t 'F4:'` or `-t 'F5 variation:'`; the runner records full commands, cwd, environment overrides, timestamps, and exits in the `*-runs.json` files. `prepare.mjs` reconstructs the ignored snapshot from the target Git revision and verifies all extracted tracked bytes. It refuses a snapshot mismatch rather than silently replacing it.

First failures remain: `*-attempt1` files show the reviewer's initially incomplete archive (missing root TypeScript config and qualification comparator fixtures), before meaningful source tests ran. The source archive was completed from the same commit and all requested suites reran. `delta-*-attempt2` retains the first semantic 8-pass/2-fail result; the final rerun adds explicit cut-basis assertions to all three WL20 surface checks and has the same result. No product source changed between these attempts.

## Limits and open work

Fix F4-R2/F5-R2 and rerun the new probes before accepting Q77c. No actual mutating application read was found; this delta does not re-audit every read entry or replace the original `READ-PATHS.md` inventory. The storage/operation-resolution facade limitation remains as described there.

No fresh full XTDB G1/G2, live XTDB transaction-overlay test, full QLever G2, root build/docs/pack check, other-backend integration, performance load qualification, or sustained-writer-progress acceptance was performed. Q76f's quiet exclusive-slot reruns remain separate work. The reduced QLever C8 integration leaves its uniquely scoped fixture/writer facts per its existing test contract; the standalone counter probe deletes its positive-control triple. No shared resident lifecycle operation, engine slot acquisition, product-code edit, main-checkout edit, merge, push, release, or deployment was performed. The final report and tools are committed only on `verify/C8` under `lab/verify/C8/`.
