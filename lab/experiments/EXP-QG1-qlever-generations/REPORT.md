# EXP-QG1 phases 0 and 1

**Result: phase 0 completed; phase 1 diagnostic grids completed, qualification incomplete.** No performance PASS or production rebuild threshold is declared.

Builder: CX-QG1, branch `exp/QG1-qlever-generations`. North star: P1, P4 and P5, reads from a built base with a bounded delta. Goals: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`; design: R35 and Q91a-d. Phase 2 is outside this round.

## Phase 0

On an exclusive qlever-s1 copy, `rebuild-index` returned HTTP 200 in 5,308.98 ms. All eight sampled queries returned nonempty byte-identical canonical answer multisets before and after. The base was one triple; the captured persisted delta contained 1,901,135 inserts and 38,058 deletes, total 1,939,193. No #3172 failure was reproduced in this copy. This is a sampled identity observation, not the 200-read Q89i gate.

| Probe | Before wall ms | After wall ms | Rows |
| --- | ---: | ---: | ---: |
| Discovery | 265.42 | 48.61 | 3 |
| Bootstrap point | 304.72 | 47.54 | 1 |
| Frozen C8 base SELECT | 2,214.93 | 55.42 | 5 |
| Frozen C8 edge SELECT | 2,152.32 | 50.72 | 5 |
| Discovered delta subject | 175.04 | 46.16 | 1 |
| Point plus OPTIONAL | 364.10 | 49.15 | 1 |
| Predicate | 106.59 | 44.23 | 2 |
| Object | 284.38 | 44.53 | 1 |

The shared resident was only inventoried and copied with read-only Docker operations. Its server, volume and data were never rebuilt, reset or stopped. QLever v0.6.0 `DeltaTriples::writeToDisk` publishes its update file by rename; the captured file is a whole persisted envelope, independent of later resident writes. The snapshot is not claimed to match the resident's later live state. Raw copy, container identity, actual startup script, responses and server log are durable evidence. The first isolated volume was removed and its reservation released before phase 1.

## Phase 1 observations

Both arms completed seven injected-delta rungs and the post-rebuild cell. **16/16 unchanged C8 controls passed; 320/320 same-generator P4 content samples matched.** The before-cell base count was exactly 10,000,000 until rebuilding. N labels name injected filler, while the measured delta includes C8's preceding real writes; the final measured totals therefore exceeded 1.5M. These are sequential, shared-host observations, not independent repetitions.

| Arm | Injected rung | Actual delta changes | Cold base point ms | Cold join ms | 20-pull sample p99 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| M | 0 | 0 | 7.24 | 13.33 | 273.07 |
| M | 10k | 36,518 | 5.36 | 15.90 | 277.56 |
| M | 30k | 82,389 | 5.77 | 15.65 | 308.84 |
| M | 100k | 174,529 | 5.11 | 17.56 | 311.26 |
| M | 300k | 394,814 | 5.67 | 30.39 | 384.46 |
| M | 1M | 1,105,779 | 7.88 | 91.05 | 517.99 |
| M | 1.5M | 1,611,121 | 13.73 | 181.62 | 796.31 |
| M | rebuilt | 0 | 11.79 | 31.90 | 296.68 |
| U | 0 | 0 | 8.02 | 12.54 | 289.02 |
| U | 10k | 37,762 | 8.52 | 17.21 | 353.54 |
| U | 30k | 82,389 | 7.95 | 19.33 | 294.68 |
| U | 100k | 172,041 | 14.15 | 26.85 | 568.61 |
| U | 300k | 386,106 | 8.97 | 39.31 | 346.89 |
| U | 1M | 1,100,803 | 8.87 | 34.38 | 333.56 |
| U | 1.5M | 1,608,011 | 22.27 | 59.14 | 371.17 |
| U | rebuilt | 0 | 5.31 | 14.24 | 262.84 |

The descriptive cold-join fits against **actual total delta** have slopes 98.63 ms/M changes (M, R² 0.951) and 23.01 ms/M changes (U, R² 0.803), seven points per arm. This correlates concentration strategy with cost; it does not establish the exact per-block causal function. The base-point slopes are much smaller (4.22 and 6.12 ms/M). Exact query profiles remain in the evidence.

Rebuilds took **10.93 s (M)** and **9.07 s (U)**. Both returned the sampled join unchanged, and both literal guarded-update checks returned one identical RDF string literal with lexical value `after` before and after rebuilding. C8 passed again after each rebuild. Rebuilt base counts were 11,614,876 (M) and 11,613,016 (U). RSS observations stayed below the 3 GiB stop; these are point samples, not a continuous peak-RSS proof. The post-rebuild M join did not return to its original N=0 time, so a universal return-to-baseline claim is not supported.

**Threshold decision: none qualified.** M's isolated small-sample screen admits 36,518 changes; U's admits 82,389, but U's lower 37,762-change cell already exceeds its 1.1x bar. These non-monotonic sample maxima, the missing exact-block counters and frozen writer trace, the reduced rung, and the absent nonempty paired C8 SELECT on the fresh seed make a stable common threshold unjustified. The absolute P4 p99 bar of 25 ms is also missed at N=0. Do not configure an automatic rebuild policy from these isolated points. A next round must resolve the layout/rung mismatch and measure repeated cells with actual production writer keys before selecting T.

## Measurement boundaries

The 10M base is 9,980,194 adapter-emitted triples plus 19,806 padding triples in a distinct diagnostic graph. It contains 3,950 complete NS subject worlds, not 100k. Existing `qlever-bulk-seed.ts` runs the real public `Triples.transact` / `makeQleverStorageAdapter` path with a capture transport and emits its VALUES as N-Quads. No command or assertion was truncated to meet the cap. The 4,000-subject first seed exceeded the cap (10,105,239 triples) and was rejected; it remains recorded. The 3,950-subject second seed's assertion count matched the generator's closed form.

This is a diagnostic scale run. The brief's complete 100k-subject world and the 10M cap cannot both be met by the current A0 encoding. R17's compact current-graph projection is a different layout; this run does not silently substitute it for the adapter's actual encoding.

Delta filler uses the public `encodedRowFields` serializer and unique assertion IRIs. M uses sequential synthetic identifiers in a new, concentrated identifier family; U interleaves new identifiers with base assertion identifiers and reuses filler entity identifiers. M is not proven to sort after the base under QLever's ICU collation, and is not claimed as production ULID-tail coverage. This is a controlled physical-key experiment, **not** the frozen writer trace, and U is **not** a semantically validated correction stream. The unchanged C8 control supplies real Triplex fixture/writer traffic at every cell. Actual persisted delta counts are recorded before and after that control; N labels denote the requested injected-filler rung, never an exact engine delta. C8's writes stay in the subsequent cells.

Every probe retains its full runtime tree, request bytes, result bytes and timing, with cold and warm requests separated. The frozen paired C8 query texts are copied verbatim from CX-C8-R3's round-4 `paired/baseline-original-{1,2}.rq`. Their old graph exists on the phase-0 copy but does not exist in the new phase-1 seed. Empty results from those paired shapes on phase 1 are diagnostics only; the full unchanged C8 test creates and checks its own fresh fixture.

Total inserted and deleted counts come from a fail-closed decoder of the pinned v1 persisted envelope, including its magic, version, vocabulary lengths, two vectors, quad divisibility and EOF. It refuses unsupported blank-node blocks. Counts are not `live COUNT - base`, which would miss tombstones. The decoder has positive and malformed-envelope tests.

Exact touched-block delta counters are unavailable from the stock server. Runtime estimates are retained as an explicitly approximate gauge, not reported as exact counts. On a built base, estimate times five also includes base rows and integer truncation; it cannot satisfy Q91a's exact-block requirement. This blocks production performance admission for this run.

## Safety and implementation

`engine.mjs` adds exclusive-QLever-only `--qlever-memory 1000M` and `--qlever-seed-dir`. Shared residents and XTDB reject these overrides before lifecycle work. A seed is mounted read-only; its individual file hashes and aggregate digest join the effective config. Startup checks the hashes, refuses to seed a nonempty index, and checks the marker digest on reuse. It builds N-Quads with a 500k-triple batch and 512M sort memory, and sets the experiment's previous-index retention to none. It never copies files over a live index. Default shared configurations retain their original bytes and hashes.

The slot retains its 3.5 GiB memory/swap cap and two-CPU quota. Delta RSS is checked during filling and at cell boundaries with a 3 GiB stop. All builds, index starts, measurements and long controls run under `heavy.mjs`; Docker uses only the private triplex2 socket. Cleanup uses `engine.mjs down --remove-volume --holder CX-QG1`. No acceptance contract files, product packages, dependencies or lock entries were changed.

## PASS audit

- `probe.mjs` emits `sampledAnswerIdentity`: it compares nonempty successful answers from the before and after responses of this attempt, with canonical ordering. It binds its source hash and slot owner; it does not prove complete Q89i coverage, exact touched blocks or all source preimages. Its verdict is explicitly DIAGNOSTIC.
- `grid.mjs` preserves the unchanged C8 process exit, signal/error, log and test hash for each cell. The test itself checks content through its assertions and its positive write-counter control on a fresh fixture. The surrounding observations bind this attempt's exact container ID, image, config, runner, serializer, lockfile, slot owner and raw requests. A process exit alone is not promoted to P1 or P4 acceptance.
- `grid.mjs` emits `sampledIdentity` for the final join around rebuild. It compares only that attempt's observed result arrays; it is explicitly diagnostic and is not the frozen 200-read Q89i set.
- All per-cell and aggregate verdict strings are DIAGNOSTIC. No code in this round publishes an acceptance PASS, qualifies a threshold, or updates an acceptance anchor.
- `prepare-base.mjs` admits only a complete seed within 85-100% of 10M, preserves all emitted data, records padding and hashes the final compressed bytes. This is a construction check, not semantic acceptance. Unit-test PASS output checks only the documented parser and engine-option behaviors.

## Evidence and verification

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1/`. The committed `SHA256SUMS` and evidence index identify raw artifacts; bulky bytes stay outside Git. A separate reviewer must assess qualification; this builder does not self-promote.

