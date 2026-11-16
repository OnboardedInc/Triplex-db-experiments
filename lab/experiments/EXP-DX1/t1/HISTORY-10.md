# tx2-dxt1-p10-history-a

Source 0b88f76890cb53179002b5bc8e6e21df9fb167bd; summary tracing; history trial, one uninterrupted session. Authoritative offer-to-finish remains the verdict. ACK-only retains lateness; corrected also subtracts actual lateness and is diagnostic.

| arm | original p50/p99 ms | ACK-only p50/p99 | corrected p50/p99 | lateness p50/p99 ms | swap GiB | Mac CPU p50/p99 % | >50 burst/growth/sparse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tx2-dxt1-p10-history-a-1-baseline | 10.927/88.526 | 10.408/88.204 | 10.061/77.312 | 0.002/5.563 | 4.181 | 14.300/118.000 | 136/14/2 |
| tx2-dxt1-p10-history-a-2-candidate | 10.019/45.232 | 9.515/44.948 | 9.253/43.741 | 0.002/3.986 | 4.111 | 13.800/97.300 | 38/0/9 |
| tx2-dxt1-p10-history-a-3-baseline | 10.403/63.753 | 9.887/62.435 | 9.580/56.994 | 0.002/5.445 | 4.080 | 13.700/101.700 | 91/17/8 |

Controls are the two baseline rows in this table. Report a gain only when it exceeds their drift. A zero-reader row is context for the loaded disk trial, not a matched semantic-oracle PASS. Raw byte seals are next to this report.

Four-subject history growth is opt-in: `--history-growth-subjects 4`. The current frozen form (500 subjects per command) stays default. All arms reach depths 3 and 10 for 1000 sampled subjects, with zero failed assertions and eligible indexed depth comparisons. The candidate uses 500 + 1750 growth transactions against 4 + 14, with the same 4000 + 14000 assertions. Its growth wall times are 7.832/17.534 seconds against 5.933/11.563 and 5.518/10.292 seconds; depth-10/depth-1 p99 ratios .993/1.043/1.042. Every depth has more than 1.4 million correct observed pulls (well above 10000).

Growth-phase primary slow commits fall from 14/17 to zero; growth writer maximum event-loop stall from 133/264 and 131/237 ms to 26/44 ms. Total all-primary slow counts are 152/47/116. Original p99 improves 30.907 ms against the controls' mean, exceeding their 24.773-ms drift; its original median improves .646 ms against .525-ms drift. Changed growth length also shifts later phase populations; these are workload-form diagnostics, not an unchanged-workload verdict or isolated explanation of every burst-tail difference. Sparse slow commits do not improve (2/9/8).

All 7408 primary commits per arm complete. Independent oracles: 810/3042/810 commands, 53 reads each, 2223/2913/2535 entity queries; zero mismatches/receipt violations. Source/slot/input and raw-byte qualification is in `AUDIT-10.md` and the session's `TRIAL.json`/seals. Run-produced reports and raw traces remain under the three matching private run tags.
