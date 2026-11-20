# Four-minute archive replay on the Mac

DX-TAIL1 provides the frozen archive decoder, workload match, barrier, exact-receipt checks, replay oracle, and stop/cleanup machinery. This branch reused those parts from revision 4ebff4dbc9d225f6a56abd23152185041eaae865 on the integrated runtime. The archive has 5,110 primary and 144 duplicate offers in the first 240 seconds. The four new arms use Serial throughout and the same archive and seed. Each restarts the three JVMs against its already seeded PostgreSQL volume before the driver releases the first archived offer. The harness's 12-second barrier is disclosed in restart timing. The Mac comparison prices pauses, allocation, index metrics and ratios under shared-host pressure. Its latency figures are specific to this machine.

| Historical DX-TAIL1 Serial C JVM | Count | Pause p50 / p95 / p99 / max, ms on shared Mac |
| --- | ---: | ---: |
| Transactor | 163 | 20.09 / 45.48 / 93.41 / 96.05 |
| Writer | 159 | 9.71 / 24.77 / 175.01 / 260.81 |
| Reader | 296 | 12.36 / 32.08 / 58.14 / 108.17 |

Historical Serial C finished with 5,110 exact ACKs and 48 matching oracle reads. Its ACK p50/p99 were 518/20,851 ms on the shared Mac, with sender queueing dominating the tail. Its writer estimate was 2.48 MiB per covered save across 4,952 saves, using rounded occupancy between collections. Four explicit index requests completed in 2.39–11.27 seconds on the shared Mac. Those durations include waiting for publication; Datomic's CreateEntireIndexMsec is separately aggregated by callback interval. Serial C did not restart the stack between seeding and accepting offers. It supplies context for the new trial, which measures restart-to-first verified ACK and where that time was spent.

A second analysis of the archived Serial C prefix used the same ACK windows and rounded GC occupancy for every role. Approximate between-GC heap growth on the shared Mac was transactor 5.98 MiB across 5,066 covered saves, writer 2.41 MiB across 5,100, and reader 4.96 MiB across 5,077, each per covered save. Live allocations, concurrent reclamation and background work limit the interpretation. The 1,150 saves overlapping an explicit index request had a shared-Mac p99 of 22,405 ms versus 17,327 ms in 3,960 outside the windows, a 1.29× ratio. The overlap includes scheduler delay and does not isolate causality. Two whole-minute metric buckets contained five Datomic index jobs totalling 30.0 seconds on the shared Mac. The historical analysis file is evidence/DX-JVM1/historical-control-analysis.json, SHA-256 2d03d010cf7395a1cf9e1cdeef976682f3f7a45ae2c3563453a684454de072e1.

Run from the built checkout with the lab Docker endpoint, the sealed SCALE1 raw archive, an image build receipt for a still-present image and a fresh child directory of durable DX-JVM1 evidence.

```sh
bash lab/experiments/EXP-DX1/jvm1/mac.sh "$ARCHIVE" "$IMAGE_RECEIPT" "$OUT"
```

The inventory and replay share the established heavy wrapper. A competing formal measurement lease holds off startup. The execution environment must expose the real host boot identity for the strict publication clock. The comparison retains each failed attempt and its cleanup instead of adopting a partial cohort.

Historical sources are DX-TAIL1 evidence mac-part2/03-serial-c-1/measurement.json (SHA-256 0a39c89b8d46be3783ab34ce54c4fa9308cd28522326817e4a39bd3a9eb444e6) and ns-report.json (SHA-256 d0a529446dd5f6da556263ef97f55bff75002842dd514106dd6d6cc8d399c8ec). [Historical Mac report](https://github.com/OnboardedInc/Triplex-db-experiments/blob/4ebff4dbc9d225f6a56abd23152185041eaae865/lab/experiments/EXP-DX1/tail1/MAC.md)