The public core/QLever/qualification package build completed (4 tasks). The first build invocation failed because pnpm rejected `--store-dir` on a run command; the successful retry used the local Turbo executable with the pinned offline install. The existing lab unit suite passed 20 tests; experiment parser/override tests passed 4 tests; targeted lint found no warnings or errors. No root `pnpm check`, package tarball, PostgreSQL or full P1/GS suite is claimed.

## Open qualification work

No production threshold is qualified. In addition to exact touched-block counts, this round does not establish the frozen writer trace, a complete 100k-subject rung, the 1/4/16-reader P1 ladder with a maintenance event inside the measured window, writer p99 during a rebuild, the two rebuild-permutation-pair settings, or the 200-read/five-basis Q89i set. No P5 sweep or generation router was built. Those gaps are not inferred away from C8 success.

The added public P4 sample is 20 stratified subject pulls at the seed's exact `recordedPosition` and fixed valid time. It checks complete member multisets against the seed generator and records counts/digests and per-pull times. This is a small same-generator check, not O-DOMAIN/O-REPLAY independence; its sample p99 is the maximum of 20 observations. The subprocess's complete decoded results are not archived as raw wire responses. Its source was copied during the run; that copy does not retroactively establish pre-execution binding for earlier subprocesses. These limits keep all threshold screening diagnostic.

