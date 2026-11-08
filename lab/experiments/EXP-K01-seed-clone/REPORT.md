# EXP-K01: seed once, clone faithfully

North star: measurement speed for P1-P5, with correctness unchanged. Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Builder CX-K01 continued branch `exp/K01-seed-clone` from `870976e`, preserving `cddc038` and the E1 plan.

## Status

Builder checks only; independent review and E1 are still required. No clone-seeded screening receipt is eligible under Q74c. E1 was not run: this task authorizes only one small exclusive-slot check, and E1 needs the paired measurement window and harness integration.

## Implementation

The inherited implementation supplies XTDB-only `engine.mjs` golden/clone/settle/stop/verify/listing/golden-rm/toolcheck commands, `/healthz/started` readiness, copy fingerprints, a seed-only writer, manifest continuation, NS `seedPath` binding and Q74c invalidation. QLever cloning is not implemented.

This continuation fixes:

- Absent C3/C5/C6/C8 evidence now fails instead of certifying equal missing observations (`lab/bench/lib/clone.ts`).
- Storage immutability includes group ownership (`lab/bin/engine.mjs`).
- NS checks clone evidence against both container id and start instant and checks the golden-record hash (`lab/bin/gate.mjs`). The inherited unconditional Q74c INVALID rule remains.
- The driver checks seed-generator and built adapter bytes against the manifest before using an XTDB seed (`lab/bench/lib/bulk.ts`, `driver.ts`), preventing an internally consistent but stale golden from silently standing in for the current build.
- Block fingerprints query only existing published block files. An empty pre-cut seed catalog causes no missing-file query (`lab/bench/clone-check.ts`, `lib/clone.ts`). This is restricted to the pinned v06 local storage layout.
- E1 first-start immutability is checked on a sacrificial clone before window writes/compaction, rather than inferred from a post-window listing. Cross-seed wall-clock differences are kept distinct from same-golden equality.

## First failure, retained

The first 500-subject seed completed in 90.9 s: 26,635 assertions, 81 commands, last position 81, exact closed-form count (`evidence/seed.log`). Golden creation then stalled before the first settle log: probing nonexistent `blocks/b00.binpb` raised an uncaught memory-cache loader exception in the pinned node. The code had assumed missing block reads would return empty rows. It did not reach finish-block or create a golden.

`evidence/golden.log`, `evidence/settle-engine.log`, and `evidence/abort-missing-block.log` preserve the failure. The owned slot was explicitly stopped to close the hung query; exit 143 but no `Node stopped.` means that stop was **not certified clean**. No golden was made from that state. The retry uses a new manifest directory and a fresh slot; its reason is the missing-block discovery fix. The original manifest is retained as evidence, not used as a successful freeze.

## Validation and limitations

Focused unit tests cover seed binding, stale builds/generators, absent evidence, block discovery, copy keys, disk floor, clean stops, listing changes and the existing benchmark semantics. Full monorepo checks, publishable-package checks, large-rung performance, PAIR-0, C9/C10, QLever cloning and final acceptance are not claimed.

Q74e's fixed-time finish-block in every P1 window and per-arm manifest support in PAIR remain explicit integration prerequisites in `E1-PLAN.md`. The current NS gate intentionally keeps clone runs INVALID; this change does not introduce an E1 approval bypass.

## Live result: refused safely, not a clone PASS

| Step | Observed result | Evidence |
| --- | --- | --- |
| First seed | 500 subjects / 26,635 assertions / 81 commands; 90.9 s | `evidence/seed.log`, `evidence/manifests/first.json` |
| Fresh retry seed | Same population and last position; 64.8 s | `evidence/retry.log`, `evidence/manifests/retry.json` |
| Retry finish-block | 0 to 1 published blocks, compactor jobs 0, but the read view retained 61,709 rows | `evidence/retry.log`, `evidence/live-diagnostic.json` |
| Fresh-connection / changed-SQL diagnostic | Both returned the same nonzero live-table row counts | `evidence/live-diagnostic.json` |
| Stop before restart | exit 143, no OOM, no `Node stopped.`; not certified clean | `evidence/pre-freeze-restart-stop.json`, `evidence/restart-engine.log` |
| Restart then settle | `/healthz/started` 200; zero live rows; 1 to 2 blocks after finish-block; three zero readings over approximately 15 s | `evidence/final-live.log` |
| Freeze | Golden command passed its `freeze.ok` guard and proceeded to stop; detailed freeze output was not persisted by the inherited failure path | `evidence/final-live.log`; do not treat this as a retained complete fingerprint |
| Golden creation | REFUSED because clean-stop log proof was absent; no golden volume created | `evidence/final-live.log` |
| Golden/clone copy times | Unavailable: neither copy ran | same |
| C1-C8 clone verdict / freeze comparison | **NOT RUN**, because golden creation was refused | same |
| BusyBox/tool check | PASS, fresh at 21:25:10Z on pinned image; BusyBox shell, GNU wget | `evidence/toolcheck-current.json` (the older `toolcheck.json` is historical) |
| Cleanup | `tx2-xtdb-s1` and its data volume removed; holder and reservation released; dev residents left running | `evidence/final-live.log`, `evidence/cleanup-status.txt` |

