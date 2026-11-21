# Fair import with 32-fact frames

**Both modes are UNJUDGED.** The pinned build `52ad22640c863f101155d90a3d2b35f797904d23` verified the stopped PostgreSQL copy, the original cut 87,002 metadata and the separate WAL. Its private-bridge writer gate then exited 1 before any offers. [Builder forecast and method](https://github.com/OnboardedInc/Triplex-db-experiments/blob/52ad22640c863f101155d90a3d2b35f797904d23/lab/experiments/EXP-DX1/load1/FAIR-SERVER.md)

| Mode | Forecast verified facts/s | Forecast loaded quiet commit p99 | Observed | P8 |
| --- | ---: | ---: | --- | --- |
| Barrier 6 | 1,400–2,400 | 48–78 ms | No offers | UNJUDGED |
| Rolling 6 | 2,400–3,350 | 35–52 ms | No offers | UNJUDGED |

The held-copy runner chooses a `tx2-dxscale1-publish-*` slot and requests the ordered subject writer. The private-bridge writer allowlist accepts `tx2-dxscale1-v01-*` at that commit. I evaluated the original guard with the failed attempt's input: it refused that prefix and admitted the scorecard control prefix. The evaluation only ran the original conditional and started no service. DX-HA1 needs to admit the verified prepared-copy route while keeping the private bridge, writer and input checks. The campaign can then rerun on the replacement pin. [Producer prefix](https://github.com/OnboardedInc/Triplex-db-experiments/blob/52ad22640c863f101155d90a3d2b35f797904d23/lab/experiments/EXP-DX1/actv-lazy/join/held-server.ts#L52-L55) · [Refusing guard](https://github.com/OnboardedInc/Triplex-db-experiments/blob/52ad22640c863f101155d90a3d2b35f797904d23/lab/experiments/EXP-DX1/stack/up.sh#L242-L253)

Scoped cleanup found no containers, volumes or networks. Both prepared directories and the failed result remain on the bench. The Mac directory `evidence/DX-BM1/bench3/bench3-fair-import` holds the 46,152-byte compressed summary and verified archive members, build receipt, physical input, launcher log, exact-guard replay and cleanup. No comparison file or raw timing data was produced. Cache32 started at 12:24:46 EST. [Checksums](SHA256SUMS)
