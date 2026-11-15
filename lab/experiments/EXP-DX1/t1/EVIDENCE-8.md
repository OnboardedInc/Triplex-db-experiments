# Part 8 retained evidence

All paths below are relative to `~/Claude/Projects/triplex-db-2/evidence/DX-T1/`. [EVIDENCE-8.SHA256SUMS](EVIDENCE-8.SHA256SUMS) seals the private analysis/session manifests and fresh check/ownership receipts. Run folders in `t1/runs/` commit only `INDEX.md`, `TRACE-REPORT.md` and `SHA256SUMS`; their raw/source/runtime/oracle hashes resolve against the matching private run folder. Original and decoded archive hashes are checked before being sealed. No raw file was deleted in this part; automatic gzip packing is lossless and journalled. No new dependency or image was downloaded.

| evidence | scope |
| --- | --- |
| `tx2-dxt1-p8-model-a-*`, `tx2-dxt1-p8-model-a-session/` | Heap/journal/heap bookends, same-mode zero references, loaded oracle; [journal result](JOURNAL-8.md) |
| `tx2-dxt1-p8-young-a-*`, `tx2-dxt1-p8-young-a-session/` | Writer nursery 16/4/16 MiB, same-mode zero references, [settings](SETTINGS-8.md) |
| `tx2-dxt1-p8-shared-a-*`, `tx2-dxt1-p8-shared-a-session/` | Full native/JFR/SQL, transactor 0/0,1/0, [native](NATIVE-8.md) and settings findings |
| `tx2-dxt1-p8-oldheap-a-*`, `tx2-dxt1-p8-oldheap-a-session/` | Writer old-space 6144/1024/6144 MiB, same-mode zero references |
| `tx2-dxt1-p8-final-a-{off-before,zero,ladder,off-after}/`, matching `-session/` | Complete current-layout full pair and off context; [every bar](VERDICT-8.md), [tail](TAIL-8.md) |
| `tx2-dxt1-slim-size-a-{1-current,2-slim,3-current}/`, matching `-session/` | Fresh 1,000-subject full-level zero ABA, exact physical-layout census/native counters; [prototype](SLIM-8.md) |
| `tx2-dxt1-slim-smoke-{a,b,c,d}/` | First form/route failures a/b/c retained; d has full native/differential/oracle exactness gates but fails trace qualification on null Mac CPU/swap; no qualified latency claim |
| `tx2-dxt1-p8-{journal,young}-smoke-a/` | Initial 1,000-subject model/heap gates; young actual-isolate cap validation is also sealed |
| `p8-closing-analysis/` | Original C/final/slim input-byte verification, native joins, physical-layout runtime matching, host scope, all-bar renderer, GC/heap/storage proxies, synchronous witness finding; authoritative `analysis.json`, `metrics-b.json`, `runtime-b.json`, `stall-work.json`, `settings-extra.json` |
| `p8-native-analysis-b/` | Earlier native transaction correlations and `storage-tail-b.json`; exact clipped stacks/socket fields, with analysis scripts |
| `p8-retained-seals/`, `p8-close-evidence/` | All 20 diagnostic raw/source/oracle seals, six smoke raw seals, independent empty owned inventories and gone measurement lease |
| `p8-release-checks/`, `p8-check-tools/`, `p8-package-source-match.json` | Fresh 293 pass/51 skip/zero-failure package receipt, build/typecheck/lint/shell logs and scripts; 313 current product/bench source files match its executed bytes |
| `p8-runtime-validation-c.json`, `p8-pin-audit-final.json` | Actual zero/loaded runtime identity for 12 diagnostics; zero changed-path pin references and unchanged acceptance bytes |

The inherited root-JS check fails only on unregistered `packages/datomic/test/report-revision-race.mjs`. A full-root or pack-check PASS is not claimed. Package and real-engine gates validate their stated populations; they do not turn performance misses into acceptance. [AUDIT-8.md](AUDIT-8.md) lists every place that qualifies observations, including byte content, attempt freshness and source/slot/input binding.

The run itself writes `TRACE-REPORT.md`, `COMMIT-ANATOMY.md`, `WRITER-STATS.md`, `trace.html`, `trace.chrome.json` and compressed `trace/raw/`. The full default pair has 52,984,036 raw compressed bytes. The global `../TRACE-INDEX.md` links each run to its code hash, viewer and raw size. Large viewers stay private; gzip originals can be restored with `gzip -dk`, leaving the verified archive in place. Cited inputs are not discarded or recompressed in this part.

Disk admission remains 15 GiB. Final loaded admission read 16.840 GiB; free space transiently fell to about 12 GiB during its oracle/export then recovered on owned-volume cleanup. Final observed free space is 15.304 GiB. All owned `p8`/`slim` containers and volumes are gone, measurement lease absent, scheduler restored by each checked controller; foreign residents were untouched. No sealed seed was modified; slim uses newly created scopes/seeds. No push or acceptance edit.
