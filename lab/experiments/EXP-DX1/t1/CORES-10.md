# tx2-dxt1-p10-cores-b

Source d709fd769d271992b6a87841489c90665585e919; summary tracing; cores trial, one uninterrupted session. Authoritative offer-to-finish remains the verdict. ACK-only retains lateness; corrected also subtracts actual lateness and is diagnostic.

| arm | original p50/p99 ms | ACK-only p50/p99 | corrected p50/p99 | lateness p50/p99 ms | swap GiB | Mac CPU p50/p99 % | >50 burst/growth/sparse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tx2-dxt1-p10-cores-b-1-baseline-ladder | 11.879/46.313 | 11.260/45.567 | 10.925/43.953 | 0.002/6.431 | 4.080 | 15.600/114.600 | 10/0/15 |
| tx2-dxt1-p10-cores-b-2-candidate-ladder | 11.738/62.244 | 11.136/61.483 | 10.793/56.181 | 0.002/5.489 | 4.048 | 13.300/88.700 | 47/0/8 |
| tx2-dxt1-p10-cores-b-3-baseline-ladder | 12.199/58.117 | 11.635/57.518 | 11.265/55.272 | 0.003/6.132 | 4.033 | 15.600/112.200 | 43/0/24 |

Controls are the two baseline rows in this table. Report a gain only when it exceeds their drift. A zero-reader row is context for the loaded disk trial, not a matched semantic-oracle PASS. Raw byte seals are next to this report.

The candidate is **rejected**: zero-reader median gain .293 ms exceeds .062-ms drift but is below the menu’s .5-ms minimum; loaded median gain .301 ms is within .320-ms drift. Loaded p99 is worse than both controls. L1024 writer p99 ratio 3.542 misses 2, against .797/1.862 controls. The original CPU layout remains default. Recovery/P4 are absent in this explicit 450-second ladder diagnostic; the final verdict uses the full workload.

| arm | zero original / ACK / corrected p50,p99 ms | zero swap GiB | zero Mac CPU p50/p99 % | L256 small / medium p50 ms | L256 / L1024 goodput /s | writer p99 ratios L256 / L1024 |
| --- | --- | --- | --- | --- | --- | --- |
| baseline | 10.810/43.523; 10.349/42.722; 10.032/41.625 | 4.080 | 14.2/100.9 | 11.327/13.311 | 43319.4/50123.1 | 3.636/0.797 |
| candidate | 10.547/37.983; 10.077/37.001; 9.840/35.045 | 4.080 | 15.2/108.5 | 10.815/12.543 | 44054.9/50135.4 | 0.724/3.542 |
| baseline | 10.871/45.378; 10.394/44.527; 10.163/43.922 | 4.041 | 14.9/100.0 | 10.623/15.359 | 41001.9/47259.3 | 0.235/1.862 |

All 3707 primary commits per half complete; loaded oracles check 493 commands and 40 reads each, 1894/1822/1699 entity queries and zero mismatches/receipt violations. Zero arms explicitly have no external oracle. Candidate transactor CPUs 0,2 share gateway CPU 2; Postgres 1, writer 3, readers/background 4–7 and read gateway 4 stay fixed, checked by actual container/thread readbacks. Raw seals include all six halves and exact matched-zero writer bytes. First `cores-a` was refused before containers because the sandbox denied required host counters; the retained refusal is not a measurement.