The initial phase-1 grid completed N=0 and then stopped because its response parser expected root-level update metadata; QLever returns `operations[0].delta-triples`. Its actual update succeeded; that volume was removed rather than adopted into a retry. `grid-M-attempt1/`, the original runner preimage and failure log remain. The fresh retry reads the observed nested counts and continues to record actual persisted counts around each cell.

No acceptance-pinned path was changed: the existing modified path is `lab/bin/engine.mjs`, which is not an input path in the checked-out contract pins. No re-pin, generated acceptance edit, contract build, merge or push was performed. Its old/new SHA256 is included in the final change receipt for review even though it is not pinned.

Reproduce phase 1 against the retained, hash-bound base with a **new** attempt number:

```sh
node lab/bin/heavy.mjs --label CX-QG1-rerun -- sh lab/experiments/EXP-QG1-qlever-generations/run-phase1.sh 3
```

The durable seed is part of this reproduction; independent regeneration needs new seed/output paths and a fresh capture, not overwriting the first seeds. The runner refuses existing grid output directories and checks host free disk before starting each arm. Retained completed delta snapshots may be gzip-compressed; compression receipts retain original and compressed hashes and verify the complete decompressed bytes before unlinking an uncompressed copy. A completed cell JSON establishes that those write-once copies are quiescent; no active foundation files are compressed or removed.

