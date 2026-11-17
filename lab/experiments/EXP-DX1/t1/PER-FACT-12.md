Per-fact candidates preserve the stored layout and remain opt-in until a live gain exceeds same-session bookend drift.

The CPU micro uses 300 distinct sealed part-11 payloads (100 per band), rotated/reversed variant order, first round discarded, and byte-for-byte packed values, row texts and reconstructed-body checks against the original golden. It does not price durability, Effect batch staging or gateway parsing. The reconstructed body is not the complete original HTTP envelope.

Micro host: swap 13.773 GiB, non-VM CPU 351.1% before / 467.0% after (aggregate process percentages include the micro). Values below are CPU micro medians, not commit-wall latency.

| Band | baseline ms | pack once | checked row | body | combined |
| --- | --- | --- | --- | --- | --- |
| small | 0.3776 | 0.3689 | 0.2037 | 0.3593 | 0.1775 |
| medium | 0.9025 | 0.9126 | 0.4825 | 0.9161 | 0.4077 |
| large | 1.8693 | 1.7481 | 1.0047 | 1.8718 | 0.8092 |

`TRIPLEX_DATOMIC_FAST_PATHS=pack,row,batch,body` selects independent candidates. Empty/default selects none. Pack reuses change JSON; row uses private checked-object attestation and still validates external rows; batch stages in one Effect call; body scans exact plain data before native encoding and falls back on special values. Gateway parser optimization and a batch Effect micro remain owed.

Client fixes: consume assigned-clock entries once, cache the first defined receipt instant, clear maps on close; snapshot large plain bodies before yielding in chunks (snapshot remains synchronous); default reach/row/predecessor/key budgets 16/8/32/4 MiB with size/counter trace records. The benchmark explicitly keeps a 256-MiB predecessor budget.

Writer fixes: original subject copies retained only for resends and released afterwards; history growth uses an O(1) subject map. Growth still runs on the writer, and a ledger isolate was not built. GC helper affinity is available but not promoted by an unmeasured claim.

No native latency saving is claimed from the CPU micro alone.

Live row-only trial: summary tracing, early compilation, exact local reads, strict server record clock, unchanged layout; 200-second frozen prefix, 3,420 completed primary commits and 3,420 correct RYOW/model reads per arm; no errors. Zero-reader oracle is NOT-RUN.

| Arm | ACK p50 / p99 ms | swap GiB | whole-arm Mac CPU median / p99 % |
| --- | --- | --- | --- |
| 1 baseline | 9.070 / 44.876 | 12.549 | 27.5 / 155.1 |
| 2 candidate | 9.079 / 51.615 | 12.502 | 31.5 / 208.0 |
| 3 candidate | 9.184 / 48.636 | 12.478 | 27.1 / 137.1 |
| 4 baseline | 9.795 / 72.759 | 12.392 | 30.8 / 224.7 |

Mean-bookend p50 9.433 ms versus candidate mean 9.131: gain .301 ms, drift .725 ms. P99 gain 8.692 ms against 27.883-ms drift. Neither exceeds drift: no default row fast path is adopted. Pack/body/batch flags also remain experimental; their native one-at-a-time A/Bs, loaded row validation and gateway parsing work are owed.

The session originally returned nonzero only because the report selector looked for off controls in a baseline protocol. All four measured arms were DONE with complete traces and correct observations. The repaired reporter consumed those same sealed arms, checked flags/source/cohorts, and produced `MEASUREMENTS.json` without another measurement; its code SHA is recorded there. This does not turn NOT-RUN into oracle PASS.
