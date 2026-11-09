# EXP-C8 round 3 — CX-C8-R3

Result: Q81b's two remaining counter gaps repaired and X02 fix round merged. Builder hand-back for a separate reviewer; no independent promotion claim.

North star: **P1 correctness floor**, trustworthy evidence that pinned recursive reads do not write. Goals and targets come from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure from `lab/PROTOCOL.md`. The main checkout was read only except the authorized shared heavy semaphore/Git metadata. Task ruling: Q81b in main `lab/acceptance/RULINGS-PENDING.md`. Reviewer evidence was read with `git show 029f9d3:lab/verify/C8/VERIFY-round2.md` and its `round2/delta.test.ts`.

Implementation merge: `b5a995a37343c1be6f36f4c2253c8b9bc58b3262`, parents `0527233c21c0073280c5eaf56bf6077e101c2cf2` and `6cd68dcad31039ceeaec943f0258e1c63a853d48`. The containing follow-up commit adds only this report and fresh evidence/tools.

## Repairs and merge resolution

- **F4-R2 / HTTP:** `classifyQleverRequest` now requires a recognized query, update, command or health operation; metadata alone cannot justify a clean tally. Unknown parameters also count conservatively, including when attached to a query. Standalone settings, including `query-planning-budget`, count as writes rather than receiving an unsupported session exemption. Existing GET/form/SPARQL body queries, allowlisted commands, health/ping and WebSocket cancellation remain covered by clean controls. Unknown commands and graph writes retain their write classifications. Counting is conservative evidence, not a claim that an upstream actually commits every such request.
- **F5-R2 / pgwire:** the proxy's exception latch now charges every subsequent forwarded chunk as an opaque write in the current tally window. The latch remains connection state across `reset()`. The original failing malformed Parse packet and later DELETE/Sync traffic now count across all three reviewer windows. Permanent package regressions additionally exercise later Sync-only and single opaque-byte windows while confirming bytes reached the fake upstream. Prepared-statement/portal state and ordinary resets remain covered unchanged.
- **X02:** merged `6cd68dc` with its token-aware quantified guards, typed recoverable inventory overflow, exact-compute refusal before XTDB DECIMAL rounding, and unset-language behavior. Two files conflicted: `xtdb-workloads.ts` and `xtdb-native-library.test.ts`. Resolution retains C8's seeded read-only frontier closures, general bounded WL20 simple-path counting, and mark-join guard; X02's removed depth-unrolling helper/scratch implementation was not restored. With the switch unset, point `state-at` calls remain XTQL and other calls remain SQL, including SQL read-only closures; explicit XTQL and SQL profiles remain pure. All 71 cases run in each explicit profile and the unset profile. X02's overflow recovery and environment-routing tests were retained; its obsolete depth-helper import was omitted. The merge therefore preserves X02 routing while retaining C8's authorized replacement of mutating recursion.

No dependency install/change, global cache, generated build edit, public export change or Changeset was needed for this private qualification counter patch. Imported X02 source/test/evidence files are part of the requested merge; their previous run results are historical, separate from the fresh checks below.

## Fresh execution on merged source

All expensive runs used main-checkout `lab/bin/heavy.mjs` and its shared four-slot queue. Host disk free was 29 GiB before admissions, above the 5 GiB minimum. Node: v22.23.2. Existing installed dependencies were reused. No pnpm or Docker command, engine lifecycle operation or exclusive reservation was used.

| Check | Result | Evidence under `round3/` |
| --- | --- | --- |
| Core offline | 849 passed | `offline-core.log` |
| XTDB offline | 38 passed, 84 skipped | `offline-xtdb.log` |
| QLever offline | 27 passed, 21 skipped | `offline-qlever.log` |
| Qualification offline | 92 passed, 50 skipped | `offline-qualification.log` |
| Qualification Node tests | 18 passed | `offline-node.log` |
| Original reviewer plus unchanged round-2 delta | 25 passed, zero failed | `reviewer.log` |
| Four package typechecks | all exit 0 | `typecheck-{core,xtdb,qlever,qualification}.log`, `checks.json` |
| Targeted lint | zero errors; existing XTDB retry-loop constant-condition warning | `lint.log` |
| Changed-file format / working diff | passed | `format.log`, `diff-check.log` |
| Light QLever cycle/diamond closures | 1 passed | `qlever-light.log` |
| Live QLever wire counter, positive control and cleanup | 1 passed, 63 filtered/skipped | `counter-live.log` |
| C8 QLever boundary integration (1 reader, 2,000 ms writer windows) | 1 passed, XTDB skipped; 141.94 s | `c8-live.log`, `checks.json` |

Offline package/Node total: **1,024 passed / 155 skipped / zero failures**. Reviewer probes are separate: **25 passed / zero failures**. `lab/verify/C8/round3-delta.test.ts` is a byte-for-byte copy of the reviewer's `029f9d3:lab/verify/C8/round2/delta.test.ts`, relocated to the same import depth, with no expectation edits. The original reviewer suite is also unchanged. `source-manifest.json` binds 505 tracked package/config/lock source files to the implementation commit and verifies both reviewer files against their original Git bytes. No product source changed during or after these checks.

The C8 integration asserts zero read-window writes/commits/unparsed traffic, at least one completed recursive read, and the write positive control. Its console objects are omitted by the Vitest summary reporter, so no exact statement count or writer-latency number is claimed.

The first successful runs are retained directly; this round had no semantic test failure or waived test. Heavy queue waits are retained in driver logs. The initial unprivileged merge could not write the worktree's ORIG_HEAD lock; the authorized metadata escalation completed the requested merge. The imported X02 raw log has a pre-existing trailing blank line reported by the staged diff check; its evidence bytes were preserved.

## Reproduction

From this worktree:

```sh
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R3-offline -- node lab/experiments/EXP-C8-read-only-frontier/round3/run-offline.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R3-reviewer -- node node_modules/vitest/vitest.mjs run --config lab/verify/C8/vitest.config.ts lab/verify/C8/adversarial.test.ts lab/verify/C8/round3-delta.test.ts
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R3-checks -- node lab/experiments/EXP-C8-read-only-frontier/round3/run-checks.mjs
node /Users/sam/projects/triplex-db-2/lab/bin/heavy.mjs --label CX-C8-R3-bind -- node lab/experiments/EXP-C8-read-only-frontier/round3/capture-source.mjs
```

The retained runners record exact commands, environment overrides, times and exits in `offline-results.json` and `checks.json`. They write this round's evidence paths; use new output paths for future attempts to preserve these receipts. Source capture names the then-current HEAD; this report/evidence follow-up does not change product source.

## Limits and open work

No fresh XTDB resident integration, full G1/G2, quiet exclusive-slot run, root build/docs/pack check, PostgreSQL/FoundationDB integration, production load or sustained-writer-progress qualification was performed. C8 resident execution uses one reader and 2,000 ms writer windows, a functional counter check rather than P1 performance acceptance. The test retains its uniquely scoped fixture/writer facts under its existing contract; the standalone counter and C8 positive-control triple are cleaned up on success. No unknown/forensic backend state or old failures were deleted.

No main-branch merge, push, release or deployment was performed. Independent review of the committed source, full lane qualification and Q76f quiet-engine work remain with the reviewer/orchestrator. No actual mutating application read was demonstrated by the fake-server reviewer cases; their purpose is proving conservative instrumentation. The existing read-path facade inventory/limitations remain unchanged. XTDB exact Datalog computation remains a deliberate typed refusal until a precision-safe implementation is independently qualified.
