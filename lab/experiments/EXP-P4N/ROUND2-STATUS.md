# EXP-P4N round 2 status (WIP, paused on request)

Branch `exp/P4N-current-path`, worktree `/Users/sam/projects/triplex-db-2/.claude/worktrees/qh1`. Evidence root `/Users/sam/Claude/Projects/triplex-db-2/evidence/P4N-R2/`. No REPORT.md "Round 2" section exists yet. The Write tool may refuse REPORT.md; then put the text in the reply.

## Done

1. **F1-F3 (review fixes), harness in `lab/experiments/EXP-P4N/g5/`.**
   - F1/F2: `p2verdict.ts` (pure PASS/FAIL/INCONCLUSIVE; p50 bar 0.5 ms enforced; INCONCLUSIVE when A/A s_d exceeds PAIR-0's `sdLimit(1.1, rounds)`, or under 8 rounds, 3 A/A rounds or 1,000 commits per arm), vendored PAIR-0 in `g5/pair0/` (hashes in `SOURCE-SHA256SUMS`, main HEAD 6f20c6c8), `lab/verify/QH1/p2guard.test.ts` (modes `worker` and `fills`, raw per-round latencies in `p2raw/round-NN.json`, bindings in `p2-bindings.json`, passes only on PASS), `p2-recompute.ts`, negative tests `p2verdict.test.ts` (6 pass: +1 ms p50 fails, noisy A/A inconclusive, few rounds/commits inconclusive, real p99 fails, positive control passes).
   - F3: `g5/quiet-probe.ts`, `quiet-pick.mjs`, `quiet.json` (566.9 us, lowest p05 of 3 attempts, committed before grading), `summary5.mjs` grades per arm and per segment (both probes within +10% of the fixed value); a 1.25x "sensitivity" view is labelled diagnostic.
   - Port reuse: kept per orchestrator; the every-round miss is an accepted deviation (record it in the report).
2. **(c') built and tested** (commits after `04b896fd`): `current.db` per-owner/entity documents, read-through fill in reader workers only, validity = `pd == lastChange(o)` in the pull's own snapshot, `lastChange <= basis`, erasure counter `PRAGMA user_version`, owner and entity name keys, `fmt`; no epoch in the key (documents survive restart); prefill repeats passes until nothing absent or stale (fills skip on BUSY). Option `currentDocs` on `HostLog.open` and `HostBroker.open`, default off. Retained builds: `P4N-R2/arms/sdoc` and `sdoc2` (sdoc2 is the measured one).
3. **Tests (sdoc2: docs-on 34 pass in 12 files, docs-off 25 pass):** `docs.test.ts` (mutation replay 2,100 commands with pulls before/at/older bases, erasure bump, restart and deleted-file rebuild), route `QH1d` registered in `route.test.ts` (RQ01 passes), `P4N_DOCS=1` reruns of codec (100k), real (bit-exact), oreplay (Python O-REPLAY 100k), public, validfrom. Stale-document mutants `nocheck`, `fillpast`, `erz` all fail semantically (`g5-docs-mutants.mjs`, smoke evidence in `smoke/`).
4. **Measurements finished (valid):** `s1-c1`, `s2-c4`, `s4-sweep` (+ `*-summary.json`), `p2-fills` (PASS, resolvable only marginally: s_d 0.114 vs limit 0.118; p99 B/A 0.98 [0.92, 1.13]; p50 delta -0.019 ms), `p2-worker` (INCONCLUSIVE: s_d 0.124 > 0.118; p50 delta +0.016 ms; p99 B/A 0.96 [0.92, 1.03]; a measurement that cannot resolve 1.1x on this host, not a pass), both recomputed identically by `p2-recompute.ts`. `p1` smoke passed earlier (`smoke-p1/`), final run not done.
5. **Headline numbers so far (diagnostic, loaded host; strict per-segment GREEN share only 0 to 13%):**

| Series | Build | Pulls/CPU-s (all segments) | Bootstrap LB | Ratio to reference |
| --- | --- | ---: | ---: | --- |
| c=1 (6 rounds) | `final` | 614 / 624 (A/A) | 525 / 573 | |
| c=1 | `sbe` | 727 | 688 | 0.865 |
| c=1 | `sdoc2+docp` (hit, prefilled) | 1,130 / 1,123 (A/A) | 1,019 / 1,065 | 0.559 / 0.562 (above the 0.55 falsification line) |
| c=1 | `sdoc2+docc` (cold fill) | 640 | 606 | 0.98 (about 1.13x `sbe`) |
| c=4 (4 rounds) | `final` / `sbe` | 553 / 722 | 505 / 667 | 0.766 |
| c=4 | `sdoc2+docp` | 1,110 / 1,116 | 1,021 / 1,006 | 0.501 / 0.496 |
| c=4 | `sdoc2+docc` | 550 | 507 | 1.005 |
| P5 sweep c=1 (3 rounds, 10,000 roots once) | `sbe` / `sdoc2+docp` | 835 / **1,323** | 806 / 1,223 | 0.632 (756 us per pull, 26 of 30 segments within 1.25x quiet) |

   Hit share 100% for prefilled arms; cold arm hit share 73 to 74% (shared entities) with 0 fill errors; `current.db` 467 MB for 10,000 owners plus 212 entity documents (about 105 B per fact: 4,466,330 facts), WAL about 5 MB. Per-pull split of the hit path: main 421 to 441 us, readers 313 to 352 us, other threads 131 us. Answers equal to `final` on every fixed warm digest (800 or 1,600 of the same).
6. **Prediction status:** brief 10 (ratio 0.38 to 0.50): c=1 0.56 (falsified by a hair), c=4 0.50; brief 11 (1,600 to 2,300 GREEN): not met, best near-quiet sweep 1,323 and strict-eligible 1,405 on 2 segments; 1,100 bar reached on the loaded all-segment estimate (LB about 1,000 to 1,220), 1,320 not reached with margin. Stop rule 5.4.2 applies: do not tune further, send numbers and R50's question to Sam.

## Half-done

- **Writer-on series `s3-writer`** (commit every 20th pull, LCG draws) is VOID: hot reads and commit targets came from a correlated LCG (stale lookups 0 of 1,250 commits in some runs). Moved to `s3-writer-lcg-void*`. `arm5.ts` is fixed (mulberry32, commit every 10th pull, committed) but the rerun did not start. Store clone `P4N-R2/store-w` carries the void run's commits (harmless).
- **Guards chain** (`g5-guards.sh`) was stopped after `p2-worker`: `p1` (long-read, final evidence run) and `gates-final` did not run. The `gates-final.sh` script runs the 100,000-pull replay with documents on against `QH1-R3/replay/ref-baseline.txt` (`replay5.ts`, `P4N_DOCS=1`, on the R1 store), `mutants-qh1`, `mutants-docs`, and the qlever suite. Anything in `gates-final-sdoc2/` or `p1/` is incomplete and VOID.
- Pin audit for the new source hashes, `lab/experiments/EXP-P4N/R2-SHA256SUMS` manifest and evidence index, formatting/lint pass on `g5/`, and the REPORT.md "Round 2" section.

## Exact next step

1. `QH1_RESULT=$E/p1/m.json node lab/bin/heavy.mjs --label P4N-R2-p1 -- node_modules/.bin/vitest run --config lab/verify/QH1/vitest.config.ts p1-longread.test.ts` (about 1 minute).
2. `node lab/bin/heavy.mjs --label P4N-R2-gates-final -- lab/experiments/EXP-P4N/g5-gates-final.sh sdoc2 $E/gates-final-sdoc2` (replay about 6 minutes, mutants, suite).
3. `P4N_STORE=$E/store-w node lab/bin/heavy.mjs --label P4N-R2-s3-writer -- node lab/experiments/EXP-P4N/g5/abab5.mjs $E/s3-writer 5 "sbe+w,sbe+w@2,sdoc2+docp+w,sdoc2+docp+w@2" 5 1000 300 1`, then `summary5.mjs $E/s3-writer "sbe+w" lab/experiments/EXP-P4N/g5/quiet.json`.
4. `node lab/experiments/EXP-P4N/g4/pin-audit4.mjs` (base `365fe188`), `manifest4.mjs`, oxlint/oxfmt on `g5/` and `lab/verify/QH1`, write the Round 2 section with predictions 10 to 16 and R2-1 to R2-9 against the numbers above, rule 9a audit, G9 note (see below), and stop (last builder round).

## Evidence validity

- **Valid:** `quiet/`, `s1-c1`, `s2-c4`, `s4-sweep` and their summaries, `p2-fills`, `p2-worker`, `gates-sdoc2` (build and 34/25 tests), `gates-sdoc` (first cut, superseded), `smoke-p1` (smoke only).
- **Void:** `s3-writer-lcg-void*`, any partial `p1/` or `gates-final-sdoc2/`, `smoke*` timings.
- Round 1 evidence under `P4N-R1/` is unchanged and still valid; the R1 store clone also holds `current.db` (derived, deletable).

## G9 note for Sam

`current.db` is a derived, deletable cache outside the source store: 467 MB at 10,000 owners against `broker.db` 2,633,940,992 B for the same data (about 18%; about 105 B per fact on top of the store). Report it separately from G9's source-store bytes; the orchestrator asks Sam whether a derived cache counts.
