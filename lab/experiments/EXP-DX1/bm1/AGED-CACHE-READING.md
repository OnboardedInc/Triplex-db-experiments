# The 32 GiB cache arm on the one-billion aged cut, bench 4, November 23

## Repaired run at PREP1 `1bbaf54cd`: the one-billion cut holds 394 only with seconds-long tails, and 620 fails

**At one billion records the three-core 32 GiB arm stored 384.5 saves/s at 394 offered, with no expiries but a whole-window p99 of 22.2 s and a second-half p99 of 7.2 s.** At 620 offered it stored 380.8/s and 57,563 offers expired. Late SQL reads per save outside index jobs were 0.95 at 394 and 1.71 at 620. Saturday's 430-million-record cut read 0.043 per save. The working set no longer fits 32 GiB. Run from 18:47:52 to 19:16:39 UTC. Every offered save was accounted for (0 missing ACKs, 0 replans), and the aged live-head check passed: `seed-readback.json` was written before the first offer.

| At 1B, three cores, 32 GiB | Forecast 394 | Measured 394 | Forecast 620 | Measured 620 |
| --- | ---: | ---: | ---: | ---: |
| Late SQL reads/save outside index jobs (Saturday 430M: 0.043) | 0.45 (0.20–0.90) | **0.95** | 0.55 (0.25–1.0) | **1.71** |
| Late SQL reads/save inside index jobs | 0.80 (0.40–1.40) | 0.51 | 0.95 (0.45–1.6) | 0.96 |
| Late mean apply ms outside → inside | 0.9 → 1.5 | 1.30 → 1.17 | 1.0 → 1.7 | 2.11 → 2.00 |
| First 60 s SQL reads/save, then 60–120 s | 2.0 then 1.4 | 1.95 then 0.29 | warm after 394 | 2.26 then 1.60 |
| Stored/s whole / second half | 393 / 394, no expiries | **384.5 / 374.9**, 0 expired | 540 / 550 (460–620) | **380.8 / 411.1**, 57,563 expired |
| Busy ACK p50 / p99, whole | | 38 ms / **22,154 ms** | | 29,959 / 30,028 ms (deadline) |
| Second-half busy ACK p99 | 1,500 ms (300–6,000) | **7,235 ms** | 8,000 ms (700–30,025) | 30,027 ms |
| First-half busy ACK p50 | | 4,208 ms | | 29,949 ms |
| Quiet loaded p99 (whole) | 75 ms (50–150) | 72.0 ms (second half 105.8) | 85 ms (50–200) | 58.6 ms |
| Quiet solo p99 | 35 ms | 29.2 ms | 35 ms | 20.7 ms |
| Peak transactor cgroup memory | 52–58 GiB of 60 | 53.1 GiB (anon 4.8, file 48.1) | same | same run |

**Against the falsifiers.** At 394, reads outside jobs (0.95) sit just under the "too optimistic" line of 1.0 and above the model's 0.2–0.9 band. At 620 they are 1.71, so **the "too optimistic" falsifier fired.** Misses grow faster with the database than the 74 GiB working-set model allows, or they come from somewhere other than the object cache, while the transactor cgroup still had about 7 GiB of headroom. The second-half p99 at 394 (7.2 s) is above the forecast range. The first half (p50 4.2 s) carries the cold start of a 176 GB copy. The document's own next step applies: no cache that fits this server reaches the estimate, and **the small owner head is the better lever than a bigger cache.**

**Autovacuum and WAL.** No autovacuum worker ran during the arm: 141 samples of `pg_stat_activity` every 10 s, and no `automatic vacuum` line in `postgres.log`. The aged cluster was started and vacuumed during the seal on server 2. WAL grew 6.41 GB over 1,410 s (about 4.5 MB/s on average), about 7 MB/s in the 394 loaded window.

**The collector refused the aged seed after the windows, and one line was changed to read it.** `prep1/server-collect.py` line 281 at `1bbaf54cd` asserts the seed head is 87,002, the fresh cut. The aged head is 28,309,866, so `server.sh` failed after `complete.json` and left `summary.tmp`. The summary was then produced by the pinned collector with only that one line changed, to accept the seed's own head when `seed.aged` is set. The diff is kept beside it as `summary-collector-repair.diff`. Every other check in the collector ran unchanged, including all raw-file digests, the seal and the copy binding. The late-read figures come from PREP1's `read_delays` at the analyser pin, run directly, because `checked_checkpoint` asserts the fresh seed too. **The PREP1 builder should take the aged head in both places.**

Evidence: `evidence/DX-BM1/bench4/bench4-cache32-aged-r/` on the Mac (summary 6,993,845 bytes, raw 51,746,182 bytes), with `pg-sampler.log`, `postgres.log`, `prep1-gc-tx.log` and the traces.

## First run at PREP1 `cdc72d4d5`: refused before the first offer

**Refused before the first offer, at the live-head check.** PREP1 `cdc72d4d5` (`prep1/AGED-CACHE.md` at `d6e62fbe7`), launched at 18:06:59 UTC, stopped at 18:12:03 UTC. No offer was made, so none of the predictions can be judged. [Predictions](PREDICTIONS.md#bench-4-2026-11-23)

## Where it stopped

`prep1/ceiling-seed.ts` line 217 (`scalePredecessors`, aged branch) decodes the journal of the newest transaction at the aged head. That is AGE1's last replayed save at position 28,309,866. `packages/datomic/src/rowText.ts` line 125 throws `TypeError: Journal position payload must be null`.

The SDK decoder requires a modern-format `:_tx/position` row to carry no `value_number`, because it fills the value from `recorded_position`. AGE1's bulk loader writes a non-null payload in that row. **The PREP1 or AGE1 builder must fix this.** Either the aged check decodes AGE1's journal rows with the format AGE1 wrote, or AGE1's rows are shown to be a different, valid encoding. This is the live-head step (step 3 of the aged checks) that `AGED-CACHE.md` marked as never run on a live gateway.

## What passed before it

- **Receiver checks.** The re-pushed held cluster matched server 2's stopped inventory on bench 4: 1,642 files, 176,078,670,513 bytes, control `537ac161…`, tree `115999f1…`. `aged-scorecard.json` `faab1bc5…`, `sealed.json` `74b8f7de…` and both SCALE1 pins also matched.
- **Launcher checks.** The handoff digest and content checks, and the seed adoption (`seed.json` at head 28,309,866, `SEAL.sha256`, `plan.json`), were written by `server.sh` and the producer.
- **Stack.** The arm's copy and stack started. The cell directory has `start.log`, `launch-profile.json`, `pg-settings.json` and the counter files.

The cleanup removed the owned stack and its WAL directory. One empty anonymous volume left by the arm was removed by hand.

## Evidence

`evidence/DX-BM1/bench4/bench4-cache32-aged/` on the Mac (`TRANSFER.json`, `summary.tar.zst`, checked member by member at collection).

Running cost of bench 4 at 14:25 EST: about USD 3.90 (USD 1.09/hour from 15:47 UTC).
