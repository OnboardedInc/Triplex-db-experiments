# Publish at 100,000 on bench 4, November 23

## Small release, INT1 `4e64e0d97` (seed-frame repair `22db6e3ec`)

**The repaired seed check held. The first release reached its first correct answer in 133 ms, its values were stored in 14.5 minutes and its notices recorded in 19.2 minutes. One Publish window (barrier 6 at 3.5 saves/s) answered 20 of 20 inside one second.** The run then stopped in the next Publish window, at a read-basis assertion. The first-offer pass was ADMITTED and stopped before its first offer at `held-campaign.ts:429`, past the seed-frame check at line 215. The measured run went from 23:10:12 to 23:40:44 UTC on a fresh verified copy of the template with WAL on the second NVMe. [Predictions](PREDICTIONS.md#bench-4-2026-11-23)

| Measure | Forecast | Measured |
| --- | --- | ---: |
| First release: first correct answer | | 133 ms (cold) |
| First release: concrete values stored | 16–40 min | **14.5 min** (872.8 s), 955,902 changes over 100,000 people |
| First release: notices recorded | 20–45 min | **19.2 min** (1,154.0 s), 14,300 entries in 3,575 batches |
| Barrier 6 at 3.5/s: first-correct p50 / p99 | 25–70 / 60–180 ms | **31.6 / 93.8 ms** |
| Barrier 6 at 3.5/s: within one second | 20/20 | **20/20**, 0 missed deadlines |
| Barrier 6 at 3.5/s: Publish durability p50 / p99 | | 17.8 / 70.4 ms; gate hold p99 71.4 ms |
| Live saves during the Publish window (control window) | | 3.50/s stored, p99 13.5 ms (13.6), 0 pending after 1 s, 0 expired |
| Live pinned reads during the Publish window (control window) | | p50 1.69 / p99 6.3 ms (2.13 / 27.3), 3,840 of 3,840 |
| Rolling 6 at 3.5/s control | | saves p99 5.6 ms; reads p50 1.44 / p99 3.2 ms |

The background writing therefore ran at about 1,095 value changes per second (955,902 in 872.8 s) and about 12.4 notice entries per second (14,300 in 1,154 s). During that time the Publish account and its neighbours kept saving and reading: the control windows above ran after it.

**Where it stopped.** In the rolling 6 Publish window at 3.5/s, `actv-lazy/join/held-campaign.ts` line 417 (`verifyRead`, called from line 626 inside `runHeld` line 655) failed: `assert(b.tx >= r.position && b.validTime === validTime)`. A probe's answer carried a basis before the Publish it was checked against, or a different valid time. Because the runner stops at the assertion, the remaining windows (23.5 and 39.4 saves/s in both modes) did not run, and their forecasts are unjudged. **For the ACT1 builder:** find out whether the read gateway served a basis older than the acknowledged release, which would be a real stale answer, or whether the probe is paired with the wrong release. The deadline reads of the completed Publish window all matched.

**Autovacuum ran during the run** (158 of 162 samples, 1,109 MB of WAL in 27 minutes): this was the copy's first vacuum.

Evidence: `evidence/DX-BM1/bench4/bench4-publish100k/` on the Mac.
