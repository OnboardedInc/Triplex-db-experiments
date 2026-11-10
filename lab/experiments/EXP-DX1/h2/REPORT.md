# DX-H2 — P5 activation measuring harness for Datomic/Postgres

**Partial delivery; P5 is not qualified.** The real W0 path now seeds Datomic, runs the independent population fingerprint, evaluates pinned worlds, checks O-DOMAIN outputs, publishes the outbox, and records page timing alongside frozen writer traffic and 64 readers. A 50-subject smoke completed. The final fresh 1,000-subject run failed on a live reader after 256 subjects were evaluated, verified and ACK-published. No full 1,000-subject latency ratio or 10,000-subject result exists.

Scope: PROTOCOL 0b diagnostic only. No contract/scorecard changes, package changes, promotion, push or merge. Runtime measured in the final attempt was commit `7c2b126e`. The final commit additionally preserves nested reader failures for future diagnosis; that logging change was not engine-rerun. The original failed receipt remains unchanged.

## Status by step

| Step | Result |
| --- | --- |
| 1 — real W0 activation on Datomic | Implemented; 50-subject full diagnostic completed. Fresh 1k seed + G0 preview passed; activation failed after four ACKed pages. |
| 2 — faster page reader | Correctness blocker: reach Triples discard recorded position, which W0 evaluation consumes. Portable fallback retained; every page of 200 subjects compared at earlier/head cuts. No fast-path performance claim. |
| 3 — page timing | Implemented and exercised with W1; complete 50 and four 1k pages below. W4 not measured. |
| 4 — live traffic / ratios | Implemented paired windows, raw samples and offer-to-ACK primary clock. Final baseline completed; sweep reader failure prevents a complete pair. |
| 5 — 1k/10k W1/W4 matrix | Not completed. 1k W1 failed; W4 and 10k not run within the time box. |

## Reproduction and commands

From this worktree, Node 22.23.1, local images only and no downloads:

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label DX-H2-build -- node_modules/.bin/turbo run build \
  --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... \
  --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... \
  --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/triplex-qlever...
node lab/bin/heavy.mjs --label DX-H2-stack -- bash lab/experiments/EXP-DX1/stack/up.sh \
  tx2-dxh2-a1 --port-write 8497 --port-read 8498
bash lab/experiments/EXP-DX1/h2/run.sh --rung 50 --workers 1 --live --baseline-s 10
bash lab/experiments/EXP-DX1/h2/run.sh --rung 1000 --workers 1 --live --baseline-s 600
bash lab/experiments/EXP-DX1/h2/run.sh --rung 1000 --workers 1 --live --baseline-s 660
node lab/bin/heavy.mjs --label DX-H2-reader-equivalence3 -- node lab/experiments/EXP-DX1/h2/test-reader.mjs
node lab/bin/heavy.mjs --label DX-H2-claims-equivalence -- node lab/experiments/EXP-DX1/h2/test-reader.mjs \
  --test-name-pattern 'point-read W0 journal'
node lab/bin/heavy.mjs --label DX-H2-final-check -- node --test \
  lab/bench/test/http-counts.test.ts lab/bench/test/w0-live.test.ts lab/bench/test/w0-journal.test.ts
