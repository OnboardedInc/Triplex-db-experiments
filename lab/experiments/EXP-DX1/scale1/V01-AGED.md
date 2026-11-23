# Aged v0.1 runs on the one-billion-record database

Server 2 runs three things on AGE1's 1B cut, in this order: the AGE1 seal (`measure-loaded`, which the scorecard's aged bundle requires), the 32 GiB cache arm, then the four scorecard arms at `8cc32d380` and `--assemble`. Each result is published as it lands. [Fresh card](V01-FRESH.md) · [Load](AGE1-LOAD.md) · [Handoff](HANDOFF.md)

The order puts the cache arm before the scorecard arms. The owner allowed it to run "whenever you can", and the orchestrator allowed it earlier when the machine is free. It also avoids a known hazard: each build retags the shared image names, and the sequential scorecard pins its build receipt in arm 1, so a PREP1 build between scorecard arms would make the later arms refuse.

## Aged scorecard, part by part

The four parts run at `8cc32d380` in the tool's enforced order, in campaign directory `score-v01-1b-tuned-b`, each on a fresh scratch copy of the sealed held cluster on the root NVMe, with WAL on the spare NVMe. Build `8cc32d380` was made on the server just before part 1. Bundle `faab1bc5…`; the aged live check read t 62,888,918, head 28,309,866 and 1,000,251,169 records under the original database name.

**The first campaign directory (`score-v01-1b-tuned`) was consumed by a launch fault, before any offer.** The aged admission's fresh-peer check (`v01/adopted-server.ts` line 211 `verifyAged`, through `age1/scorecard.mjs` lines 128 and 65) runs a Datomic peer on the host. The peer reads the transactor's endpoint from storage, which names the transactor's container, for example `tx2-dxscale1-v01-acf8c4b2-c83-tx`, and the host cannot resolve that name: `ActiveMQNotConnectedException AMQ219007`. The fresh card never ran this check. Part 1 had already written its start record, so the retry needed a new directory. The builder should run the peer inside the stack network or have the transactor advertise a resolvable host.

**Environment repair, approved by the orchestrator, no check changed:** a host watcher (`triplex-scorecard-hosts-watch`) adds one `/etc/hosts` line per running `tx2-dxscale1-v01-*-tx` container while it runs, in the form `<bridge IPv4> <container name> # triplex-scorecard-tx`, and deletes every line with that marker when the container stops and when the watcher exits. The rest of `/etc/hosts` is unchanged.

| Part | Writer, JVMs | Result | Fresh card, same part |
| --- | --- | --- | --- |
| 1 in `score-v01-1b-tuned-c` (fix `6770c37ba`), headline without P1 readers | Same | **1,260/1,260 saves stored**; save p50/p90/p99 6.40 / 11.84 / 20.10 ms (max 139.31); feed 1,260 entries; cut 28,309,866 → 28,311,126; 6 min 5 s; completed 18:40:30 UTC | 1,260/1,260; 5.57 / 10.50 / 24.58 ms; 1,260 entries |
| 1 in `score-v01-1b-tuned-b` (`8cc32d380`, second reading), headline without P1 readers | Ordered per-person; transactor Java 25 ZGC, gateways Java 21 G1; separate WAL | **1,260/1,260 saves stored** at the 3.5/s reference tape; save p50/p90/p99 6.40 / 11.52 / 20.61 ms (max 150.00); feed 1,260 entries; cut 28,309,866 → 28,311,126; 6 min 5 s of offers, completed 18:25:04 UTC | 1,260/1,260; 5.57 / 10.50 / 24.58 ms; 1,260 entries |

### Part 2 at `6770c37ba`: headline, loaded (completed 19:11:14 UTC)

Ordered per-person writer, transactor Java 25 ZGC, gateways Java 21 G1, separate WAL; 16 GiB transactor object cache, one-core reader. Fresh values are the fresh card at `92f8e6c30`, recomputed from its arm files.

**P2 and P6, matched 90 s windows, six fair-turn credits.** Each cell: in-window durable/s · total durable/offered · expired / durable after window · all-save p50/p99 ms · quiet commit p99 solo → loaded (ratio) · quiet read p99 ratio · quiet feed p99 ratio · quiet reads checked.

