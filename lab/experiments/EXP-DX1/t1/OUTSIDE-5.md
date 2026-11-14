# Outside the transact HTTP call, X1

Source 3ff6db5a; tx2-dxt1-p5-defer-b-3-deferred; summary tracing; host swap 9.755 GiB; Mac non-VM CPU median/p99 44.3/208.1%; controls tx2-dxt1-p5-defer-b-{1,4}-baseline. Each quantile is computed on the exact per-request disjoint partition; quantiles are not additive. Native ACK content binding and trace coverage pass.

| Step | p50 ms | p99 ms | Owner | relative to measured finishedAt | Needed before product ACK |
| --- | ---: | ---: | --- | --- | --- |
| queueing | 0.754 | 20.635 | benchmark | before | offer scheduling, not product code |
| unmatched / continuation | 0.051 | 0.145 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: driver.execute | 0.035 | 0.432 | benchmark | before | no: benchmark validation/dispatch |
| benchmark command planning | 0.026 | 0.103 | benchmark | before | no: benchmark validation/dispatch |
| other named continuation: triplex.transact | 0.297 | 2.049 | product / HTTP continuation | before | yes: coherency of returned receipt |
| begin snapshot / claim / prefetch | 0.038 | 0.452 | product / HTTP continuation | before | yes: coherency of returned receipt |
| product validation / staging | 0.661 | 4.123 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: client.persist-and-resolve | 0.124 | 0.457 | product / HTTP continuation | before | yes: coherency of returned receipt |
| clock / ticket order | 0.005 | 0.179 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: client.transact | 0.044 | 0.124 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: client.transact-encode | 0.364 | 2.021 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: http POST /v1/db/{db}/transact | 0.055 | 0.164 | product / HTTP continuation | before | yes: coherency of returned receipt |
| receipt settlement / cache publication | 0.077 | 0.307 | product / HTTP continuation | before | yes: coherency of returned receipt |
| benchmark ACK / subject state | 0.038 | 0.168 | benchmark | before | no: benchmark validation/dispatch |
| expected-state bookkeeping | 0.356 | 2.024 | benchmark | before | no: benchmark validation/dispatch |
| read-your-own-write dispatch | 0.035 | 0.184 | benchmark | before | no: benchmark validation/dispatch |
| oracle command bookkeeping | 0.000 | 0.195 | benchmark | before | no: benchmark validation/dispatch |
| other named continuation: http POST /v1/db/{db}/release | 0.000 | 0.000 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: http POST /v2/db/{db}/command | 0.000 | 0.000 | product / HTTP continuation | before | yes: coherency of returned receipt |
| other named continuation: http POST /v2/db/{db}/journal | 0.000 | 0.000 | product / HTTP continuation | before | yes: coherency of returned receipt |

begin uses cached scope/claim/snapshot state in the warm path; it is not another HTTP round trip on each commit. A cold snapshot/prefetch may require a request, which stays visible. No fold is needed for the warm benchmark path.
The largest removable root work was the FULL-synchronous benchmark publication witness (about 1.1 ms in the insert control); only its clock capture remains before the receipt, and persistence/readback now follows the unchanged finishedAt. It is apparatus, not engine data durability. Expected-state and oracle data remain before finishedAt so this change cannot hide work by moving the latency timestamp. RYOW dispatch is benchmark apparatus; subsequent async reading does not block completion.
The native probe side-worker retains synchronous witness persistence; the primary writer uses the selected mode. Unknown/continuation residuals are retained explicitly.

Final completed zero-arm decomposition (separate context, not a bookended improvement claim): summary; swap 12.094 GiB (12.000-12.266); Mac non-VM CPU 49.7/227.4% median/p99; source 652984e9; opening off context as in VERDICT-5-INCOMPLETE.md. All steps below precede the measured finishedAt, except the deferred witness interval reported separately. Individual percentile columns are not additive.

| Outside step | p50 ms | p99 ms |
| --- | ---: | ---: |
| queueing | 0.767 | 29.563 |
| unmatched / continuation | 0.051 | 0.157 |
| other named continuation: driver.execute | 0.034 | 0.531 |
| benchmark command planning | 0.026 | 0.107 |
| other named continuation: triplex.transact | 0.309 | 1.964 |
| begin snapshot / claim / prefetch | 0.040 | 0.403 |
| product validation / staging | 0.685 | 4.110 |
| other named continuation: client.persist-and-resolve | 0.118 | 0.427 |
| other named continuation: client.transact | 0.074 | 0.265 |
| other named continuation: client.transact-encode | 0.395 | 2.034 |
| other named continuation: http POST /v1/db/{db}/transact | 0.058 | 0.172 |
| receipt settlement / cache publication | 0.132 | 0.577 |
| benchmark ACK / subject state | 0.040 | 0.197 |
| expected-state bookkeeping | 0.373 | 2.105 |
| read-your-own-write dispatch | 0.036 | 0.184 |
| oracle command bookkeeping | 0.000 | 0.181 |
| other named continuation: http POST /v1/db/{db}/release | 0.000 | 0.013 |
| other named continuation: http POST /v2/db/{db}/command | 0.000 | 0.011 |
| other named continuation: http POST /v2/db/{db}/journal | 0.000 | 0.010 |

Clock ticket wait is exactly zero by the exercised server-submission counters; omitted ticket spans are not used as proof. Publication capture has a root-parent span and can be assigned to its containing continuation by the exclusive-depth partition; its direct named-span histogram remains in raw tracing. Deferred durable witness p50/p99 storage 1.175/5.439 ms, after unchanged finishedAt; source capture to durable record 2.223/17.023 ms. This is apparatus; engine data was already durable and applied at acknowledgement.

Direct publication-capture spans: 7,408 matched primary operations; p50/p99 0.037/0.279 ms (full-zero summary context above). This marginal span may overlap its async containing continuation in the exclusive partition and is not additive to that partition. Source-bound offline root audit: p5-boundary-recorded-audit.log; no original raw bytes were rewritten.
