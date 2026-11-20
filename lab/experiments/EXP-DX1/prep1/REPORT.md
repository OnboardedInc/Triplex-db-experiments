Fair-turn follow-up source `5191435dc061a5abbed8f4e8f16abfa8174440aa`.
Run `DX_BARE_METAL=1 node lab/bin/heavy.mjs --label DX-PREP1-fair -- bash lab/experiments/EXP-DX1/prep1/server.sh fair "$OUT" 5191435dc061a5abbed8f4e8f16abfa8174440aa "$SEALED"`.
Use the original comparison's sealed campaign directory as `SEALED` and a new absolute directory as `OUT`.
Each of four runs starts from the same sealed database of ten accounts.
One and two write gateways each run the prepared writer with fair turns off and on.
Every run has a quiet account alone and beside nine neighbours at both 235 and 394 offered saves per second.
The command stops within an hour, including the time allowed for cleanup.
The original comparison passed native admission. Its timed rows are pending.

**North star.** Durable small saves and quiet-account tails under load, with exact stored history and the ordered feed. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

Use the same allocated native Linux host, pinned images, built workspace packages and physical CPU masks as the original command. The original seal is checked before use and each fresh arm validates the dump and reopens its cut. The order is off/on with one peer and on/off with two. Within a peer count both treatments see the same phase order. Two peers tie the four-peer capacity forecast and require fewer processes. Each 60-second quiet window has the same 210 offers. Loaded windows have 14,100 or 23,640 offers. The payloads and predecessors are prefixes of the sealed comparison tapes. Timing is lightly compressed per account where needed to finish the prefix within the window. Each arm has 830 seconds plus 20 seconds for forced exit, and the whole command has a 3,520-second deadline plus 40 seconds for forced exit.

**Follow-up forecasts.** Solo throughout is 3.5 saves/s, 1 save/append, p99 8.8 ms and ratio 1.00. Loaded p99 is unavailable for a cohort with missing acknowledgements. The one-credit forecast assumes an 8 ms mean submit-to-reply turn and therefore 125 saves/s with either peer count. These are predictions before the run.

| Peers and fair turns | Gross offers/s | Delivered/s | Saves/append | Worst-account p99 ms | Quiet p99 ms | Quiet / solo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 off | 235 | 235 | 1 | 27.48 | 10.47 | 1.19× |
| 1 off | 394 | 383 | 1 | unavailable | 10.74 | 1.22× |
| 1 on | 235 | 125 | 1 | unavailable | 22 | 2.50× |
| 1 on | 394 | 125 | 1 | unavailable | 25 | 2.84× |
| 2 on | 235 | 125 | 1 | unavailable | 22 | 2.50× |
| 2 on | 394 | 125 | 1 | unavailable | 25 | 2.84× |
| 2 off | 235 | 235 | 2 | 27.48 | 10.47 | 1.19× |
| 2 off | 394 | 394 | 2 | 28.00 | 10.74 | 1.22× |

**Original comparison.** Server source `7ca8525a9`. The corrected native admission matched 1,315 offers per writer. The original comparison has no fair-credit arm. [Server handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/da7eca837/lab/experiments/EXP-DX1/bm1/HANDOFF.md)

**Present writer baseline.** At 235 offered/s, JVM1 reported 138.6–188.5 saves/s across JVM settings over the offer window plus drain. Reopening the copied row clocks gives 143.5–196.6 saves/s inside the 60-second offer window, the denominator PREP1 uses. At 394 the corresponding ranges are 153.3–186.4 and 163.7–189.0. Separate JVM1 quiet-account windows were 215.0 and 358.1 gross offers/s and measured 8.56–20.48× and 7.23–21.54× solo p99. The re-read checks the published transfer manifest, pinned source, row counts and clock order. [Checksums](SHA256SUMS)

**Original forecasts, frozen before the run.** Cells are ordered 50 / 235 / 394 / 620 offered saves/s. Solo p99 is 10 ms for K and 8.8 ms for S. Above-capacity p99 projections assume a full queue. The measured complete-cohort tail is unavailable if any ACK is missing.

| Writer and peers | Delivered/s | Worst p99 ms | Quiet / solo | S saves/append |
| --- | --- | --- | --- | --- |
| K, any | 50 / 235 / 255 / 255 | 30 / 30 / 77,739 / 204,086 | 4.20 / 13.76 / 14.53 / 22.00 | |
| S, 1 | 50 / 235 / 383 / 383 | 27.34 / 27.48 / 4,122 / 88,244 | 1.11 / 1.19 / 1.22 / 1.26 | 1 |
| S, 2 or 4 | 50 / 235 / 394 / 620 | 27.34 / 27.48 / 28.00 / 28.36 | 1.11 / 1.19 / 1.22 / 1.26 | 2 |

**Readout.** Awaiting the first published timed arm. The next limit will come from paired offer-to-ACK, sender queue, native work, ready-to-append and durable append clocks. No capacity verdict from the Mac.

**Evidence audit.** The launcher verifies and rechecks the sealed bytes, binds the new plan to its commit, starts a fresh slot per arm, and waits for owned cleanup before publishing a summary. The producer reads back settings and the installed function on each gateway, verifies the restored cut, and checks receipt and stored journal content against each offer. The collector verifies those bindings, joins each receipt to the same-attempt native append, checks one append at most per one-credit turn, and retains raw hashes and pause logs. Six tests and strict TypeScript passed. The four source-bound fixtures joined 2,548 simulated saves to their append records and rejected a changed fair-credit setting. The follow-up used no physical server here. [Checksums](SHA256SUMS)

Part 5's [gated handoff](https://github.com/OnboardedInc/Triplex-db-experiments/blob/94b930a73/lab/experiments/EXP-DX1/prep1/REPORT.md) records the off/on writer gates, both original receipts after restart and all 13 erasure routes. No acceptance pins moved.