| Offered/s | 1B | Fresh |
| ---: | --- | --- |
| 50 | 50.00 · 4,500/4,500 · 0 / 0 · 12.80 / 60.67 · 21.12 → 50.17 ms (2.38×) · 1.13× · 1.11× · **1,216 of 3,840 reads returned, 2,624 errors** (solo 1,306, 2,534 errors) | 50.00 · 4,500/4,500 · 0 / 0 · 9.73 / 118.78 · 22.91 → 53.50 ms (2.34×) · 1.00× · 0.76× · 3,840/3,840 |
| 235 | 235.00 · 21,150/21,150 · 0 / 0 · 712.70 / 3,817.47 · 24.32 → 162.81 ms (6.69×) · 1.35× · 1.50× · 1,041 returned, 2,799 errors (solo 1,289, 2,551) | 234.98 · 21,150/21,150 · 0 / 2 · 47.10 / 2,392.06 · 20.09 → 88.06 ms (4.38×) · 1.67× · 1.46× · 3,840/3,840 |
| 394 | **249.41** · 29,937/35,460 · 5,523 / 1,967 · 23,330.81 / 30,054.53 · 19.58 → 87.55 ms (4.47×) · 1.18× · 1.00× · 1,021 returned, 2,819 errors (solo 1,239, 2,601) | 342.90 · 35,460/35,460 · 0 / 4,599 · 9,895.93 / 12,517.38 · 13.70 → 69.63 ms (5.08×) · 1.69× · 1.33× · 3,840/3,840 |
| 620 | **239.32** · 29,235/55,800 · 26,565 / 7,696 · 29,884.42 / 30,146.56 · 33.28 → 106.50 ms (3.20×) · 1.38× · 1.72× · 1,001 returned, 2,839 errors (solo 1,252, 2,588) | 329.42 · 39,554/55,800 · 16,246 / 9,906 · 29,753.34 / 30,130.83 · 18.94 → 76.80 ms (4.05×) · 2.10× · 1.62× · 3,840/3,840 |

**P1 pinned-read ladder (120 s per step).** Seats: 1B goodput reads/s, p50/p99 ms | fresh.

| Seats | 1B | Fresh |
| ---: | --- | --- |
| 1 | 18.12/s, 44.80 / 114.18 ms | 606.43/s, 1.18 / 5.95 ms |
| 4 | 17.83/s, 192.51 / 401.41 ms | 624.48/s, 4.67 / 56.32 ms |
| 16 | 18.85/s, 761.86 / 1,146.88 ms | 618.87/s, 20.35 / 93.70 ms |
| 64 | 19.12/s, 3,244.03 / 3,751.94 ms | 1,560.80/s, 32.64 / 146.43 ms |
| 256 | 18.63/s, 13,041.66 / 13,565.95 ms | 893.18/s, 198.66 / 860.16 ms |
| 1,024 | 11.17/s, 18,219.01 / 34,603.01 ms, **1,611 errors** | 509.43/s, 2,031.62 / 2,375.68 ms, 0 errors |

**Other rows.** P2/P3 reference tape: 1,260/1,260 saves, p50/p99 5.86 / 20.35 ms, 1,260 feed entries (fresh 5.60 / 22.53 ms). P4 current pulls: 1,000 observed, p50/p99 4.22 / 47.10 ms, max 33,179 ms (fresh 4.54 / 50.18 ms, max 85 ms). P8 paced import: 351,040 facts in 108 s, 3,250.37 facts/s, 10,971 of 11,880 frames committed (fresh 3,192.89/s, 10,776 frames).

**Reading against the predictions.**

- **P2, low rates:** close to fresh, as predicted: 50/s and 235/s stored everything in-window. The 235/s all-save p99 rose from 2.39 s to 3.82 s.
- **P2, 394 and 620: wrong in the pessimistic direction.** The prediction was flat to 15% lower than fresh. In-window delivery fell to 249/s and 239/s, 27% and 27% below fresh (343/s, 329/s), with 5,523 expiries at 394.
- **P1 and the quiet reads: much worse than predicted.** The prediction was higher tail latency at the top of the ladder. Instead the one-core reader delivered about 18–19 pinned reads/s at every ladder step, against 600–1,560/s fresh, with p50 44.8 ms at one seat. About two thirds of the quiet account's planned reads failed in every P6 cell, solo windows included, against none fresh. The error type is not in the arm summary; the gateway logs are in the evidence. Read exactness for returned reads holds (the arm passed its checks), but the read path at 1B on one core is far from the fresh card.
- **P6 ratios:** the 1.25× bar fails at every rate, as predicted.
- **P8:** import pace held (3,250 facts/s against 3,193 fresh).

