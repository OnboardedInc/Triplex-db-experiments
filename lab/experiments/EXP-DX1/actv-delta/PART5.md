# Publish among live saves

North star P5 with live P1 reads and P2 saves. The one-second definition is in `a619d4eb4:lab/TARGETS.md`. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md)

The joined comparison seeds 10,000 deep people and two 96-person neighbour scopes on one native stack. The target sees 3.5, 23.5 or 39.4 saves/s. Each neighbour sees 1.6/s. The 64 current reader seats each offer one read per second, matching the pace in the SCALE1 single-account study. Five seconds of ordinary traffic precede a 30-second save-only screen. The same writers and readers continue into the timed offers.

Each admitted block keeps 100 fixed offers at five-second or one-second spacing. Blocks alternate policy, giving each policy 200 scheduled offers per rate and cadence. A release is authored on ingress. If the prior Publish still owns the slot, the scheduled offer is a miss. The harness never puts it behind a previous Publish. Saves continue on the independent open-loop schedule. Save p99 uses scheduled offer to native ACK in both the save-only and Publish cohorts.

Save-only admission requires the offered ACK rate within a one-save boundary allowance or 1% of offers, whichever is larger. Backlog at the last checkpoint must stay within that allowance of the starting backlog. All saves due in the screen must have receipted ACKs by the one-second drain deadline. The reader driver must deliver at least 99% of the paced seats. A failed rate screen drops both cadences and both policies at that rate. A later failed screen can leave a partial arm without a measured percentile.

The first run kept advancing one account through the whole matrix. The third block started after 200 earlier releases and missed 28 offers. The next save-only check at 3.5/s acknowledged 90 of 106 in the rated interval. Fifteen were still pending one second later. Release history and runtime pressure changed together. The matched rerun started every block at the same independently checked R1 cut, cold-reopened the native roles and reused the save tape geometry. The timed releases were authored at their offers, alternating R2 and R3 documents with fresh parameter values.

## Matched Mac results

The exclusive measurement lease held all four heavy tokens. This was the sole timed native stack. The Mac host still had other activity. At 3.5 saves/s all eight blocks met the save-only screen with no due save remaining at the drain deadline. Every block offered all 1,920 baseline reads, plus 32,000 traffic reads per five-second block or 6,400 per one-second block. The oracle verified 180,884 captured responses across the eight measured blocks and the two capacity screens. All 800 Publishes had native receipts and two deadline route probes. There were zero stale reads or retry conflicts. Each row contains two 100-offer blocks. Save p99 covers the target account and runs from scheduled offer to native ACK.

| Publish spacing | Policy | Record p50 / p99 / max (ms) | First exact read p50 / p99 / max (ms) | Misses | Save p99 without / with Publish (ms) | VM CPU stall without / with Publish |
| --- | --- | --- | --- | --- | --- | --- |
| 5 s | FIFO | 53.4 / 382.1 / 545.2 | 53.4 / 382.1 / 545.2 | 0/200 | 262.9 / 384.8 | 0.72–1.01% / 0.33–0.36% |
| 5 s | Priority | 65.1 / 373.0 / 457.7 | 65.1 / 373.0 / 457.7 | 0/200 | 324.3 / 460.9 | 0.65–0.67% / 0.37–0.44% |
| 1 s | FIFO | 65.7 / 403.0 / 541.5 | 65.7 / 403.0 / 541.5 | 0/200 | 278.9 / 421.1 | 0.69–0.80% / 0.61–0.66% |
| 1 s | Priority | 64.2 / 410.8 / 510.1 | 64.2 / 410.8 / 510.1 | 0/200 | 440.1 / 446.8 | 0.60–1.17% / 0.53–0.62% |

CPU stall is the share of sampled wall time with at least one runnable VM task waiting for CPU. It uses the kernel's `some` pressure counter. The 12-CPU host's one-minute load samples without / with Publish ranged from 10.29–10.95 / 10.23–10.98 for 5 s FIFO, 9.59–10.13 / 9.59–14.23 for 5 s priority, 10.87–12.81 / 11.45–15.88 for 1 s FIFO, and 10.14–11.47 / 10.14–11.47 for 1 s priority. The timed client's event-loop p99 ranged between 26.4 and 27.5 ms. The one-second arms had different save-only tails before any Publish. The repeatable result here is zero misses for either policy at the admitted save rate. The timings show no consistent end-to-end p99 reduction across both cadences.

