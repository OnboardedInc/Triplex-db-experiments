Historical steadiness diagnosis from original sealed F and H bytes. No fresh run verdict; overlapping coarse I/O is not a cause attribution.

F has 33 ACKs over 100 ms plus two unioned scheduler episodes (149.451 and 124.903 ms); H has 15 ACKs plus one 103.340-ms episode. Rows below can overlap the same commits. Guest windows include the preceding five seconds and request/episode; Mac per-stall joins are unqualified because no monotonic host/guest bridge was recorded. Whole-arm Mac swap-out page deltas are zero for both. F has 35 guest epoch steps, approximately -100 to -131 ms; H has none.

| Pair / kind | Trace (episode first trace) | ACK / episode ms | Guest window s | Driver MB | PG MB | Residual MB | Disk flushes / total ms | Guest clock-step overlaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F / ACK | `6da2db1f2b98870a0000000000000433` | 164.111 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000435` | 159.984 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000432` | 177.714 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000436` | 150.835 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000439` | 107.288 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000434` | 186.676 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000043a` | 116.402 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000437` | 166.767 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000000438` | 176.013 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000043b` | 159.749 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000001e54` | 202.391 | 194.293–200.298 | 165.110 | 26.853 | 1.794 | 289 / 220 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000001f23` | 149.729 | 240.339–246.344 | 137.966 | 7.209 | 2.585 | 256 / 240 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002089` | 359.507 | 327.431–334.438 | 96.633 | 0.451 | 1.851 | 83 / 432 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000208a` | 131.387 | 328.432–334.438 | 47.071 | 0.426 | 1.573 | 76 / 371 | 0 |
| F / ACK | `6da2db1f2b98870a00000000000021cc` | 357.727 | 399.505–405.511 | 78.348 | 0.426 | 1.319 | 78 / 441 | 0 |
| F / ACK | `6da2db1f2b98870a00000000000021cd` | 354.840 | 399.505–405.511 | 78.348 | 0.426 | 1.319 | 78 / 441 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002327` | 768.870 | 476.583–483.590 | 69.411 | 0.778 | 1.757 | 104 / 157 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002328` | 734.211 | 476.583–483.590 | 69.411 | 0.778 | 1.757 | 104 / 157 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002329` | 625.666 | 476.583–483.590 | 69.411 | 0.778 | 1.757 | 104 / 157 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000232c` | 279.272 | 476.583–483.590 | 69.411 | 0.778 | 1.757 | 104 / 157 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000233f` | 594.172 | 479.586–485.592 | 37.462 | 1.212 | 1.204 | 110 / 83 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002342` | 101.115 | 479.586–485.592 | 37.462 | 1.212 | 1.204 | 110 / 83 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002417` | 602.659 | 526.633–533.641 | 68.059 | 0.754 | 2.556 | 107 / 155 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000241f` | 333.918 | 528.635–535.642 | 34.951 | 1.548 | 1.925 | 146 / 108 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002420` | 166.409 | 528.635–535.642 | 34.951 | 1.548 | 1.925 | 146 / 108 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002421` | 143.928 | 529.636–535.642 | 34.796 | 1.425 | 1.602 | 134 / 104 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000242a` | 476.606 | 529.636–536.643 | 35.197 | 1.761 | 1.855 | 167 / 108 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000242c` | 283.576 | 529.636–536.643 | 35.197 | 1.761 | 1.855 | 167 / 108 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002445` | 177.473 | 535.642–541.649 | 32.662 | 2.212 | 1.167 | 153 / 125 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002448` | 104.710 | 535.642–541.649 | 32.662 | 2.212 | 1.167 | 153 / 125 | 0 |
| F / ACK | `6da2db1f2b98870a000000000000244e` | 135.052 | 536.643–542.649 | 33.317 | 2.425 | 1.163 | 152 / 127 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002618` | 113.279 | 640.748–646.754 | 36.729 | 0.500 | 0.991 | 98 / 203 | 0 |
| F / ACK | `6da2db1f2b98870a0000000000002636` | 126.293 | 650.759–656.764 | 35.209 | 0.418 | 1.581 | 78 / 178 | 0 |
| F / scheduler | `6da2db1f2b98870a0000000000000432` | 149.451 | 117.210–123.217 | 47.088 | 6.603 | 11.923 | 1291 / 182 | 0 |
| F / scheduler | `6da2db1f2b98870a000000000000244e` | 124.903 | 536.643–542.649 | 33.317 | 2.425 | 1.163 | 152 / 127 | 0 |
| H / ACK | `23e84b7c0e963e180000000000001eeb` | 102.283 | 240.078–246.084 | 204.157 | 6.898 | 2.097 | 249 / 131 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000022f3` | 1280.004 | 476.346–483.352 | 35.328 | 0.901 | 2.482 | 110 / 42 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000022f5` | 934.152 | 476.346–483.352 | 35.328 | 0.901 | 2.482 | 110 / 42 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000022fe` | 761.944 | 478.347–485.355 | 35.561 | 1.122 | 1.966 | 115 / 41 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000022ff` | 262.592 | 479.348–485.355 | 35.500 | 1.106 | 1.778 | 109 / 40 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002309` | 669.463 | 480.349–486.355 | 69.132 | 1.303 | 1.700 | 112 / 62 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000023ea` | 138.557 | 529.399–535.405 | 36.848 | 1.016 | 1.921 | 126 / 36 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000023f0` | 206.506 | 530.400–536.406 | 37.102 | 1.229 | 2.191 | 130 / 36 | 0 |
| H / ACK | `23e84b7c0e963e1800000000000023f5` | 417.515 | 531.400–537.407 | 37.097 | 1.401 | 1.724 | 126 / 37 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002404` | 296.345 | 535.405–541.411 | 33.096 | 1.909 | 1.368 | 127 / 35 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002407` | 117.365 | 535.405–541.411 | 33.096 | 1.909 | 1.368 | 127 / 35 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002411` | 259.651 | 537.407–543.413 | 64.393 | 2.212 | 1.167 | 140 / 55 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002418` | 375.610 | 538.407–545.415 | 34.976 | 2.744 | 1.434 | 177 / 48 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002831` | 103.932 | 717.591–723.597 | 12.943 | 6.267 | 11.858 | 1359 / 189 | 0 |
| H / ACK | `23e84b7c0e963e180000000000002833` | 103.826 | 717.591–723.597 | 12.943 | 6.267 | 11.858 | 1359 / 189 | 0 |
| H / scheduler | `23e84b7c0e963e180000000000002407` | 103.340 | 535.405–541.411 | 33.096 | 1.909 | 1.368 | 127 / 35 | 0 |

Residual is an observed accounting remainder, not identified other writers. One-second device and cgroup deltas cannot order subsecond work or distinguish guest/host/SSD stalls. No data supports per-stall Mac swap claims.

Runtime qualification now keeps JFR tick durations, rejects discontinuous/unattested cross-process epoch overlays and unbridged Mac phase/request overlays; SQL-to-transaction correlation defaults to unqualified instead of choosing a nearest one-second wall offset. Collector-wide SQL/WAL totals remain collector-wide. Earlier wall-clock coincidences across the F steps are not causal evidence.

The separate-root-image WAL / discard-off experiment is owed and did not change the default. No disk sentinel, app shutdown, process demotion or keep-warm request was used. `lab/trace/steadiness.mjs` produces the machine table; original manifests, boot binding, resets and computation hashes are retained in `p12/steadiness-b.json`.