**Part 2 in `score-v01-1b-tuned-b` was refused after its claim, so that campaign was consumed too.** At the P7 empty census, `thin1/native-metrics.ts` line 166 at `8cc32d380` runs `docker top <id> -eo rss`, and Docker 29.1.3 answers "Couldn't find PID field in ps output". The fresh card ran at `92f8e6c30`, which already fixed this ("Keep Docker PID in the bare-metal residency process listing"); `8cc32d380` does not contain that commit. The orchestrator published `6770c37ba` on `exp/DX-V01-scorecard-1b-fix`: `8cc32d380` plus a clean cherry-pick of `92f8e6c30`'s one-file hunk (`docker top -eo pid,rss,nlwp`). `git diff 8cc32d380 6770c37ba --stat` shows only that file. No runner file pins `8cc32d380` by hash, so no pin changed; the runner takes the commit from `--commit`. A new campaign `score-v01-1b-tuned-c` started at 18:30 UTC with all four parts at `6770c37ba`, and part 1 reruns. The part 1 above stays as a second reading.

## Seal finished by the readback repair: aged bundle written

**The 1B seal exists.** The builder's repair (AGE1 `bb9ec7324`, `age1/READBACK-REPAIR.md`) started a second transactor on the retained restored copy and ran the unchanged `restore-check`. It returned t 62,888,918 and head 28,309,866, equal to the seal. Backup, verify and restore were not repeated. [Repair](https://github.com/OnboardedInc/Triplex-db-experiments/blob/bb9ec7324/lab/experiments/EXP-DX1/age1/READBACK-REPAIR.md)

| Item | Value |
| --- | --- |
| Restore readback (`restore-check` on the restored copy) | t 62,888,918, head 28,309,866 |
| Seal cut | 1,000,251,169 records, t 62,888,918, head 28,309,866, journal `recorded-predecessor-k`, original database name |
| `sealed.json` SHA-256 | `74b8f7de6287dd66d2967958e046a60e604268b145cdd2caadd37edb7c69de47` |
| `aged-scorecard.json` (`AGE_HANDOFF_SHA256`) | `faab1bc5bca8e6303285101003e5a42fc82c8e99fe2eadacaf125259b575bbf2` |
| Held cluster after the finish (stoppedInventory) | 1,642 files, 176,078,670,513 bytes, controlSha `537ac161c2d629427d79e260653586870ef349914cf185e7aa27e2a188cc062b`, treeSha `115999f1771a325d2c60cf5a34bafc2be80ff2744069a270557724e783f07efc`; `pg_controldata` "shut down" |
| Resume run, start to seal | 17:51:57 → 17:53:47 UTC, about 2 min against a 12–40 min prediction |
| Copy times recorded in the seal (vendor JVM uptime, failed attempt) | backup 816.2 s, verify 1,376.3 s, restore 2,031.5 s |

**A second fault stopped `resume-host.mjs` after the seal.** At lines 162–163 it runs the `scorecard.mjs export` check through `call(..., { stdio: "ignore" })`. With `stdio` ignored, `execFileSync` returns `null`, and line 20's `.trim()` throws `TypeError: Cannot read properties of null (reading 'trim')`. The export child had exited 0, so the fresh-peer handoff check passed. The crash skipped four steps: `handoff.json`, the scorecard role passwords, the scripted clean stop and `aged-pgdata.json`. Its cleanup removed the containers and network. The held cluster was already stopped cleanly.