The higher rates failed the save-only checks on fresh R1. Both completed all 1,920 scheduled baseline reader offers and both neighbours' saves kept up. The pending counts include overdue saves from the five-second settling interval. The reported save p99 includes the full scheduled cohort after the driver stopped offering and drained it. Both Publish cadences and both policies at those rates were dropped.

| Target saves/s | Target ACKs / due in 30 s | Queue at start → end | Pending after 1 s | Save p99 through drain | VM CPU stall | Host load |
| --- | --- | --- | --- | --- | --- | --- |
| 23.5 | 385 / 706 | 76 → 397 | 380 | 25.78 s | 1.99% | 12.54–13.45 |
| 39.4 | 421 / 1,182 | 148 → 909 | 891 | 56.11 s | 1.34% | 10.41–10.42 |

The isolated run used source `a52f7937c`. The evidence directory `DX-ACT2/part5` contains the failed-capacity first run `sparse-v1`, matched `sparse-v2`, both analysis files, the raw clocks, native receipt readbacks and cleanup. The matched regrader rechecks all scheduled denominators, every deadline read time, save grades and receipt positions against the timed tape. Fourteen focused tests and the joined TypeScript check also passed. [Checksums](PART5-SHA256SUMS)

## Receipt audit

- The native runner binds source and build bytes to a fresh engine nonce and exclusive slot owner. CPU samples come from that same lease. The manager confirms volume removal and slot release.
- The matched reset verifies the checksum of the one private seed image and its exact slot ownership before restoring. Both Datomic roles stop for the restore. Each block reopens all three exact R1 receipts, source cuts and roster identities on freshly opened clients. The image contains ordinary R1 seed data. It lives in the private container and is removed with it.
- The screen grades fresh, monotonic scheduled and native ACK clocks by scope and verifies the exact due schedule and receipt identities after drain. Each joined save first verifies the complete native transaction through `Store.commit`. The test then checks the authored field values in its original receipt.
- The publication result reopens each native receipt and checks the document, predecessor, previous release and notice recipe. A skipped offer must have no native command. Python compares each recorded response at its actual cut from the independently authored seed and save tape.
- Each measured summary requires 200 scheduled offers and retains every miss. The four stage clocks add to the record endpoint per offer. A busy or elapsed slot remains in the p99 denominator. The rejected-rate summaries carry their save-only screen and no Publish latency.
- The independent order gate seeds an eight-person scope in this slot. It binds the new release and old source cut to saves on both sides, compares both cuts with Python, and checks the complete receipt on replay. A second schedule holds Publish's native turn before offering the save. The externally raced command must stop at three conflicts and leave no receipt.

## The latency law and bare-metal forecast

Use one clock from scheduled offer to completion. Let `q` be scheduled offer to admitted turn, `t` admitted turn to native ACK, `l` ACK to the first matching reader's release controls, and `r` release controls to that response. The record endpoint is `q + t + l + r`. Charging reader work only after the ACK when the two overlap makes this equal to `max(native ACK, first exact response) - scheduled offer`. The transaction term includes source-cut lookup, planning and the native write. Busy slots still count as misses.

The observed stage p50 / p99 at 3.5 saves/s is below in milliseconds. Group percentiles of the summed per-offer clocks give the record times above. The higher rates supplied save-only observations and no Publish stage clocks.

| Publish spacing | Policy | To admitted turn | Transaction | Reader learns release | First response after learning |
| --- | --- | --- | --- | --- | --- |
| 5 s | FIFO | 1.1 / 265.2 | 34.6 / 97.3 | 7.7 / 17.6 | 7.6 / 30.0 |
| 5 s | Priority | 1.1 / 234.2 | 37.5 / 98.2 | 8.1 / 23.6 | 7.4 / 30.1 |
| 1 s | FIFO | 1.3 / 226.4 | 41.4 / 328.9 | 7.3 / 24.9 | 6.9 / 26.7 |
| 1 s | Priority | 1.4 / 285.8 | 40.7 / 332.8 | 7.8 / 23.5 | 7.2 / 26.1 |

