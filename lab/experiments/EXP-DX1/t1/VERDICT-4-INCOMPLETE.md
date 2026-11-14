# Final verdict study: interrupted

Source 42b6a31a; summary kept settings, TLS on, exact replica default pending. Deadline interrupted the ladder at 03:01 UTC; no closing off arm, no ladder oracle, truncated collectors and absent final writer file. No verdict or gain is inferred. Zero-reader arms deliberately skip the semantic oracle. Cleanup inventory is empty and the measurement lease is released.

| Arm | Level | Primary p50 / p99 ms | Timed swap GiB | Mac CPU median / p99 % | Oracle |
| --- | --- | --- | --- | --- | --- |
| off-before | off | 13.447 / 60.289 | 12.257 | 44.1 / 188.8 | NOT-RUN by baseline policy |
| zero | summary | 13.782 / 152.145 | 12.210 | 49.2 / 197.9 | NOT-RUN by baseline policy |

The opening off control did not meet the 12-ms reference. Completed primary counts: [3420, 7408]. Different duration/trace windows and missing closing control prohibit an effect comparison.

The ladder receipt is incomplete; all-commit p99, burst p50, final L256/P1/P3 bars and oracle PASS are not established for the kept full-pair configuration. The complete CPU diagnostic tables retain the measured L256 bars and oracle results.