With the orchestrator's approval the driver ran only those four steps, in `resume-host.mjs`'s order and with its own functions: `normalizeScorecardRoles` and `stoppedInventory` from `scale1/decision/pgdata.ts`. The wrapper is [`resume/finish-handoff.mjs`](resume/finish-handoff.mjs). It re-checks the seal against the pins, writes `handoff.json` as line 164 does, and starts the held cluster alone (no network, resume-host's PostgreSQL settings). It then sets the scorecard role passwords, stops the cluster with exit code 0 and writes `aged-pgdata.json`. Afterwards `pg_controldata` read "shut down", no `postmaster.pid` existed and both bundle digests were unchanged. The builder should fix line 162–163 (or line 20) before the next resume.

## Seal result: stopped at the restore readback, no aged bundle

**`measure-loaded` failed after the native restore, so there is no `sealed.json` and no aged scorecard bundle.** The restore readback peer died with `:db.error/read-transactor-location-failed` ("Could not read transactor location from storage"). Every earlier step passed.

- **Cause.** `server.mjs` line 576 (AGE1 `d90b3728f`) runs the `restore-check` peer, which calls `d/connect` on `AGE_RESTORE_URI_TEMPLATE` (`age1/src/triplex/age/rung.clj` `restore-check!`). The restore lands in the separate copy PostgreSQL (`scale1/decision/age-host.ts`, `copyName` and `copyJdbc`, line 971). `age-host.ts` starts one transactor, on the primary storage. No transactor ever registered in the restore storage, so a peer cannot connect there. This path had not completed on the server before. `age-host.ts` then stopped with "AGE1 stopped before the aged measurement seal".
- **Why the scorecard cannot start.** `age1/scorecard.mjs` `writeScorecard` requires both the `seal.log` and `restore-readback.log` events. The seal runs after the readback.
- **Not a single-file repair.** It needs a transactor on the restore storage for the readback, or an approved derivative that writes the bundle without the readback event. Both are builder decisions.

| Step | Measured | Prediction |
| --- | --- | --- |
| Safety copy of the exact load cut to the root NVMe | 2 min 27 s; 1,662 files, 176,380,777,495 bytes; inventory identical to the held cluster | 20–30 min, identical |
| 120 s windows at 3.5/s quiet only | 420/420 quiet saves; receipt p50/p99 6.86 / 27.79 ms | 420 quiet saves |
| 120 s windows, 50/s busy | 6,000 busy saves (checked count) and 420/420 quiet saves; quiet receipt p50/p99 3.04 / 196.52 ms (service p99 17.83 ms) | 6,000 busy saves offered |
| Index overlap window | 897 saves overlapped an index job: receipt p99 1,811.66 ms; quiet receipt p99 1,451.65 ms; request to adoption 17.97 s (preflight estimate 12 s) | at least one overlapping save |
| Cold first reads, API ms | current recent 47.86 · pinned recent 97.09 · current year-idle 41.05 · pinned year-idle 72.64 · old cut 277.80; peer connect about 2.0 s | — |
| Native backup | 109,821,589,553 bytes, 13 min 36 s | 100–150 GB, 0.5–1.0 h |
| Full verify | 6,018,339 segments, none missing or unreadable, t 62,888,918; 22 min 57 s | 0.3–0.6 h |
| Native restore | completed at basis t 62,888,918; 33 min 51 s | 0.5–1.0 h |
| Restore readback | **failed at connect** (above) | t and head equal to the seal |
| Seal and bundle | not reached | records above 1,000,002,769 |

The windows advanced the database to native t 62,888,918 and 1,000,251,169 records. The held cluster on the spare NVMe is stopped and unchanged since the failure. The exact load cut (1,000,002,769 records, t 62,876,498) is intact as the verified safety copy on the root NVMe. The native backup (110 GB on the spare NVMe) and the restored copy (111 GB on root) are retained until the orchestrator decides. [Evidence hashes](evidence/age-v01-bulk-c-measure.sha256)

## Predictions, written before the runs

### Seal (`measure-loaded`), written 2026-11-23 15:31 UTC

Safety copy 20–30 min with an identical inventory. `measure-loaded` 2.0–3.5 h: native backup 100–150 GB, backup 0.5–1.0 h, full verify 0.3–0.6 h, restore 0.5–1.0 h; seal cut above 1,000,002,769 records and t 62,876,498 with matching restore readback. Wrong if the backup exceeds 200 GB, verify reports missing or unreadable segments, the readback differs, or the run passes 4 h.

### 32 GiB cache arm, copied from the builder's document before launch

Pin `cdc72d4d5bd6cc1adecaaf9267a351173763d134`, document `prep1/AGED-CACHE.md` at `d6e62fbe7`. Expected duration about 33 min, cap 45 min. [Builder's document](https://github.com/OnboardedInc/Triplex-db-experiments/blob/d6e62fbe7/lab/experiments/EXP-DX1/prep1/AGED-CACHE.md)

At 430 million records the 32 GiB cache covered this tape: 0.04 late SQL reads per save outside index jobs and under 0.001 inside. DX-W1's model puts the covering cache at 74 GiB at one billion. 32 GiB is 43% of that. If the model holds, misses come back, but fewer than with 16 GiB at 430 million. The copy also starts PostgreSQL and the page cache cold on a database 1.5 times larger, so the first minute will be worse than Saturday's.

| At 1B, three cores, 32 GiB | 394 offered | 620 offered |
| --- | ---: | ---: |
| Late SQL reads/save outside index jobs (Saturday 430M: 0.043) | 0.45 (0.20–0.90) | 0.55 (0.25–1.0) |
| Late SQL reads/save inside index jobs (Saturday: 0.0006) | 0.80 (0.40–1.40) | 0.95 (0.45–1.6) |
| Late mean apply ms outside → inside (Saturday: 0.30 → 0.48) | 0.9 → 1.5 | 1.0 → 1.7 |
| First 60 s SQL reads/save (Saturday: 1.48 then 0.94) | 2.0 then 1.4 | warm after 394 |
| Stored/s whole / second half (Saturday: 394.00 / 393.95; 620.00 / 620.01) | 393 / 394, no expiries | 540 / 550 (460–620), expiries likely |
| Second-half busy ACK p99 (Saturday: 521 ms; 709 ms) | 1,500 ms (300–6,000) | 8,000 ms (700–30,025) |
| Quiet loaded p99 (Saturday: 61.81 ms; 44.68 ms) | 75 ms (50–150) | 85 ms (50–200) |
| Quiet solo p99 (Saturday: 29.63 ms) | 35 ms | 35 ms |
| Peak transactor cgroup memory (Saturday: 51.2 GiB of 60) | 52–58 GiB | same |

**What would show the working-set model wrong:**

- **Too pessimistic.** Late reads stay at or below 0.10 per save outside jobs, 620 is stored in full, and second-half p99 at 394 stays under 1 s. Then 32 GiB still covers this tape at one billion. The writer's footprint tracks the people it touches, not total records, and the 74 GiB estimate is too high.
- **Too optimistic.** Late reads reach 1.0 per save or more outside jobs, Saturday's 16 GiB level at 430 million, while the heap has room. Then the misses do not scale like the model, or they do not come from the object cache: PostgreSQL buffers, the page cache or index-job rewrites. More cache would not be the fix.
- **Consistent with the model.** Anything between 0.2 and 0.9 outside jobs.

### Scorecard arms, copied from `v01/SERVER.md` at `8cc32d380`

Predicted duration per arm: a 176 GB scratch copy of about 3 min (the safety copy ran at about 1.2 GB/s), then about 20–35 min of arm time (the fresh card's four arms took 87 min in all). All four arms with copies: 1.5–2.5 h.

| Row | 1B prediction |
| --- | --- |
| P1 pinned reads | Same exactness. Higher tail latency and earlier goodput flattening if the larger persisted index displaces hot pages. |
| P2 commits | Low rates should be close to fresh. At 394 and 620 predict flat to 15% lower delivery for the same configuration and wider tails if larger indexes add SQL reads per save. That bound is an estimate, with no aged calibration behind it. |
| P3 ordered feed | Same exactness. The larger journal can make a cold open slower. Resuming near the same logical head should limit steady-state change after the peer is warm. |
| P4 current pulls | Warm current fields should stay closer to fresh than first pulls. More persisted pages can increase the first index fetch. |
| P5 Publish | NOT MEASURED. The held 1B cluster receives no Publish window here. [Publish campaign](https://github.com/OnboardedInc/Triplex-db-experiments/blob/530b88a6e9f7c9ca0593628bdbd7689707c87408/lab/experiments/EXP-DX1/bm1/HANDOFF.md#joined-publish-at-100000) |
| P6 quiet account | Expect higher solo and loaded p99 with a colder index. A higher solo denominator may lower the ratio without improving the loaded p99. The 1.25× bar remains unlikely at the busy rates. |
| P7 idle cost | Expect slower cold first pulls and more occupied pages at the same cap. The two snapshots leave the activity-matched memory slope open. |
| P8 paced import | Expect less spare capacity and a higher live tail from larger indexes and cache competition. Exact receipts and replay should agree. |
| P9 loss and move | NOT MEASURED. The scheduled two-server procedure will provide this evidence. [Failover procedure](https://github.com/OnboardedInc/Triplex-db-experiments/blob/a0c47480f/lab/experiments/EXP-DX1/hasync1/SCORECARD.md) |
| Journal, receipts and mixed IDs | Expect the same results after the AGE1 identity confirms the restored cut. This row is independent of the latency estimate. |
| Erasure and acknowledged-write loss | Both remain unmeasured by this campaign. |
