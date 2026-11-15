# Expected-model retention: incomplete timing study

Source 12df19b2, summary, 10,000 subjects, delta broadcasts held fixed. The 450-second focused ladder keeps 45-second phases through 1024. The first 15-GiB refusal (model-a) created no lease or containers. In model-b both loaded observed arms are DONE/oracle PASS, zero errors/violations, 3,707 primary commits; its closing control was disk-refused. **No controlled gain or default journal promotion is claimed.**

| arm | primary p50 / p99 ms | >50 count / total wall ms | GC count / total duration ms / max ms | heap median / peak MiB | scheduler-late >50 count / total ms | swap GiB / Mac non-VM CPU median % |
| --- | --- | --- | --- | --- | --- | --- |
| zero | 11.424 / 48.158 | 32 / 1883.601 | 567 / 1484.122 / 44.035 | 529.8 / 681.9 | 0 / 0.000 | 4.562 / 11.2 |
| 1-baseline | 12.544 / 66.251 | 89 / 6081.450 | 759 / 2207.373 / 55.168 | 497.4 / 549.7 | 1 / 62.071 | 4.562 / 11.1 |
| candidate-zero | 11.035 / 43.332 | 19 / 1279.674 | 520 / 1104.359 / 34.180 | 279.9 / 371.4 | 0 / 0.000 | 4.554 / 10.8 |
| 2-candidate | 12.243 / 63.013 | 66 / 5060.620 | 630 / 1653.591 / 38.667 | 301.3 / 412.7 | 0 / 0.000 | 4.554 / 11.2 |

Control: the opening heap row only; no closing drift is available. Zero references match their own mode and trace-time windows. Loaded writer-tail ratios (L256 / L1024):
- 1-baseline: 5.502 / 3.110; diagnostic observations, not a full pair.
- 2-candidate: 11.869 / 11.693; diagnostic observations, not a full pair.

GC kinds (minor / major / incremental): heap loaded 745 / 7 / 7; journal loaded 612 / 9 / 9. A smaller retained graph did not eliminate allocation or major collections. GC durations and overlaps are wall observations, not exclusive CPU. Retained reads already spill in another isolate; oracle command history and duplicate-receipt history still retain writer objects. V8 limits/young-generation and a shared-core two-transactor layout were not measured in this part.

Journal verification reproduces every original receipt-bound world only after drain, then archives the exact bytes. No engine layout or acknowledgement/durability setting changes. Both archive and decoded SHA256/length were independently reread; p7-model-bound-receipts.json is archive content evidence, not semantic promotion. The existing full-row checker and independent oracle remain mandatory.

Raw data, refused third-control directory, original stderr and source/build manifests remain under the canonical private model-b paths; the incomplete-attempt compression journals retain restore commands and original hashes.

Recorded-byte derivation v3: measured writer GC events over 50 ms, heap 1 / 55.168 ms versus journal 0 / 0 ms; both own-mode zero references have zero. This descriptive observation does not supply the refused closing control.
