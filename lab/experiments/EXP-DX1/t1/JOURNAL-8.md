North star: P1 writer isolation and P2 tail latency, with exact values, durable acknowledgement and the frozen trace unchanged. Source 15ed6516, one measurement lease, summary tracing, 10,000 subjects, 450-second diagnostic with normal 45-second phases through 1024; split rule `pending`, delta broadcasts, current storage layout and CPU placement. All three loaded arms DONE/oracle PASS, zero read errors/violations. Zero references are DONE with model checks; their independent oracle is explicitly NOT-RUN.

| heap / journal / heap | opening | candidate | closing |
| --- | --- | --- | --- |
| primary p50 / p99 ms | 12.589 / 58.793 | 11.939 / 47.919 | 12.456 / 48.316 |
| >50-ms primary count / summed wall ms | 56 / 3676.752 | 31 / 2063.112 | 33 / 2158.083 |
| writer ratios L256 / L1024, own-mode zero | 2.548 / .538 | .783 / 2.521 | 4.361 / .852 |
| GC count / total observed ms / maximum ms | 761 / 2342.270 / 131.677 | 627 / 1557.031 / 42.847 | 756 / 2275.625 / 87.900 |
| GC >50 ms count / total ms | 2 / 192.770 | 0 / 0 | 2 / 165.726 |
| major / incremental / minor collections | 7 / 7 / 747 | 8 / 8 / 611 | 7 / 7 / 742 |
| heap used median / peak MiB | 498.3 / 557.9 | 301.5 / 419.1 | 498.4 / 582.8 |
| scheduler-late >50 ms intervals / sum ms | 0 / 0 | 0 / 0 | 2 / 134.990 |
| swap GiB median | 4.530 | 4.234 | 4.234 |
| Mac non-VM CPU median / p99 % | 12.3 / 128.4 | 10.6 / 106.1 | 9.8 / 90.4 |
| L256 small-band commit p50 / p99 ms | 10.111 / 69.534 | 10.879 / 33.164 | 12.479 / 119.005 |

Controls are both heap bookends in this table; no historical off value substitutes for them. Primary median saving .584 ms exceeds .133-ms drift. Primary p99 saving 5.635 ms does not exceed 10.477-ms drift, although this candidate is individually below 50 ms. L256 ratio improves beyond drift, but the targeted L1024 ratio worsens to 2.521 (bar 2) while both controls are below 1. Journal remains opt-in: this is not evidence of a fixed stress tail. GC durations and scheduler intervals can overlap and are not exclusive CPU time. The closing lateness is one union episode / 69.780 ms, not two independent machine stalls.

The frozen complete writer populations, source/build/configuration readbacks, each mode's fresh zero-reference hashes, automatic WRITER-STATS.json, original oracle/model/archive receipts and host samples are under `~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p8-model-a-*/`; session MEASUREMENTS.md/JSON validates the actual source, inputs, settings, ratios and measured clock windows. The 1,000-subject preceding smoke has 6,208,215 correct reads, zero errors/violations and fresh oracle PASS (130 commands, 31 reads, 2,089 entity queries). No full-pair performance promotion follows from this focused diagnostic.
