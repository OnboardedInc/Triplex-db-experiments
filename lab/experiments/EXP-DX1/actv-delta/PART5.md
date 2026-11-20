# Publish among live saves

North star P5 with live P1 reads and P2 saves. The one-second definition is in `a619d4eb4:lab/TARGETS.md`. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md)

The joined comparison seeds 10,000 deep people and two 96-person neighbour scopes on one native stack. The target sees 3.5, 23.5 or 39.4 saves/s. Each neighbour sees 1.6/s. The 64 current reader seats each offer one read per second, matching the pace in the SCALE1 single-account study. Five seconds of ordinary traffic precede a 30-second save-only screen. The same writers and readers continue into the timed offers.

Each admitted block keeps 100 fixed offers at five-second or one-second spacing. Blocks alternate policy, giving each policy 200 scheduled offers per rate and cadence. A release is authored on ingress. If the prior Publish still owns the slot, the scheduled offer is a miss. The harness never puts it behind a previous Publish. Saves continue on the independent open-loop schedule. Save p99 uses scheduled offer to native ACK in both the save-only and Publish cohorts.

Save-only admission requires the offered ACK rate within a one-save boundary allowance or 1% of offers, whichever is larger. Backlog at the last checkpoint must stay within that allowance of the starting backlog. All saves due in the screen must have receipted ACKs by the one-second drain deadline. The reader driver must deliver at least 99% of the paced seats. A failed rate screen drops both cadences and both policies at that rate. A later failed screen can leave a partial arm without a measured percentile.

The first run kept advancing one account through the whole matrix. The third block started with more than 200 earlier releases, missed 28 releases, and the next save-only check failed at 3.5/s. This establishes a capacity change during the run. It leaves release history and runtime pressure confounded. The matched rerun starts every block at the same independently checked R1 cut and reuses the same save tape geometry. The new timed release is still authored at its offer.

## Receipt audit

- The native runner binds source and build bytes to a fresh engine nonce and exclusive slot owner. CPU samples come from that same lease. The manager confirms volume removal and slot release.
- The matched reset verifies the checksum of the one private seed image and its exact slot ownership before restoring. Both Datomic roles stop for the restore. Each block reopens all three exact R1 receipts, source cuts and roster identities on freshly opened clients. The image contains ordinary R1 seed data. It lives in the private container and is removed with it.
- The screen grades fresh, monotonic scheduled and native ACK clocks by scope and verifies the exact due schedule and receipt identities after drain. Each joined save first verifies the complete native transaction through `Store.commit`. The test then checks the authored field values in its original receipt.
- The publication result reopens each native receipt and checks the document, predecessor, previous release and notice recipe. A skipped offer must have no native command. Python compares each recorded response at its actual cut from the independently authored seed and save tape.
- Each measured summary requires 200 scheduled offers and retains every miss. The four stage clocks add to the record endpoint per offer. A busy or elapsed slot remains in the p99 denominator. The rejected-rate summaries carry their save-only screen and no Publish latency.
- The independent order gate seeds an eight-person scope in this slot. It binds the new release and old source cut to saves on both sides, compares both cuts with Python, and checks the complete receipt on replay. A second schedule holds Publish's native turn before offering the save. The externally raced command must stop at three conflicts and leave no receipt.

## The latency law and bare-metal forecast

Use one clock from scheduled offer to completion. Let `q` be scheduled offer to admitted turn, `t` admitted turn to native ACK, `l` ACK to the first matching reader's release controls, and `r` release controls to that response. The record endpoint is `q + t + l + r`. Charging reader work only after the ACK when the two overlap makes this equal to `max(native ACK, first exact response) - scheduled offer`. The transaction term includes source-cut lookup, planning and the native write. Busy slots still count as misses.

For save-only arrival rate `λ` and service time `S`, FIFO save load is `ρ = λ E[S]`. A stable FIFO with Poisson offers has the M/G/1 waiting distribution. A priority Publish can pass waiting saves, so the save term is the residual of the one active save. At an independent arrival its unconditional tail is `P(wait > x) = λ E[(S - x)+]`. Both models require headroom. An already submitted native job from another scope, scheduler stalls or a previous Publish contribute additional delay.

The 100,000-person inputs are the 64-seat single-account rows in `a37ad6097:lab/experiments/EXP-DX1/scale1/DECISION-RESULTS.md`, source `0ac9404095`. The forecast fits a lognormal to the stated save median and p99 as a proxy for service. It computes the priority residual and samples the FIFO distribution with 512,000 fixed-seed draws. A fixed 120 ms covers the transaction and reader terms, with 60–170 ms as a sensitivity range from the earlier joined probes. These values describe a single isolated receipt Publish. They assume the end-to-end service of joined saves is comparable to the reported field-save service.

| Saves/s | SCALE1 save p50 / p99 (ms) | Fitted save load | Added mean save service before saturation (ms) | FIFO / priority queue p99 (ms) | Predicted FIFO / priority record p99 (ms) | Priority sensitivity (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| 3.5 | 11.26 / 74.24 | 0.055 | 270.1 | 25 / 24 | 145 / 144 | 84–194 |
| 23.5 | 3.57 / 34.05 | 0.134 | 36.8 | 23 / 20 | 143 / 140 | 80–190 |
| 39.4 | 3.34 / 46.85 | 0.251 | 19.0 | 64 / 49 | 184 / 169 | 109–219 |

The bare-metal writer rows measure field saves and pinned reads. Joined saves also do source and policy work. An extra 19 ms of mean service at the peak would exhaust the model's capacity. Separate neighbours and a one-second stream of offers can change the tail. The forecast covers the record and first exact response, with literal stored output and individually recorded notices using their own clocks.

## Joined handoff

DX-ACT1 can merge `bc01028b0`, whose base includes the complete joined candidate `541326043` and the shared-geography change `48f557594`. The priority implementation is `9895f926b`, with the queued observer fix in `eb08bd32f`. The two ingress orders were verified natively at `bc01028b0` with reviewed WFIX1 `882df5487`. A save at 12 preceded Publish at 13 with cut 12. The waiting save committed at 14. Holding Publish first then committed at 15 with cut 14 and put the later save at 16. Python matched both cuts in each order. The external contender still stopped at three conflicts.

The `--one-seed` server path already shares one priority admission instance between the writer and receipt Publish and defers physical save planning to the admitted turn. For other joined entry points, use that same wiring. The original settlement runner has its own producer loop. It must share the scope's admission instance before its timings describe this priority treatment. The gate and this run exercised the joined account and its oracle, without running the server command.

DELTA's two-step fence, helping reader, compact mirror and old server campaign are historical experiments. Keep their reproducers for their evidence. Joined already consumes the declaration compiler and posting codec in `actv-delta/rules.ts` and `index-patch.ts`. Joined also reuses the audited deadline checker. Keep those single shared implementations at their current paths while the selector fingerprints those paths and bytes. The BM1 compatibility collector and DELTA WAL price remain historical qualifications. A future joined WAL claim needs a matched write-price run. No DELTA publication runtime needs to be ported.
