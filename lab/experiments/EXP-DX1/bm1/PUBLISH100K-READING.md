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

## Large release (20 forms and 20 policies in one save), ACT3 `a54dfca31` on INT1 `61a794c1d`

**All twelve windows ran, and every Publish was answered correctly inside one second (120 of 120). The permanent record was 4 changes and 17,681–17,690 bytes per Publish, as forecast.** The run went from 23:41:45 UTC to 00:08:35 UTC on 24 November, on its own build (its base differs from the small release's) and a fresh verified copy. Its first-offer pass was ADMITTED at `held-campaign.ts:449`. The launcher completed with success. The runner skipped the first release's settlement, as designed for a large release, and the reopened reads matched. At this commit any probe answering before its Publish stops the run at `held-campaign.ts`, and the run did not stop: **no visibility failure occurred in any of the six Publish windows.**

| Publish window | First correct p50 / p99 | Within 1 s | Durability p50 / p99 | Gate hold p99 | All saves stored/s, p99 (control) | Neighbours' save p99 (control) | Read p99 (control) |
| --- | --- | ---: | --- | ---: | --- | --- | --- |
| Barrier 6, 3.5/s | 40.2 / 55.2 ms | 20/20 | 21.8 / 27.5 ms | 28.1 ms | 3.50, 9.8 ms (23.4) | — | 7.1 ms (17.9) |
| Rolling 6, 3.5/s | 32.1 / 71.3 ms | 20/20 | 19.4 / 28.2 ms | 29.1 ms | 3.50, 8.0 ms (8.5) | — | 3.6 ms (3.9) |
| Barrier 6, 23.5/s | 52.4 / 120.5 ms | 20/20 | 26.7 / 90.1 ms | 90.6 ms | 235.00, 27.2 ms (25.7) | 27.1 ms (25.6) | 5.8 ms (6.2) |
| Rolling 6, 23.5/s | 49.3 / 322.8 ms | 20/20 | 26.1 / 292.4 ms | 295.0 ms | 235.00, 28.1 ms (417.9) | 28.2 ms (424.6) | 7.6 ms (6.6) |
| Barrier 6, 39.4/s | 63.0 / 140.6 ms | 20/20 | 38.1 / 73.9 ms | 75.1 ms | 393.98, 101.2 ms (46.0) | 101.2 ms (46.0) | 24.2 ms (24.2) |
| Rolling 6, 39.4/s | 67.3 / 190.4 ms | 20/20 | 34.2 / 123.9 ms | 124.1 ms | 393.99, 611.6 ms (35.5) | 620.8 ms (36.6) | 22.5 ms (23.8) |

Every window had 0 missed deadlines, 0 pending after one second and 0 expired saves.

**Against the forecast.**

- **Record.** 17,681–17,690 B and 4 changes, inside 17.6–17.8 KB; the falsifier did not fire.
- **First answer against the small release at barrier 6, 3.5/s** (the one window both runs share): p50 40.2 against 31.6 ms (+8.6 ms, above the +1 to +6 forecast but under the 10 ms falsifier); p99 55.2 against 93.8 ms. Every window sits inside the small-release forecast ranges (rolling 6 at 23.5/s: p99 322.8 within 100–400 ms).
- **Within one second.** 20/20 everywhere, at or above the forecast's 18–20/20.
- **Live saves and reads.** Reads stayed within their controls everywhere. Saves did not at 39.4/s: the neighbours' save p99 was 2.2× (barrier 6) and 17× (rolling 6) the control. That is the save-backlog cost of a Publish at that rate. The small release's 39.4/s windows will show whether it comes from the large release.

Evidence: `evidence/DX-BM1/bench4/bench4-publish-large/` on the Mac.

## Small release, repaired runner (run 1), ACT3 `f5f8c09ff`: the windows left unjudged

**All eleven selected windows ran (five of them Publish windows, the rest control and quiet windows), all 100 Publishes were answered correctly inside one second, and no probe saw anything before its Publish: 0 visibility failures in 100 Publishes.** In every Publish, `probesBeforePublishVisible` was 0 and the read gateway's head lag right after the acknowledgement was 0. So the lag the owner asked about was 0 ms in this run. The stop seen earlier tonight (`held-campaign.ts:417`) is the only early probe observed across the three runs: at least 241 Publishes (the first small run's 20 barrier Publishes plus the failing one, the large release's 120, and these 100). The run used one build of `f5f8c09ff`, a fresh verified copy and `DX_ACT3_SETTLE=0`. It went from 00:08:51 to 00:35:58 UTC on 24 November and ended with a passing verdict (`visibilityFailures` and `readFailures` both empty). The permanent record was 4 changes and 5,289–5,296 B per Publish.

**Small (run 1) and large release side by side, per Publish window:**

| Window | Small: first correct p50 / p99, within 1 s, visibility failures | Large: first correct p50 / p99, within 1 s | Forecast (small) | Small: live save p99 (control), read p99 (control) |
| --- | --- | --- | --- | --- |
| Barrier 6, 3.5/s | 31.6 / 93.8 ms, 20/20 (first run) | 40.2 / 55.2 ms, 20/20 | 25–70 / 60–180, 20/20 | 13.5 (13.6), 6.3 (27.3) |
| Rolling 6, 3.5/s | 33.1 / 50.9 ms, 20/20, 0 | 32.1 / 71.3 ms, 20/20 | 25–70 / 60–180, 20/20 | 8.5 (9.2), 5.4 (5.2) |
| Barrier 6, 23.5/s | 35.9 / 159.1 ms, 20/20, 0 | 52.4 / 120.5 ms, 20/20 | 45–140 / 130–450, 19–20/20 | 40.1 (25.3), 9.5 (7.6) |
| Rolling 6, 23.5/s | 39.6 / 421.4 ms, 20/20, 0 | 49.3 / 322.8 ms, 20/20 | 40–120 / 100–400, 19–20/20 | 30.5 (219.6), 20.2 (5.7) |
| Barrier 6, 39.4/s | 45.3 / 132.8 ms, 20/20, 0 | 63.0 / 140.6 ms, 20/20 | 60–220 / 200–900, 18–20/20 | 276.0 (118.9), 23.6 (22.9) |
| Rolling 6, 39.4/s | 43.9 / 127.0 ms, 20/20, 0 | 67.3 / 190.4 ms, 20/20 | 55–180 / 160–800, 18–20/20 | 273.0 (165.4), 25.1 (21.4) |

**Against the forecasts.**

- **Small release.** Every first-correct figure is at or below its forecast range except rolling 6 at 23.5/s, whose p99 (421.4 ms) is just above the 100–400 ms range. Answers inside one second were 20/20 everywhere.
- **Large release against small, same window.** p50 is +16.5, +9.7, +17.7 and +23.4 ms at 23.5 and 39.4/s, and −1.0 ms at rolling 6 3.5/s. Three windows are above the 10 ms falsifier, so **the large-release falsifier "p50 more than 10 ms above the small release" fired at barrier 6 23.5, barrier 6 39.4 and rolling 6 39.4.** The p99s are mixed (−101 to +63 ms). The two runs used different builds and copies on the same machine, as the document allowed.
- **Within one second.** The large release answered 20/20 everywhere, the same as the small, so that falsifier did not fire.
- **Records.** The large release's record (17,681–17,690 B) is 3.3× the small release's (5,289–5,296 B), with 4 changes each.

**Live accounts during the Publish windows (small release, run 1).** Saves at 39.4/s ran at 2.3× (barrier) and 1.7× (rolling) the matched control's p99, and reads stayed within 1.2× of control. At rolling 6 23.5/s the control window itself had a 219.6 ms save p99. Against quiet, the read and commit ratios ran from 0.44× to 4.8× and from 0.93× to 10.9× (barrier 6 39.4 commit).

Evidence: `evidence/DX-BM1/bench4/bench4-publish-r1/` on the Mac.