## Final audit additions

- `p4-sample.ts` emits `contentEqual` after comparing complete member multisets and their digests at the named seed position. It records the 20 actual/expected counts and timing observations from that subprocess, but does not establish an independent oracle or complete raw-wire archive. The recorded verdict is DIAGNOSTIC.
- `grid.mjs` also emits F05 `observedContentMatches`. The measured runner checked one row, before/after equality and an `after` substring; the archived result arrays themselves were read back and contain exactly one RDF string literal with lexical value `after` on both arms. The committed runner tightens the predicate to exact literal equality and adds P4-script/seed-manifest/Node binding for future runs. Its measured preimage stays in `source-attempt2/`; no rerun under the final metadata-only cleanup is claimed.
- `summarize.mjs` emits descriptive fits and an isolated `sampleOnlyCandidate`, never a qualified threshold. It consumes this attempt's cell files; it is not an independent freshness/binding verifier and cannot promote their statuses.
- `lint-updates.mjs` inventories actual emitted update bytes and the adapter template source for IRI/URI/BIND construction. It is a syntactic inventory, with term contents excluded, not semantic proof for all future generated updates.
- Compression receipts check content by complete disk readback, source mtime stability and raw/compressed hashes, tied to named quiescent copied files. The bounded small-file pass processed at most 8 MiB per input after both arms terminated; it started no engine, benchmark or oracle fingerprint below the disk admission floor. The first snapshot-compression pass matched no filenames; its empty receipt remains, and the corrected passes record actual retained files.
- `SHA256SUMS` is only an integrity inventory of the final retained bytes, not a semantic acceptance receipt. Cleanup evidence checks container/volume absence and released ownership/reservations for this slot; it does not qualify a query or a data contract.

The final runner differs from the measured preimage only in stronger future metadata/F05 matching and formatting; the measured controller preimage, queries, seed bytes, actual startup script and raw observations remain available. No pending worker changes were committed.

Final artifact replay checked 16 cells, 320 sample comparisons, 32 persisted-envelope counts, the measured runner preimages and two exact F05 pairs; `qualified` remains false. The corrected update inventory inspected 142 emitted update payloads and the adapter's persist assembly, finding no constructed IRI/URI/BIND terms. Its first whole-file scan incorrectly flagged BIND in a read-only SELECT; that first inventory remains alongside `template-inventory-update-only.json`. Final targeted unit tests passed 4/4 and lint reported zero warnings/errors. `cleanup-final.json` observes absent container and volume, no owner file and no slot reservation. The final checksum inventory initially covered 1,387 retained files; small finalization recipe sources are added by their own hashes. The report and inventory are committed, with no release/promotion claim.
