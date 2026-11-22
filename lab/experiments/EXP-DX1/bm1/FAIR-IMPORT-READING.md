# Fair import with 32-fact frames

## Rerun on INT1 `8ab832093`, November 21 at 23:29 UTC

**Both modes ran with every offer stored. Neither meets the P8 bar.** The bar is 3,000 verified facts/s, with each live account's read and save p99 within 1.5× of its matched baseline. Rolling 6 imported 2,941.23 facts/s, close to the bar, at twice the barrier 6 rate. In both modes, saves on the busy accounts and the quiet account broke the 1.5× ratio, while reads stayed within 1.37×. The launch dry run (DX-HA1 `ha1/launch-dry-run.sh`) returned ADMITTED at the stack's first container create, and the same runner files then ran for real. One importer credit, 32-fact frames, a 300-second window, the one ten-account database, and a separate-WAL disposable copy of the held fresh copy.

| Mode | Verified facts/s, forecast → measured (first half / second half) | Quiet save p99 ms loaded / baseline, forecast | Quiet save ratio | Busy accounts' save p99 ms loaded / baseline | Worst read ratio | P8 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Barrier 6 | 1,400–2,400 → 1,436.37 (1,370.67 / 1,502.08) | 58.01 / 23.77, forecast 48–78 | 2.44× | 853–859 / 42–49, 17.6–20.3× | 1.37× | Not met |
| Rolling 6 | 2,400–3,350 → 2,941.23 (3,120.00 / 2,762.45) | 50.24 / 30.96, forecast 35–52 | 1.62× | 319–331 / 466–477, 0.67–0.70× whole | 1.14× whole, 1.27× second half | Not met |

**Rolling 6's whole-window save ratio of about 0.68× hides a second-half regression.** Its baseline's first half had its own cold-start tail of about 550 ms. In the second half, with that tail gone, the baselines were 11.6–14.4 ms and the loaded saves 281.6–289.5 ms, about 22×. In the first half the importer reached 3,120 facts/s, above the bar. Quiet saves missed the owner's 50 ms limit by 0.24 ms over the whole window. Every account stored every offered save in both modes: 1,050 of 1,050 quiet saves, and 7,833 or 7,834 per busy account. The quiet account's solo saves had p99 9.13 ms (barrier) and 20.45 ms (rolling).

My pre-launch expectation of about 2,800 facts/s with quiet p99 near 50 ms held; its falsifiers were above 3,350/s with tails inside 1.5×, or under 2,000/s. The import competes with ordinary saves on the transactor. The 32 GiB cache, which removed late SQL reads in the writer arms today, was not used here. It is the obvious next arm for this item. The Mac copy is at `evidence/DX-BM1/bench3/bench3-fair-import`: a 3,405,142-byte summary and a 97,506,618-byte raw archive, checked member by member. The refused morning attempt's evidence moved to `evidence/DX-BM1/bench3/bench3-fair-import-refused-52ad`. Rental cost about USD 10.77 at 00:06 UTC. [Checksums](SHA256SUMS)

## First attempt at `52ad22640`, refused

**Both modes are UNJUDGED.** The pinned build `52ad22640c863f101155d90a3d2b35f797904d23` verified the stopped PostgreSQL copy, the original cut 87,002 metadata and the separate WAL. Its private-bridge writer gate then exited 1 before any offers. [Builder forecast and method](https://github.com/OnboardedInc/Triplex-db-experiments/blob/52ad22640c863f101155d90a3d2b35f797904d23/lab/experiments/EXP-DX1/load1/FAIR-SERVER.md)

| Mode | Forecast verified facts/s | Forecast loaded quiet commit p99 | Observed | P8 |
| --- | ---: | ---: | --- | --- |
| Barrier 6 | 1,400–2,400 | 48–78 ms | No offers | UNJUDGED |
| Rolling 6 | 2,400–3,350 | 35–52 ms | No offers | UNJUDGED |

The held-copy runner chooses a `tx2-dxscale1-publish-*` slot and requests the ordered subject writer. The private-bridge writer allowlist accepts `tx2-dxscale1-v01-*` at that commit. I evaluated the original guard with the failed attempt's input: it refused that prefix and admitted the scorecard control prefix. The evaluation only ran the original conditional and started no service. DX-HA1 needs to admit the verified prepared-copy route while keeping the private bridge, writer and input checks. The campaign can then rerun on the replacement pin. [Producer prefix](https://github.com/OnboardedInc/Triplex-db-experiments/blob/52ad22640c863f101155d90a3d2b35f797904d23/lab/experiments/EXP-DX1/actv-lazy/join/held-server.ts#L52-L55) · [Refusing guard](https://github.com/OnboardedInc/Triplex-db-experiments/blob/52ad22640c863f101155d90a3d2b35f797904d23/lab/experiments/EXP-DX1/stack/up.sh#L242-L253)

Scoped cleanup found no containers, volumes or networks. Both prepared directories and the failed result remain on the bench. The Mac directory `evidence/DX-BM1/bench3/bench3-fair-import` holds the 46,152-byte compressed summary and verified archive members, build receipt, physical input, launcher log, exact-guard replay and cleanup. No comparison file or raw timing data was produced. Cache32 started at 12:24:46 EST. [Checksums](SHA256SUMS)