The rolled-back read-write diagnostic queued behind the semaphore and reached its connection attempt only after the source slot had stopped. It failed to connect; `evidence/snapshot-diagnostic.log` is retained and proves nothing about snapshot freshness. Its empty JSON file is not a result.

Pinned source `references/xtdb` at `c6c1962`, `LiveIndex.kt:219-234` and `PartitionState.kt:36-42`, supports the cached-view explanation: snapshot freshness is keyed by tx system time, while block adoption clears live tables. A restart exposed zero rows without an application write. That observation is not a ruling authorizing a changed canonical freeze protocol; E1 must explicitly resolve whether both arms need the same pre-freeze restart.

The final stop still lacked the mandatory line. The cause of the missing log proof is **not established**; exit 143 alone does not satisfy the brief. No requirement was weakened, no stop receipt was rewritten, and no old artifact was adopted as a golden.

After observing that the inherited failure path lost the detailed freeze, `engine.mjs:638` was changed to save a timestamped `golden-attempt-*.json` after settle, freeze and stop, including timings and refusal status. This addition passed syntax/unit checks but was **not rerun live**; it cannot reconstruct this attempt's lost freeze. Future attempts must retain this file even when golden creation refuses.

## Checks and retained storage

- `node --test lab/bin/test/lab.test.mjs lab/bench/test/clone.test.ts lab/bench/test/bench.test.ts`: **40/40 PASS**, zero skips (`evidence/unit.tap`).
- `node lab/bin/heavy.mjs --label CX-K01-final-types -- node node_modules/typescript/bin/tsc --noEmit -p lab/bench/tsconfig.json`: exit **0** (`evidence/typecheck-final.log`). An earlier typecheck also passed.
- `node --check lab/bin/engine.mjs`, `node --check lab/bin/gate.mjs`, `git diff --check`: exit **0**.
- Live engine work ran through the heavy semaphore and engine.mjs on the private Docker endpoint with holder CX-K01. Host free disk was approximately 7.5 GiB at initial admission and over 30 GiB later; no copy occurred. The Q74f copy-floor branches have unit coverage only in this run.
- **Owned golden volumes retained: none, 0 bytes. Owned clone/source slot volumes retained: none, 0 bytes.** Both 500-subject source attempts were removed; their manifests and first-failure logs are retained in this report's evidence directory. Existing EXP-P4 retained s2 data was untouched.
- Evidence file hashes are in `evidence/SHA256SUMS`.

Useful implementation locations: driver current-build guard `lab/bench/driver.ts:103`; seed identity check `lab/bench/lib/bulk.ts:57`; missing fingerprint guards `lab/bench/lib/clone.ts:47`; published-block parser `lab/bench/lib/clone.ts:80`; block SQL enumeration `lab/bench/clone-check.ts:71`; group-sensitive diff `lab/bin/engine.mjs:543`; NS restart binding `lab/bin/gate.mjs:545`.

## R26 corrections and next decisions

1. Missing block probes are unsafe on this image: enumerate actual published files instead of reading through absent block ids.
2. A finish-block plus jobs=0 did not make the existing read snapshot report an empty live index. The same seeded volume reported zero after restart; independently confirm the cache mechanism and decide a symmetric freeze protocol before E1.
3. `docker stop -t 60` did not yield the required `Node stopped.` proof in any observed attempt. Investigate the shutdown/log lifecycle before permitting a golden. Do not substitute exit 143 for the requested evidence.
4. BusyBox assumptions were partly right: `/bin/sh` is BusyBox, while wget is GNU; the actual tested command capabilities pass.
5. Cross-seed C3/system-time equality cannot be required when independent seeds run at different wall-clock times. E1 should compare shape across seeds and exact fingerprints within one golden/clone lineage.
6. Run E1 only after the stop proof, settled-view issue, PAIR per-arm manifests and Q74e integration are resolved and independently reviewed. P-a through P-g and the 1.10 p50 / 1.15 p99 holds remain unverified; the 500-subject failures are not performance acceptance.

No merge, push, package publication, E1 run, shared-resident lifecycle operation, or external research request was performed.