```

The wrapper supplies `driver.ts --world w0 --lane datomic --composition reach`, default endpoints 8497/8498, a fresh attempt/scope, durable output, the heavy token and bounded measurement leases. To request the unmeasured W4 profile, change `--workers 1` to `--workers 4`; this is a reproduction recipe, not evidence that W4 passes. Direct bare driver invocation does not supply the wrapper's heavy admission. `DXH2_MAX_WALL_S` can extend the whole-command cap for future large setups (default 10800 seconds); each measurement lock hold remains capped at 870 seconds. Seed rotates leases between ACKed commands after approximately 120 active seconds with a five-second fairness gap. Seed wall includes count enumeration and lock waits.

Stack: `tx2-dxh2-a1-{pg,tx,gw-w,gw-r}`, CPUs 6/6/6/7, caps 512/1500/1500/1500 MiB, transactor Xmx768m, peer Xmx1g; ports 8497/8498. Postgres fsync, synchronous_commit and full_page_writes were on. Stack prefix relaxation is its own commit `99160979`. The supplied up script wrote stack provenance under sibling durable `evidence/DX-H1/tx2-dxh2-a1/`, and copied gateway sources to `DX-H1/stage/tx2-dxh2-a1/`; these are indexed in SHA256SUMS.

## Final 1k attempt and failure

Durable run: `runs/reach-1794266722871`, attempt `7c710044-490f-4e1b-82e2-025b3d1b9236`, scope `p5-7c710044-490f-4e1b-82e2-025b3d1b9236`.

Seed: 42,775 commands, 442,410 assertions, 214 retirements; stored counts agree. Setup wall 1224.349 seconds, 34.937 commands/s. Independent G0 preview: basis 42775, 444,368 world facts, worlds digest `ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad`, R2 digest `9d8aae5098072e22487d8da160037384332ba1f03d42287ee98782a9cae4833c`. Activation captured position 42776 and validAt 1793793600000. All four completed pages name this same basis.

At 2026-11-10T00:16:46Z the controller failed with `ReadError: Datomic read failed`, propagated from a live-reader worker at `w0-live.ts:55` in the measured version. Exit 1, not a timeout. Original `receipt.json` is FAIL / acceptance:false. The adapter's nested cause was lost by `String(error)` in the measured worker; gateway logs do not establish it. **Underlying transport/backend cause is unknown.** The final source change uses `inspect(error, {depth:8})` and retains the failure in raw traffic for the next attempt. This improves diagnostics, not the failing backend path.

`activation-cursor.json` lists exactly pages 0–3. `activation-pages.ndjson` is emitted only after inline pinned-world/output/delivery verification and ACK publication. This establishes a 256-subject checked prefix, not full population coverage. The normal end-of-run source guard was not reached; a separate forensic read confirmed every captured source hash still matched before the final logging edit. `TERMINAL.json` binds the original receipt, command, exit, cursor, page metrics and evaluation files without changing their verdict.

## Timing results

All measurements are indicative on shared CPUs. No production extrapolation or target acceptance follows.

| N | Workers | Live readers | Full sweep wall s | Full subjects/s | Status |
| ---: | ---: | ---: | ---: | ---: | --- |
| 50 | 1 | 64 | 31.154 | 1.605 | Earlier completed smoke, overall PARTIAL |
| 1000 | 1 | 64 | unavailable | unavailable | FAIL; 256/1000 checked and ACK-published |
| 1000 | 4 | — | — | — | NOT-RUN |
| 10000 | 1 | — | — | — | NOT-RUN |
| 10000 | 4 | — | — | — | NOT-RUN |

Final 1k run: **completed pages only**, seconds. Each page has 64 subjects. All page reads made eight HTTP requests; each publish commit made two. In-flight work after page 3 is excluded.

| Page | Read | World decode | W0 evaluate | Build outbox | Publish commit | Verification |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 112.924 | 0.319 | 0.020 | 0.490 | 0.152 | 0.378 |
| 1 | 78.799 | 0.244 | 0.015 | 0.100 | 0.120 | 0.290 |
| 2 | 61.779 | 0.227 | 0.012 | 0.099 | 0.076 | 0.301 |
| 3 | 74.477 | 0.253 | 0.014 | 0.120 | 0.084 | 0.334 |
| Sum | **327.978** | **1.043** | **0.062** | **0.808** | **0.432** | **1.302** |

Total completed-page read requests 32; publish requests 8. Controller decode 0.026 s, publication queue 0.000095 s, whole callback 2.545 s, whole publication 1.243 s. Callback contains verification and publication; publication contains outbox preparation and commit. Do not add nested fields again. Read includes transport and adapter wire decoding; world decode is conversion/sorting into W0 worlds. Request counts use scoped actual HTTP Agent requests. Outbox preparation includes existing-state reads. Verification includes fresh independent reconcile and publication fold. W4 stage sums would overlap; summed stages never substitute for full wall.

Earlier 50-subject smoke totals: read 27.277 s / 8 requests; decode 0.246 s; evaluate 0.019 s; outbox build 2.096 s; commit 0.372 s / 2 requests; verification 0.271 s. It predates the final traffic-clock/root-attribute changes and is not a final-profile rerun.

**Measured limiter is graph reading** for the completed 1k pages: 327.978 s versus 3.646 s across the other exclusive stages in the table. There is no evidence here for W4 scaling. A purely linear read-stage scenario is 35.6 hours for 100k subjects (327.978 / 256 × 100000), before incomplete-work overhead, changing store/cache effects, live traffic failure or additional stages. This is a conditional diagnostic projection, not a full sweep estimate or observed throughput.

## Live traffic and correctness counters

Final no-sweep window: 660.007 seconds, 64 readers, frozen seed `DX-H2-frozen-v1`, offset 0, generator digest `45950244a59ab8331533597b919781efb3ca3de151ccfefdc7a23cca0ad75d28`.

| Metric (ms) | Baseline count | Baseline p50 | Baseline p99 | Complete sweep / p99 ratio |
| --- | ---: | ---: | ---: | --- |
| Live read | 4633 | 8069.854 | 17190.698 | unavailable |
| Writer scheduled offer → published ACK | 4063 | 138063.578 | 317442.377 | unavailable |
| Transact service diagnostic | 3924 | 31.791 | 91.595 | unavailable |

Offers/ACKs 4063/4063; duplicate resolutions 139, lost-ACK offers 43, corrections 37, baseline failures 0. The large primary writer queue already fails the intended live-progress quality; a favorable service-time ratio would not repair it. Final sweep raw traffic is retained, but failure prevented clean traffic stop/drain and a full matched pair. No ratio is assigned.

Both arms use the unchanged frozen generator and offset, with command IDs namespaced to avoid baseline retries becoming sweep no-ops. Primary commit latency includes scheduled queueing and late ACKs. `matchW0Live` checks trace identity and compares the same offer-time prefix; it exposes `fullSweepCovered` rather than silently comparing unequal durations. Arms share evolving state, not identical database clones. Live read latency covers the pinned graph fetch after basis acquisition; it excludes the preceding `currentPosition()` call. Readers check basis availability, not full live-model equality, and use uniform current subjects rather than the required complete historical/hot mix. These are diagnostic limitations.

The earlier 50 smoke used a 10-second baseline against a 31-second sweep and the old service-primary clock. Its old ratios (read 0.390, writer service 1.454) remain original raw diagnostics; they are not matched P5 evidence. It had 14/14 and 39/39 offers/ACKs, zero duplicate/lost-ACK/correction samples and zero live failures.

| Gate | Completed 50 smoke | Final 1000 attempt |
| --- | --- | --- |
| G0 independent population fingerprint / preview | PASS | PASS, all 1000 |
| G1 pinned-world equality | PASS | Inline checks passed for completed 256; global verdict not issued |
| G2 independent reconcile equality | PASS | Inline checks passed for completed 256; global verdict not issued |
| G3 post-capture mutations | PASS, 1 witness | 10 positive mutations performed before baseline; full sweep witness verdict not issued |
| G4 exact coverage / resume | PARTIAL: 50/50 and completed-cursor no-op; no abrupt stops | Incomplete: 256/1000, four published pages; no full coverage/resume verdict |
| G5 independent publication fold / delivery equality | PASS, 32 deliveries | Completed pages checked before ACK cursor; global delivery counter/verdict not issued |
| G6 additional cases | NOT-RUN | NOT-RUN |
| G7 basis / epoch | PASS | Completed pages carry captured basis; global verdict not issued |
| G8 maintenance overlap | NOT-RUN | NOT-RUN |
| G9 independent end counts / stored feed fold | PASS | NOT-REACHED |

50 smoke seed: 2242 commands, 24407 assertions, 6 retirements. End: position 2298, 25239 assertions, 52 retirements, independently folded feed equality; no duplicate evaluations/deliveries. The final failure leaves later totals unknown; they are not filled from ACK guesses. Existing `w0-gates.ts`, fingerprint and O-DOMAIN checks were not weakened or edited. [AUDIT.md](AUDIT.md) lists every verdict/receipt producer and its content, freshness and binding checks.

## Package blockers and harness workarounds

1. **Reach rows need genuine recorded positions.** `worldOf` emits `WorldRow.position` as fact `tx`. W0 kernel validates it (`packages/w0/src/kernel.ts:176`), uses decision/trace positions (260–328), and uses pay fact chronology for `pay.change` (699). Fingerprint and evaluation consume it. `packages/datomic/src/reach.ts` returns Triples without recorded_position. A `getReachTriplesMany` returning the same type is equally insufficient. Needed: `getReachRowsMany(roots, basis)` returning `rows: readonly TripleRow[]`, reported recorded/valid basis and available source position, preserving each row's true recorded_position and valid interval at historical cuts. Per-root equivalent could use concurrency 8. Until then `datomicW0Sweep` deliberately calls portableSweep; no position is fabricated.
2. **Stored transaction paging materializes the whole journal.** `packages/core/src/store/TriplesLive.ts:666-686` queries all `_Transaction` rows before applying after/limit in TypeScript. At 200 W0 subjects it exceeds the 67,108,864-byte Datomic client response cap even with requested limits 1/10/100 (`count-diagnosis.log`). Needed: existing `transactions({after,limit})` pushed to efficient adapter journal selection before materialization. Harness-only `w0-journal.ts` tracks ACK identities, requires dense identities through the captured head, then reads actual public `transaction(txId)` records and validates ID/position/changes. G9 folds stored changes, never ACK payloads. Point pages equal the original route byte-for-byte on every 50-subject page.
3. **Command claim lookup scans too broadly.** Harness-only `w0-claims.ts` uses exported `DatomicClient.claim(db, commandId, capturedPosition)` followed by stored public transaction read and validates txId/commandId/eligible position. Needed production API behavior: indexed `transactionByCommand` with the same result contract. No ACK cache resolves lost ACKs.
4. **Traffic scalar preconditions need only root attributes.** Harness `rootAttributeRows` uses public storage.query at the exact basis, validates source head, row entity/attribute/position/valid bounds, and retains genuine row positions. Engine test compares every selected row to the portable graph path at earlier/head positions around a real scalar retirement. This avoids full-graph reads without changing frozen commands or retirement preconditions.
5. **Optimization candidate, not established cause:** gateway `storage.clj:265` does linear `some` membership over entities for each row already selected by those entities. A per-request set could preserve the existing getByEntities contract while avoiding repeated scans. No causal experiment or package change was made; DX-B2 owns that code.

## Remaining TARGETS 1.1 P5 gaps and scale

| Item | Delivered / missing |
| --- | --- |
| 1 — release, W0, shared basis | Real W0 kernel, release hashes and exact cut; final 1k incomplete; no 100k. |
| 2 — exact once coverage | Full subject-list hash and strict duplicate/page checks exist; only 256/1000 final coverage, no full verdict. |
| 3 — independent outputs and atomic work items | Existing checks on completed pages and complete 50 smoke; no full 1k outcome or new independent readback of every persisted outbox row. |
| 4 — post-capture mutations | Positive mutations and strict pinned checks implemented; full 50 witness passed; final 1k witness verdict not reached. |
| 5 — wall and maintenance | Inclusive timing implemented; no complete final 1k wall, 100k ≤100s result, or ten-minute throttled compaction/rebuild overlap. |

W0 requires 434,768 logical seed commands at 10k and 4,338,757 at 100k. At the final measured setup rate 34.937 commands/s, seeding alone projects to **3h27m at 10k and 34h30m at 100k**. The earlier 1k setup was 1737.974 s / 24.612 commands/s (4h54m / 49h projections). These include count enumeration and lease contention, assume constant rate and data mix, and do not measure larger-store effects. This explains why fresh 10k setup and the remaining matrix were not attempted within the roughly three-hour task budget. Efficient bulk loading must preserve every logical command, journal entry and row recorded position; skipping seed/fingerprint is not a valid shortcut.

## Checks, pins and cleanup

Offline installation and required builds passed. `checks6.log`: 23 pass, two engine tests intentionally skipped offline, zero fail (25 total). `reader-equivalence3.log`: three engine tests pass, including every page of a 200-subject world at earlier/head cuts (portable fallback equivalence, not a fast method). `scalar-equivalence.log`: actual claim, every 50-subject journal page and ten-subject scalar old/head comparisons pass. `checks-final.log`: four focused HTTP/pair/journal tests pass after final diagnostic logging edit. Changed-source typecheck passed (`focused-typecheck7.log`); full bench typecheck has pre-existing errors in audit-traffic.ts, round2.ts and hs01-seed.ts. Full root pnpm check, package qualification, release, recovery crash cycles, complete live-read oracle, maintenance, A/A calibration and all large/W4 runs were not performed.

No acceptance-pinned path moved: [PIN-CHANGES.json](PIN-CHANGES.json) is empty after checking modified paths against acceptance references. No lab/acceptance, packages or lockfile changes. No generated package artifacts were edited.

Cleanup completed after the controller returned exit 1. Captured exact owned container inspections and logs, then removed four containers, network `tx2-dxh2-a1-net` and volume `tx2-dxh2-a1-pg-data`. `cleanup/cleanup.json` records subsequent empty Docker container/network/volume searches for `tx2-dxh2-`. No other resources or images were removed. All first failures, seed prefixes, configs and logs remain durable. Removal of the owned backend means resuming requires a fresh seed; the failed raw attempt is not adopted as a passing run.

Durable evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H2/`. [EVIDENCE.md](EVIDENCE.md) indexes all attempts, [SHA256SUMS](SHA256SUMS) binds raw files and stack provenance. Bulk files remain outside git. The report and audit explicitly distinguish completed smoke, verified prefix, failed final attempt and unrun targets.
