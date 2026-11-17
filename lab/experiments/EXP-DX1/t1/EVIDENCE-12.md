Canonical evidence is under `~/Claude/Projects/triplex-db-2/evidence/DX-T1/`. Raw data, large viewers, oracle captures, test JSON and computation scripts stay there. Only the small reports, indices and checksum manifest are committed.

| Evidence | Canonical relative path | Meaning |
| --- | --- | --- |
| Historical rescores | `p12/rescore-{C,A,F,G,H}-12final.json`, `ack-reproduction-12.json` | New exclusive computations from original sealed old bytes; no fresh oracle/acceptance promotion. |
| Verdict admission | `tx2-dxt1-p12-v3-admit-a-admission/` | Exact plan, 60-s passive host record and disk reservation; exit75, no containers. |
| Micro corpus / byte checks | `p12/micro-final.json`, `micro-baseline-b.json` | 300 sealed payloads, CPU-only; reconstructed body limit retained. |
| Native failed/successful gates | `tx2-dxt1-p12-native-c/`, `tx2-dxt1-p12-native-d/` | First timeout retained; full grouping, 200k differential and independent oracle in d. |
| Supervisor extension | `p12/watchdog-extension.json`, `native-d-end.json` | Waiting host supervisor only paused; actual native exit0 and cleanup. |
| E6 and JIT | `tx2-dxt1-p12-e6-a-*`, `tx2-dxt1-p12-jit-a-*`; `p12/{e6,jit}-price-c.json` | Original spans/JFR/compiler events; same-session controls; warm-up carry-over disclosed. |
| Full CPU diagnostic | `tx2-dxt1-p12-six-loaded-d-*`; `p12/cpu-price-12.json`, `cpu-rows-check-12.json` | Six sealed native arms, raw ACK equality, actual placement/build and 293 source preimages checked; six rejected. |
| Row-only ABBA | `tx2-dxt1-p12-row-a-*`, `tx2-dxt1-p12-row-a-session/MEASUREMENTS.json` | Four correct native arms; summary-selector failure retained, report replay succeeded; no default adoption. |
| Steadiness | `p12/steadiness-b.json` | Original F/H byte-bound windows, clock steps and unavailable host attribution. |
| Quiet counters | `p12/quiet-counters-1k-10k.json` | Actual callback cache records at both populations; missing counters stay unknown. |
| Checks | `p12/current-datomic-unit.{json,log}`, `current-bench-types.log`, `final-checks/`, `finish-checks/` | Actual commands/results; skipped native tests and root/pack limits disclosed in CHECKS-12. |
| Pin audit | `p12/pinned-paths-12.json` | Authority path lookup, old/base/new SHA256; acceptance unchanged. |
| Failed raw compression | `p12/tx2-dxt1-p12-six-loaded-b-1-eight-ladder-{compression,compression-end}.json`, `*-observations.tar.zst` | 8,513 files: 3,086,331,722→305,839,730 bytes; four captures 912,109,810→17,230,078 bytes; decoded equality before originals removed. |

The failed b timing/report/oracle state remains ERROR; compression never changes that verdict. Its original `driver/observations-*` files restore with `zstd -dc ARCHIVE | tar -xf - -C ORIGINAL_RUN`; individual captures restore with `zstd -d --rm FILE.zst`. The private compression journal records every original file SHA and archive SHA. Existing cited older C/A/F/G/H raw bytes were not removed or recompressed.

Run `shasum -a 256 -c PATH_TO_REPO/lab/experiments/EXP-DX1/t1/EVIDENCE-12-SHA256SUMS` from the canonical DX-T1 directory. The manifest seals 3330 retained files / 2,982,514,795 logical bytes; APFS physical-space totals are not inferred from those lengths. New per-run public `runs/<tag>/SHA256SUMS` also seal report and raw trace bytes. The global private `evidence/TRACE-INDEX.md` is maintained by the run finalizers.

All three CPU loaded oracles and the 1k native-d oracle are actual fresh checks; zero-reader NOT-RUN records remain NOT-RUN. Historical rescores and CPU/micro diagnostics cannot qualify a v3 verdict. All owned containers, volumes and networks are removed; eight guest CPUs and scheduler state restored before lease release.

Computation code is retained under `p12/`: `rescore-final.py`, `render-tables.py`, `cpu-price.py`, `validate-cpu-rows.mjs`, `final-docs.py`, `compress-failed.py`, controllers and this sealing script. Their contents and outputs are checksum-bound; private absolute workspace paths are not copied into the repository. Current code head before evidence commit: `c56b94a68cacbca4f7971412a1fbc08b76a72e91`. Measured CPU/row source is `2409bdad`; reporter-only fix is later and records its actual code SHA.

No dependency/image download, upload, push, 100k run, forbidden port, colima command or foreign lifecycle/cleanup action was performed. Disk after the final measurement was 18.636 GiB; final observed free space is 19.582 GiB.
