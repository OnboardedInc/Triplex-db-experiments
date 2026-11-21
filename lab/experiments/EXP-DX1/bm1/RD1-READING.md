# Reads ladder from prepared copies, bench 3

RD1 `ca93f5165` (`rd1/FULLSIZE-SERVER.md`) ran in the one ten-account database with rolling 6 credits. **The control ladder ran fully, but the tuned ladder was refused, so the comparison is UNJUDGED.**

## What happened

The control ladder started from a fresh private copy at 19:32:06 UTC. Its stack came up on cores 0–8 while `bench3-affinity.sh` kept the driver on all CPUs, and the driver went back to 9,10 at 19:32:16 ([why](HANDOFF.md)). Both rates ran, and `cleanup/inventory.json` was written at 19:40:06. `scorecard.mjs` printed "The control ladder is complete", but `ladders/control-complete.json` was never written. That seal is written by `prepared.complete(...)` at `v01/adopted-server.ts` line 127, after the arm loop. The tuned invocation then stopped at `rd1/prepared.ts` line 32 with "The control ladder has not completed". The child exited 0 and the log shows no exception.

One likely cause for the builder to check: `slot`, `attempt` and `systemIdentifier` are declared inside the `for (const loaded ...)` loop, at lines 62–66, but line 127 uses them after the loop. The gateway also printed "Triplex trace output failed; evidence incomplete" 80 times (`gateway/trace.clj` line 51). Startup from the copy to the verified seed took under 5 minutes, so that falsifier did not trigger. **The RD1 builder must fix the seal.** A retry then needs about 35 minutes: two copies and two ladders.

## Control ladder, unsealed, for the builders

Each cell is closed-loop read p99 in ms / exact completed reads per second, with no read errors in any cell. Save offers were 9,000 of 9,000 receipts at +50 and 42,300 of 42,300 at +235.

| Readers | Control +50, forecast | Control +50, measured | Control +235, forecast | Control +235, measured |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 6–15 / 520–700 | 13.9 / 404 | 8–25 / 420–650 | 5.5 / 543 |
| 4 | 45–80 / 530–760 | 58.4 / 558 | 55–120 / 430–700 | 59.6 / 583 |
| 16 | 75–140 / 520–880 | 96.8 / 596 | 90–180 / 430–730 | 113.2 / 497 |
| 64 | 135–230 / 1,100–1,700 | 161.8 / 1,482 | 150–300 / 800–1,500 | 152.6 / 1,351 |
| 256 | 740–1,050 / 750–1,050 | 860.2 / 902 | 850–1,350 / 620–950 | 737.3 / 1,338 |
| 1,024 | 1,900–3,000 / 425–650 | 2,654.2 / 473 | 2,200–3,800 / 350–580 | 3,768.3 / 422 |

Save p99 alongside the ladder was 29.44 ms at +50 and 27.65 ms at +235. Current pulls had p50/p99 of 4.51/50.43 ms at +50, against a forecast of 4–7 / 40–70, and 4.16/47.10 ms at +235, against 5–8 / 45–85. Every pull was available. Control matched its forecast in 21 of 24 cells; the misses are single-reader throughput at +50 and the 256-reader goodput at +235, which beat the forecast. The P1 bar of 100 ms is missed from 16 readers up in control, as expected without the treatment.

The Mac copy is at `evidence/DX-BM1/bench3/bench3-rd1`: a 4,352,969-byte summary and a 16,093,317-byte raw archive, checked against the transfer manifest. The earlier refused attempt is kept on the server under `queue/rd1/failed-cpu-1857`. Rental cost about USD 6.07 at 19:47 UTC. [Checksums](SHA256SUMS)
