# EXP-K01 validation E1: a fresh-seeded XTDB slot against its clone under PAIR-0 (plan; not run)

**North star.** Measurement speed for all five priorities. RULINGS Q74c: no clone-seeded receipt counts, even for screening,
until E1 shows that a measurement on a clone is indistinguishable from the same measurement on a fresh-seeded slot within
the PAIR-0 hold margins. E1 needs two exclusive XTDB slots at once, so it runs in a measurement window (Q69a).

## 1. Question and decision

| Item | Value |
| --- | --- |
| Question | Does a cloned slot (arm B) measure the same as a fresh-seeded, settled slot (arm A) on the same workload, in the same window? |
| Procedure | PAIR-0 A/A duet (EXP-M01 harness, branch `exp/M01-paired-measurement`, `lab/bin/gate.mjs PAIR --mode aa`) |
| Hold margins (Q74c, `lab/config/noise.json` claims) | ratio B/A within 1.10 at p50 and 1.15 at p99, on the 95% interval |
| Rounds | 8 (a registered look, Q67f); extend to 12 at the next look if the 8-round verdict is inconclusive |
| Series | `screening-b180` (Q60g); `screening-r4` only under Q69f's rule (commitAll p50 NOT_ESTIMABLE) |
| Composition | `public-queued` (Q69e) |
| Regime | cpuset: s1 on vCPUs 0-1, s3 on vCPUs 2-3 (M01's slots.json; Q67g disjoint cpusets) |
| Pass | every R26 6.9 prediction below holds, and the duet verdict is PAIRED_DECIDED `hold` at both margins with window grade GREEN or AMBER |
| Fail | any prediction falsified, or the hold is refused; the first failed prediction names the fix (table in section 4) |
| Inconclusive | INVALID_NOISE or PAIRED_INCONCLUSIVE at 12 rounds: rerun in another window, never adopt |

## 2. Arms

| Arm | Slot | Start state | Seeded by |
| --- | --- | --- | --- |
| A (reference) | s3 | `xtdb-seed.ts` on a fresh s3, then `engine.mjs settle` (Q74b), then `clone-check.ts freeze` for P-a; never restarted, so it is what a fresh-seeded run measures today | `seed-writer` |
| B (candidate) | s1 | `engine.mjs clone` of a golden made from a separate fresh seed G on s1 with the same golden key (same inputs, same system config) | `clone` |

Why two seeds and not "the golden's own source restarted as arm A" (R26 6.9 step 2 starts the stopped s3 volume as it is):
the decision is whether a clone-seeded receipt can stand in for a fresh-seeded one, and fresh-seeded receipts are never
restarted. A restarted arm A isolates the copy from the restart, which is the diagnostic to run only if P-d fails (section 4).

## 3. Steps

Holder `E1`, experiment `EXP-K01-E1`. Steps 1 and 2 need one slot each and run before the window; steps 3 to 6 need both.
Order: merge EXP-M01 and K01 first, and make the golden in the regime the duet uses. The golden key's engine half is the
effective config without slot, port, volume and cpuset, so a golden made under today's quota regime is refused as stale on a
cpuset-regime slot if the regime changes any other field.

1. **Golden (before the window, s1).** `engine.mjs up --lane xtdb --slot s1 --fresh`; `xtdb-seed.ts --rung R --composition
   public-queued --out runs/xtdb-seed/e1-G`; `engine.mjs golden --manifest runs/xtdb-seed/e1-G/manifest.json`; `engine.mjs
   down --lane xtdb --slot s1 --remove-volume`. Keep `golden.json`, `golden-files.json` and the manifest.
2. **Arm A seed (before the window, s3).** `engine.mjs up --lane xtdb --slot s3 --fresh --cpuset-cpus 2-3` (or M01's slot cpuset);
   `xtdb-seed.ts --out runs/xtdb-seed/e1-A` with the same options; `engine.mjs settle --lane xtdb --slot s3`;
   `clone-check.ts freeze --url <s3> --container tx2-xtdb-s3 --manifest runs/xtdb-seed/e1-A/manifest.json > e1-A-freeze.json`.
   Check that the A manifest's `seedInputs` give the same golden key as G (`goldenKey` in engine.mjs; same system config).
3. **Window opens (Q69a).** The orchestrator stops qlever-dev and announces the window.
4. **Arm B clone (s1).** `engine.mjs clone --lane xtdb --slot s1 --golden-record runs/xtdb-seed/e1-G/golden.json`; readiness
   must be PASS (C1-C8). Record P-c (docker run to `/healthz/started`) and P-f (copy time) from `owner.json volumeContent.timings`.
5. **Pre-duet checks.** P-a: compare `e1-A-freeze.json` with G's freeze record (section 4 lists the fields). P-b: C8 on B equals
   G's freeze (already part of C1-C8), and C8 on A equals A's freeze after its warm-up.
6. **Duet.** `gate.mjs PAIR --lane xtdb --slots s3,s1 --mode aa --rounds 8 --composition public-queued --series screening-b180
   --seed-manifest-a runs/xtdb-seed/e1-A/manifest.json --seed-manifest-b runs/xtdb-seed/e1-G/manifest.json` (A first, so slot
   bias reads as B/A). Same warm-up on both arms (the series' warm-up period), in the same order.
7. **After.** P-e: `engine.mjs stop --lane xtdb --slot s1` and `engine.mjs listing --lane xtdb --slot s1 --golden-record ...`
   (this lists the clone after a full run, so only `changedOutsideLogs` and `removed` count: a run adds files and appends logs).
   Then `down --remove-volume` on both slots, `golden-rm` unless the orchestrator keeps the golden for screening, and recreate
   qlever-dev fresh.

## 4. Predictions (R26 6.9), corrected where the 500-subject check showed R26's wording cannot hold

| # | Prediction | How E1 reads it | If wrong |
| --- | --- | --- | --- |
| P-a | A and G settle to the same shape | C4 position and current counts, C5 history counts, C6 trie and block-file **counts per level and row counts**, C7 0. Not C3's system times or `xt.block_files.system_time`: two seeds run at different wall-clock times, so R26's "C3 to C7 equal" cannot hold for two volumes. | Seeding is not deterministic enough to compare across volumes: freeze one seed and share it (clone both arms), and say so in the receipt |
| P-b | C8 plan and result hashes on B equal G's freeze, before and after warm-up | C8 in readiness, and C8 rerun after the warm-up | restart-dependent planning (R7): add a second restart to the clone protocol, then re-verify |
| P-c | B reaches `/healthz/started` within 60 s of docker run | `volumeContent.timings.runToStartedS` | budget more per clone; at 10k replay is longer only for an unsettled golden |
| P-d | A/A slot bias at p50 and p99 within 1.10 and 1.15 | the PAIR verdict (`stats` primary commitAll q0.5, p50, p99; and probeAll) | find the source before adoption: rerun with R26's restarted arm A to split copy from restart; check page-cache warmth (copy order) |
| P-e | a start rewrites no `buffers/` file | `listing --golden-record`: `changedOutsideLogs` empty, `removed` empty | storage is not immutable at start: re-check the read-only rule for goldens |
| P-f | the copy of R's volume takes 8 to 60 s | `volumeContent.copy.copyS` | re-plan disk and duet scheduling |
| P-g | the pinned image has the tools | `engine.mjs toolcheck` | use the QLever image for the helper |

The 500-subject live check (REPORT, evidence/) already answers P-c, P-e (first start) and P-g at that rung; E1 re-reads
them at R.

## 5. Rung and disk

| Rung | Volume | Volumes at once | VM disk at peak | Host free needed when each copy starts (Q74f, 5 GiB floor) |
| --- | --- | --- | --- | --- |
| 10k | 3.41 GiB (N01 A0 receipt) | golden, arm A, clone B: 3 | about 10.2 GiB above today's 7.7 GiB | 8.4 GiB at the golden copy and again at the clone copy |
| dev:500 | measured in the live check (evidence/) | 3 | well under 1 GiB | about 5 GiB |

Today the host has 6.9 GiB free, so a 10k E1 is refused by Q74f until about 1.5 GiB more is free at each copy (the
check assumes every copied byte grows the VM's sparse disk; blocks freed inside the VM are often reused, so the real growth
is usually lower, but the rule stays conservative). Two decisions for the orchestrator (new rulings):

1. **Which rung validates.** Clones save time at 10k (38+ minutes per seed), so 10k is the rung that matters. But N01's A0
   shows XTDB's default write path cannot carry the 10k trace (queue 6,707 commands, 17,965 offers expired), so commitAll is
   likely censored and NOT_ESTIMABLE there; the read probe (probeAll, 20/s) is the estimable metric at 10k. Proposal: E1 at
   10k decides on probeAll p50/p99 and records commitAll; E1 at dev:500 (N01's proposed P1 rung, commits estimable) decides on
   commitAll. A dev rung is a protocol departure (INVALID under Q69b), so its validation covers only dev-rung receipts.
2. **Whether validation per rung is needed.** A clone's faithfulness does not depend on size in mechanism (same files, same
   start path), but replay length and cache-fill do. Proposal: E1 at each rung that clone-seeded receipts will use.

## 6. Harness changes E1 needs (not made by K01)

1. `lab/bench/duet.ts` and `gate.mjs PAIR`: per-arm `--seed-manifest-a/-b`, passed to each arm's driver; the barrier also
   compares the two manifests' `seedInputs` and refuses a pair whose golden keys differ (R26 6.6 item 4). Arm identity stays
   slot plus container id, because both arms share the scope name, the journal stream name and the tx id sequence (R26 1.3).
2. `gate.mjs PAIR`: bind each arm's `seedPath` (seededBy, golden key, readiness) into `pair.arms.X.placement`, and let E1 run
   with clone-seeded arm B (the NS gate's Q74c INVALID rule is for screening receipts, not for E1 itself).
3. `driver.ts`: Q74e's forced `finish-block` at a fixed trace time in every P1 window, on every arm (`docker exec ... wget
   --post-data= .../system/finish-block`; `engine.mjs healthz()` has the call). Not needed for E1's commit and probe metrics,
   needed before clone-seeded P1 receipts.

## 7. Time

| Step | Estimate |
| --- | --- |
| Golden at 10k: seed 38 to 53 min, settle under 1 min, freeze 1 to 3 min, stop, copy 1 to 2 min | about 45 to 60 min (one slot, before the window) |
| Arm A at 10k: seed, settle, freeze | about 40 to 55 min (one slot, before the window) |
| Window: clone with C1-C8 (2 to 4 min), checks, duet 8 rounds x 180 s plus warm-up (about 27 min), P-e listing | about 35 to 45 min |
