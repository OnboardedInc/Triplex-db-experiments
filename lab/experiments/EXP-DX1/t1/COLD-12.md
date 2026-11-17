Cold diagnostics retain no keep-warm mechanism. All fixed-gap cohorts below have n=150, are diagnostic/unjudged for performance bars, and use whole-arm Mac context only. Native oracle is NOT-RUN for zero-reader arms; model RYOW checks are complete.

E6 uses eight/six/eight/six/eight online CPUs with identical placement TX0/PG1/write-GW2/writer3/read-GW4/readers+helpers4. All eight are restored after cleanup. The later loaded comparison separately prices the loss of reader cores; six is not a default from E6.

| E6 arm / summary | ACK service p50 at 25 / 50 / 250 / 1000 ms gap | swap GiB | Mac non-VM CPU median % |
| --- | --- | --- | --- |
| 1 eight | 29.389 / 27.493 / 17.143 / 18.094 | 13.251 | 357.3 |
| 2 six | 17.997 / 15.617 / 14.885 / 16.202 | 13.134 | 308.7 |
| 3 eight | 23.959 / 16.544 / 16.446 / 17.395 | 13.071 | 266.4 |
| 4 six | 19.251 / 16.030 / 15.074 / 15.176 | 13.017 | 246.9 |
| 5 eight | 17.687 / 17.264 / 17.906 / 15.190 | 13.062 | 252.8 |

At 250 ms the six-CPU gains are 1.910/2.102 ms against adjacent-bookend drift 0.697/1.460 ms. Other gaps are less consistent. This is consistent with the investigation’s reduced efficiency-core exposure at six online CPUs; it does not measure cache misses or physical-core placement itself. It is not permission to ship a warmer.

JIT comparison is full tracing, same placement, plain/5000-once/plain/threshold/plain/5000-once-reverse/plain. Threshold is `-XX:CompileThresholdScaling=0.1` on transactor and both gateways. No prefix runs during judged phases by policy; the diagnostic warm-up implementation failed to drain earlier RYOW work, so its apparent gain is contaminated and it is not adopted.

| JIT arm / full | service p50 at 50 / 100 / 250 / 500 / 1000 ms | swap GiB | Mac CPU median % | prefix RYOW ending after first gap / ms |
| --- | --- | --- | --- | --- |
| 1 plain | 17.724 / 13.123 / 16.500 / 13.670 / 13.258 | 13.649 | 228.1 | 51 / 2319.586 |
| 2 warmup | 15.354 / 13.816 / 16.271 / 14.003 / 14.887 | 13.477 | 228.9 | 858 / 25905.908 |
| 3 plain | 16.331 / 15.838 / 16.110 / 17.049 / 16.659 | 13.360 | 225.9 | 94 / 2997.597 |
| 4 threshold | 18.488 / 12.901 / 13.457 / 12.499 / 11.137 | 13.452 | 211.9 | 128 / 4824.617 |
| 5 plain | 17.870 / 16.591 / 17.025 / 15.005 / 15.985 | 13.421 | 191.4 | 89 / 3053.342 |
| 6 warmup-reverse | 14.477 / 14.180 / 14.863 / 17.301 / 18.862 | 13.093 | 213.0 | 1995 / 41507.656 |
| 7 plain | 17.326 / 15.740 / 16.876 / 17.627 / 18.162 | 14.172 | 228.1 | 90 / 3089.296 |

Threshold gains at 100/250/500/1000 ms: 3.314/3.111/3.528/5.184 ms; respective bookend drift .753/.915/2.045/.674 ms. At 50 ms it was worse than the controls. Ten-ms offers saturate the path and are not an idle premium. Early compilation is selected for v3 only; smoke retains its old compiler default unless explicitly overridden. Effective 0.1 on all JVMs was read back in native-c/d.

| JIT arm | transactor C2 after 1000 / after 5000 | write gateway | read gateway |
| --- | --- | --- | --- |
| 1 plain | 46 / unknown | 95 / unknown | 62 / unknown |
| 2 warmup | 860 / 264 | 710 / 270 | 1244 / 619 |
| 3 plain | 46 / unknown | 90 / unknown | 63 / unknown |
| 4 threshold | 37 / unknown | 43 / unknown | 77 / unknown |
| 5 plain | 53 / unknown | 89 / unknown | 58 / unknown |
| 6 warmup-reverse | 871 / 335 | 711 / 296 | 1353 / 655 |
| 7 plain | 58 / unknown | 76 / unknown | 50 / unknown |

All compilation recordings have qualified native clocks. Counts end at the last primary ACK; work continues after 1000 and even after 5000 commits. Hot methods include Datomic AEVT/AVET lookup, SQL update and Artemis credits. Counts plus the controlled threshold intervention support JIT contribution, not a claim that every gained millisecond is compilation.

The 5000-prefix runs retain 858/1995 sampled RYOW overlaps, up to 25.906/41.508 s beyond the first gap. A clean increasing/decreasing fixed-gap premium after fully drained finite warm-up remains owed. Processor-cache and storage-idle costs have no adopted masking setting; the investigation’s layer attribution remains a test-bed finding, not a new exact host-disk trace.

Reproduce: `cold-study.sh e6 PREFIX`, `cold-study.sh jit PREFIX`; analyze with `node lab/trace/cold-price.mjs EVIDENCE_ROOT PREFIX NEW.json`. Seals and computation hashes: `p12/e6-price-c.json`, `p12/jit-price-c.json`.

The supplied cold-path investigation, not a new part-12 measurement, attributes about 1.8 ms at a 1-s gap to processor-cache loss: writer .7, messaging legs .5, transactor .3, gateway plus HTTP .3 ms; the Mac storage idle step adds about .7 ms. At 250 ms its cache/storage lower bounds are .7/.4 ms. These are test-bed costs with no adopted masking setting. The private research inputs are `research/2026-11-16-cold-path/SUMMARY.md` and `COLD-PATH.md`; this part neither reran their prohibited warming probes nor extrapolated their split into current unqualified host-clock windows. The completed loaded 8/6/8 decision is in [CPUS-12.md](CPUS-12.md): six stays off.
