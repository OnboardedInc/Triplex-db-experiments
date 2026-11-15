North star: reduce the P2 tail without losing P1. These are 450-second 10,000-subject diagnostics with normal 45-second phases, not full verdict pairs; strict clocks, local reads, split `pending`. Each row has fresh same-mode zero writer bytes; actual runtime/source/readbacks are revalidated in private `p8-runtime-validation.json`. All six loaded arms DONE/oracle PASS with zero errors/violations; zero references have model checks and oracle NOT-RUN.

| writer nursery 16 / 4 / 16 MiB, summary | opening | candidate | closing |
| --- | --- | --- | --- |
| primary p50 / p99 ms | 12.098 / 50.813 | 13.107 / 52.836 | 12.250 / 54.938 |
| >50-ms commits / summed wall ms | 39 / 2744.622 | 48 / 3087.250 | 53 / 3419.539 |
| GC count / total / max ms | 761 / 2199.257 / 83.616 | 2564 / 5806.993 / 68.807 | 757 / 2304.886 / 54.261 |
| major / incremental / minor | 7 / 7 / 747 | 7 / 7 / 2550 | 7 / 7 / 743 |
| heap used median MiB | 496.7 | 497.7 | 498.9 |
| writer ratios L256 / L1024 | 2.016 / 1.304 | 1.438 / 5.982 | 1.714 / 1.218 |
| L256 small p50 / p99 ms | 11.391 / 51.185 | 11.519 / 18.830 | 10.687 / 22.712 |
| L256 read p99 ms / correct pulls/s | 6.079 / 44210.7 | 6.111 / 44422.1 | 6.175 / 43844.3 |
| swap GiB / Mac non-VM CPU median, p99 % | 4.234 / 9.8,89.3 | 4.234 / 10.3,94.6 | 4.234 / 10.3,83.7 |

Reject 4 MiB: median increases .933 ms against .151-ms control drift, minor collections increase 3.4 times, major count stays seven. Workers retain the same measured 6144/16-MiB limits. Actual per-isolate limits and windows are required; the prior 1,000-subject smoke confirms writer new-space max 8 MiB versus workers 32 MiB. The old-space setting remains 6144 MiB; no old-space gain is claimed.

| transactor CPU 0 / 0,1 / 0; Postgres remains 1; full | opening | candidate | closing |
| --- | --- | --- | --- |
| primary p50 / p99 ms | 13.168 / 53.425 | 12.720 / 52.145 | 12.927 / 46.327 |
| writer ratios L256 / L1024 | 6.966 / 8.725 | .699 / 2.012 | .919 / 1.146 |
| L256 small p50 / p99 ms | 13.439 / 243.995 | 11.327 / 39.027 | 11.711 / 24.917 |
| L256 read p99 ms / correct pulls/s | 6.175 / 43504.7 | 6.335 / 42755.1 | 6.175 / 43286.4 |
| swap GiB / Mac non-VM CPU median, p99 % | 4.234 / 9.4,102.1 | 4.234 / 10.0,125.5 | 4.234 / 10.4,91.8 |

Reject shared Postgres core: .328-ms median saving only slightly exceeds .241-ms drift; p99 saving is absent (candidate 52.145 versus mean control 49.876, drift 7.098). Read goodput falls 1.5% against the control mean; no P1 improvement is established. Four reader/background cores remain available in every arm. Collector set is identically Node/gateway/transactor JFR/gateway JFR/Postgres, synchronous native file logs disabled. Source 37997257; full-level timings cannot be compared as cost claims against a summary session.

Raw writes, actual settings, oracle archives, native/JFR traces, host samples and unchanged automatic reports: private `DX-T1/tx2-dxt1-p8-young-a-*` and `tx2-dxt1-p8-shared-a-*`; source-bound session `MEASUREMENTS.md/json` names the controls. Runtime qualification was strengthened after recording and the exact recorded bytes passed; no timing was rerun or substituted.
