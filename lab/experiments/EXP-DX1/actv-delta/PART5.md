# Publish among live saves

North star P5 with live P1 reads and P2 saves. The one-second definition is in `a619d4eb4:lab/TARGETS.md`. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md)

The joined comparison seeds 10,000 deep people and two 96-person neighbour scopes on one native stack. The target sees 3.5, 23.5 or 39.4 saves/s. Each neighbour sees 1.6/s. The 64 current reader seats each offer one read per second, matching the pace in the SCALE1 single-account study. Five seconds of ordinary traffic precede a 30-second save-only screen. The same writers and readers continue into the timed offers.

Each admitted block keeps 100 fixed offers at five-second or one-second spacing. Blocks alternate policy, giving each policy 200 scheduled offers per rate and cadence. A release is authored on ingress. If the prior Publish still owns the slot, the scheduled offer is a miss. The harness never puts it behind a previous Publish. Saves continue on the independent open-loop schedule. Save p99 uses scheduled offer to native ACK in both the save-only and Publish cohorts.

Save-only admission requires the offered ACK rate within a one-save boundary allowance or 1% of offers, whichever is larger. Backlog at the last checkpoint must stay within that allowance of the starting backlog. All saves due in the screen must have receipted ACKs by the one-second drain deadline. The reader driver must deliver at least 99% of the paced seats. A failed rate screen drops both cadences and both policies at that rate. A later failed screen can leave a partial arm without a measured percentile.

## Receipt audit

- The native runner binds source and build bytes to a fresh engine nonce and exclusive slot owner. CPU samples come from that same lease. The manager confirms volume removal and slot release.
- The screen grades fresh, monotonic scheduled and native ACK clocks by scope and verifies the exact due schedule and receipt identities after drain. Each joined save first verifies the complete native transaction through `Store.commit`. The test then checks the authored field values in its original receipt.
- The publication result reopens each native receipt and checks the document, predecessor, previous release and notice recipe. A skipped offer must have no native command. Python compares each recorded response at its actual cut from the independently authored seed and save tape.
- Each measured summary requires 200 scheduled offers and retains every miss. The four stage clocks add to the record endpoint per offer. A busy or elapsed slot remains in the p99 denominator. The rejected-rate summaries carry their save-only screen and no Publish latency.