Time charged to active saves at the account issuer explained almost all the wait for a turn. Its p99 was 264 ms FIFO and 234 ms with priority at five-second spacing, and 225 and 284 ms at one-second spacing. The issuer recorded under 0.05 ms p99 attributed to other Publishes or turn bookkeeping in each arm. The one-second arms also had roughly 330 ms at the p99 inside the admitted turn. Timing that interval includes the native service shared with both neighbours.

For save-only arrival rate `λ` and service time `S`, FIFO save load is `ρ = λ E[S]`. A stable FIFO with Poisson offers has the M/G/1 waiting distribution. A priority Publish can pass waiting saves, so the save term is the residual of the one active save. At an independent arrival its unconditional tail is `P(wait > x) = λ E[(S - x)+]`. Both models require headroom. An already submitted native job from another scope, scheduler stalls or a previous Publish contribute additional delay.

The 100,000-person inputs are the 64-seat single-account rows in `a37ad6097:lab/experiments/EXP-DX1/scale1/DECISION-RESULTS.md`, source `0ac9404095`. The forecast fits a lognormal to the stated save median and p99 as a proxy for service. It computes the priority residual and samples the FIFO distribution with 512,000 fixed-seed draws. A fixed 120 ms covers the transaction and reader terms, with 60–170 ms as a sensitivity range from the earlier joined probes. These values describe a single isolated receipt Publish. They assume the end-to-end service of joined saves is comparable to the reported field-save service.

| Saves/s | SCALE1 save p50 / p99 (ms) | Fitted save load | Added mean save service before saturation (ms) | FIFO / priority queue p99 (ms) | Predicted FIFO / priority record p99 (ms) | Priority sensitivity (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| 3.5 | 11.26 / 74.24 | 0.055 | 270.1 | 25 / 24 | 145 / 144 | 84–194 |
| 23.5 | 3.57 / 34.05 | 0.134 | 36.8 | 23 / 20 | 143 / 140 | 80–190 |
| 39.4 | 3.34 / 46.85 | 0.251 | 19.0 | 64 / 49 | 184 / 169 | 109–219 |

The bare-metal writer rows measure field saves and pinned reads. Joined saves also do source and policy work. An extra 19 ms of mean service at the peak would exhaust the model's capacity. Separate neighbours and a one-second stream of offers can change the tail. The forecast covers the record and first exact response, with literal stored output and individually recorded notices using their own clocks.

## Joined handoff

DX-ACT1 can merge `a52f7937c` for the complete study including matched R1 resets. The smallest merge for the priority path and native order gate is `bc01028b0`, whose base includes the complete joined candidate `541326043` and the shared-geography change `48f557594`. The priority implementation is `9895f926b`, with the queued observer fix in `eb08bd32f`. Both ingress orders were verified on that integration and again at `a52f7937c` with reviewed WFIX1 `882df5487`. The current upstream head checked at `46e838fe7` differs from the native test's joined base only in two Markdown files. A save at 12 preceded Publish at 13 with cut 12. The waiting save committed at 14. Holding Publish first then committed at 15 with cut 14 and put the later save at 16. Python matched both cuts in each order. The external contender stopped at three conflicts. `joined-upstream.json` binds the checked head and the current native order proof.

The `--one-seed` server path already shares one priority admission instance between the writer and receipt Publish and defers physical save planning to the admitted turn. For other joined entry points, use that same wiring. The original settlement runner has its own producer loop. It must share the scope's admission instance before its timings describe this priority treatment. The gate and this run exercised the joined account and its oracle, without running the server command.

DELTA's two-step fence, helping reader, compact mirror and old server campaign are historical experiments. Keep their reproducers for their evidence. Joined already consumes the declaration compiler and posting codec in `actv-delta/rules.ts` and `index-patch.ts`. Joined also reuses the audited deadline checker. Keep those single shared implementations at their current paths while the selector fingerprints those paths and bytes. The BM1 compatibility collector and DELTA WAL price remain historical qualifications. A future joined WAL claim needs a matched write-price run. No DELTA publication runtime needs to be ported.
