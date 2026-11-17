Validation is scoped to this daytime task. No 10k timing arm or night pair was launched.

| Check | Actual result | Limit |
| --- | --- | --- |
| Normal Datomic package command (`vitest run`) | 361 passed, 52 external skips at `8f060202`; exit 0 | No external 100k or root-suite claim |
| Real gateway selftests |24 tests,53,994 assertions; zero failures/errors | Isolated preflight JVM |
| Real gateway trace tests |8 tests,47 assertions; zero failures/errors | Includes the actual adoption observer result/exception checks |
| Fresh 1k reader smoke |9,850,789 model reads, zero wrong/error; oracle PASS 50 sampled reads, exact receipts | Source900dd57b; product tracing files unchanged afterwards; daytime figures not priced |
| Native counters |390,417/393,531 cache hits/requests (99.209%); 9 completed basis advances, 0 drops | Process-wide callback intervals including setup, not a private per-request hit rate |
| Logger/compiler readback | WARN for all 5 quiet categories on all 3 JVMs; effective threshold 0.1 | No native file/INFO logger mode in this smoke |
| Package types; focused JS binding check | Exit0; 8 roots checked, no diagnostics or suppressed binding errors | Root JS coverage has inherited omissions; only 3 new roots registered, no broad waiver |
| Lint/shell syntax | New night/counter lint 0 warnings/errors; shell syntax clean | Broader touched-file lint includes 1 inherited style warning at report.mjs:82 |
| Frozen plan | Digest `aa8a7636ff027ab3`; all required planned commit pools≥520; recovery 557/557/552/553/540/551/543 | Large L256 band 206 and short P5 sweep stay unjudged |
| Clock/cutoff/report fixtures | DST/midnight, pre1930/post 06:15 real-arm refusal, stale/seal/oracle/placement failures, qualification recomputation, raw commit bars, CLI flag parsing pass | Synthetic fixtures do not certify performance |
| Recorded report replay | Original seals checked; coverage unchanged3520/3522; adopted intervals in Chrome/HTML; flags-only CLI exit 0 | Derived old inputs, no new native or oracle verdict |
| Cleanup | Current owned inventory empty; lease absent | Stopped foreign residents left alone |

First failures retained: an old plan-ID fixture in the first full unit run; an accidentally Node-type-free focused configuration; and the first replay treating a flag as its copy path. Fixes were followed by the relevant passing checks. No failed native correctness attempt was replaced.
