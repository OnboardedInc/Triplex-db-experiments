# Part 5 incomplete verdict

The 900-second zero arm completed. The 900-second reader arm and closing off control were refused by the unchanged 15-GiB host disk floor. No full pair, P1/P2/P3/P4 or oracle verdict is claimed. The opening control is context only; durations differ and there is no closing bookend, so this is not an overhead/improvement comparison.

Source 652984e905814517e19314af5708793f2bc0cb85; one original lease; exact local reads selected, strict clocks, deferred witness mode, q8 CPU/history configuration. Split rule `pending` (the existing default); valid-time semantics unchanged.

| Arm / tracing | primary commands | p50 / p99 ms | host swap GiB | Mac non-VM CPU median / p99 % | control |
| --- | ---: | --- | --- | --- | --- |
| tx2-dxt1-p5-verdict-c-off-before / off | 3420 | 13.273 / 67.350 | 12.274 (12.274-12.274) | 51.5 / 244.3 | opening off only |
| tx2-dxt1-p5-verdict-c-zero / summary | 7408 | 13.601 / 107.202 | 12.094 (12.000-12.266) | 49.7 / 227.4 | opening off only |

Zero-arm bars, under the summary context above: all-primary p99 107.202 ms >50; burst 5-10/11-25-fact p50 12.031/14.463 ms >10. The phase named L256 has zero readers in this arm and is not a 256-reader verdict. Steady max queue 2 <= 2.190; burst drains 0.044/0.691 s <=60.
All 7408 primary commands committed; no expired/unaccounted work, 227 duplicate resolutions and 80 lost-ACK resolutions name originals; 7408 RYOW checks exact. Zero-reader oracle intentionally NOT-RUN.
P3 zero-arm data: gaps/order violations/visible duplicate effects = 0; 3 crash injections; exact replay. Phase-window lag p99 56.015 ms <=250. Overall publication lag p99 565.247 ms; it is not the L256 bar. No reader-loaded P3 conclusion follows from this zero arm.
Trace coverage: 8531/8534 roots meet 95%; 7426/7426 witnesses persist/read back, zero pending. Clock replays/ticket wait = 0; generic optimistic CAS retries remain (280).

The qualified 300-second clock-b reader diagnostics remain separate: all four oracle PASS; server L256 small-commit medians 12.031/14.847 ms versus 14.655/12.479 controls (inside 2.176-ms control drift). Read p99 7.679/7.583 ms versus 8.063/8.127 controls. Their full tracing/swap/CPU/control table is in comparisons/tx2-dxt1-p5-clock-b/MEASUREMENTS.md. They do not contain the full P4 growth/flatness profile.

Actual latency bars use writer finishedAt. Legacy trace roots close after onDone bookkeeping: zero trace-wall p50/p99 13.634/107.222 ms versus actual 13.601/107.202. Future traces use exact finishedAt and a boundary validator; the original raw bytes/reports are unchanged.

Raw refusals/empty cleanup inventory, exact source/build/slot manifests, original data and a source-bound partial qualification are under ~/Claude/Projects/triplex-db-2/evidence/DX-T1/tx2-dxt1-p5-verdict-c-session/. Native census output is retained in each completed arm. No censored partial arm or missing oracle is promoted.
