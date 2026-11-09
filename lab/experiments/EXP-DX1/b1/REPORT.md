# DX-B1 report

North star: P1/P4 subject pulls and P2 commits; targets are lab/TARGETS.md.

## M0

Implemented DATOMIC_BASE_URI with the requested default. Offline install reused 600 packages, downloaded zero. Built the Datomic dependency graph. Isolated container tx2-dxb1-dev, image tx2-datomic:1.0.7745-da00, CPUs 6/7, memory/swap 3g, port 8490, owned volume tx2-dxb1-data.

Baseline: 7 files, 135 tests passed, 1 failed (136). Existing failure: adapter.test.ts “preserves signed zero and int64 bounds and rejects noncanonical integers” raises InvalidTripleError for a value outside the declared Datomic domain. Not changed or chased.

Raw baseline and build logs: /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B1/{baseline.log,build-baseline.log}. No acceptance or scorecard PASS claimed.

## M1

Implemented rowText.ts, row datoms and retirement, sticky regularity metadata, exact position/time db selection, bounded peer BFS, hand-written reach response, adapter decoding and core-BFS ordering. Empty visited entities are explicitly carried in `visited`, allowing coverage validation; decode/coverage faults increment client.reachDiagnostics.faults and fall back. Added optional atomicReach to avoid the core's otherwise mandatory basis preflight, and StorageAdapter.reachBy to reuse the exact core traversal without private source imports. Other adapters retain the default path.

Fresh M1 gate: 200 scenarios, 6,600 comparisons, 5,960 accepted/deep-equal, 640 declined (380 interior-position, 260 irregular), zero decode/coverage faults. Valid ranges, time equality, earlier exact/interior cuts, combined cuts, chains/cycles/shared and absent targets, retirement and nested two-position commits are covered. Public Triples.reach is asserted to make exactly one HTTP request. Codec fuzz: 10,000 rows; 2 codec tests passed, 1 integration property test passed. Core existing reach-cut suite: 5 passed.

All three manually staged mutants failed with answer-mismatch assertions: skip valid-time filtering; skip retracting row datoms; ignore recordedAt. mutants.sh restored production source and restarted afterwards. Final unmutated gate passed. Raw evidence: m1-final.log, m1-results.json, core-m1.log, mutant-{valid,retraction,recorded}.log, mutants.log, build-m1-final.log under the durable evidence directory. Earlier failed attempts remain there: domain-invalid fuzz fixtures, a startup race, and an oracle fixture that accidentally dropped recordedPosition were corrected before the final gate.

Declines: rows-version absent/not 1; sticky irregular record-time/position history; non-head position without an exact physical tx (including position zero); overflow flag on any visited entity (text >8,000 UTF-16 code units, or an empty ref target); more than 5,000 visited entities; more than 100,000 returned rows. Transaction-local calls decline in the adapter so staged rows use the existing path. Malformed decoded response, basis mismatch or missing visited coverage increments faults and falls back. Historical overflow is evaluated at the selected db. Gateway id cache is cleared on database deletion.

The current declared domain rejects negative zero business-number values and malformed/NUL string values. The row codec preserves negative zero in time columns and preserves literal string "-0"; it uses the same value-domain rejection as decodeRow. Four-digit header lengths reject strings above 65,535 code units. Oversized data is not silently truncated.

### Observation-to-verdict audit (M1)

- rowText.test.ts: deep equality with decodeRow(encodeRow(row)), seeded 10,000-row generation and explicit domain rejection; current process imports current source against the freshly built core.
- reach.test.ts: each accepted answer is deep-equal in content and BFS order to core BFS over actual by-entity reads at the identical resolved basis, in a freshly created UUID scope; declined answers must be undefined. Explicit one-request assertion and zero-fault assertion prevent a silent fallback from qualifying.
- mutants.sh: each staged mutation requires a nonzero test exit AND an AssertionError answer mismatch, not a startup/transport error. Restores the source after every run series.
- Report counts describe these diagnostic executions only. No scorecard, contract or semantic acceptance PASS is issued. Source copies are retained in evidence/DX-B1/source-M1 and the staged gateway; dependencies are bound by dependencies.sha256. No lab/acceptance file was edited.
