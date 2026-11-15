Evidence root: `~/Claude/Projects/triplex-db-2/evidence/DX-T1/`. Paths in [EVIDENCE-7-SHA256SUMS](EVIDENCE-7-SHA256SUMS) are relative to that root; verify with `shasum -a 256 -c` from the root. This is a selected-artifact manifest, not an assertion that every observation file is enumerated or that any performance bar passed. Raw files/viewers remain private.

| evidence | durable path under the root | status |
| --- | --- | --- |
| quiet full pair, controls, host state, all bars | `tx2-dxt1-p7-closing-a-{session,zero,ladder,off-before,off-after}/` | complete; oracle PASS; P2 misses retained |
| first broadcast trial | `tx2-dxt1-p7-basis-a-*/` | opening ReadError retained; comparison incomplete |
| fresh broadcast A/B/A and mode-matched zeros | `tx2-dxt1-p7-basis-b-*/` | complete diagnostic; not a full pair |
| 1,000-subject journal/archive smokes | `tx2-dxt1-p7-journal-smoke-{a,b,c}/` | a rejected unsupported argument; b/c DONE with fresh oracle PASS |
| heap/journal trial | `tx2-dxt1-p7-model-b-*/` | four arms complete; closing control disk-refused; no controlled gain |
| admission refusals | `p7-model-a-controller.log`, `tx2-dxt1-p7-model-b-session/3-controller.log`, `p7-final-a-controller.log`, `tx2-dxt1-p7-final-a-session/` | source-frozen stderr/headers; no fabricated measurements |
| automatic writer statistics | `p7-writer-stats-v3/` (earlier versions retained) | source-bound full writer populations, heap/GC/lateness; no exclusive CPU attribution |
| verified independent anatomy rendering | `p7-closing-anatomy-verified/` | derived from original closing bytes; originals unchanged |
| fresh checks | `p7-final-checks-long-gc/` (earlier attempt retained) | actual exits, source fingerprints, patch, lockfile, script and Vitest JSON; root-JS fails as reported |
| offline finalizer fixture | `p7-finalizer-fixture{,-v2}-receipt.json`, `p7-finalizer-fixture-script.mjs` | original/index hashes unchanged; no new engine/oracle execution |
| lossless compression | `p7-{compression,retry-compression,headroom-compression,model-compression}{.jsonl,-plan.json,-receipt.json}` | per-file original/decoded/compressed SHA256 and restore command |
| model archive readback | `p7-model-bound-receipts.json` and each candidate's `driver/*journal*` | original and gzip lengths/hashes; not a semantic promotion |
| cleanup/refusal observation | `p7-final-state.json`, `p7-final-owned-inventory.txt` | owned resources absent, lease absent, final admission below 15 GiB |
| source helper preimages | `renderers/`, `p7-retained-scripts/` | old renderer SHA preimages and actual private controller/check/compression scripts |

Each completed run retains `head.txt`, `source-build-hashes.json`, `trace-run.json`, `trace/SHA256SUMS`, compressed `trace/raw/`, original `driver/ns-report.json` and writer population, `trace.html`, Chrome trace JSON (or its verified `.zst`) and its small repository report/index. Auxiliary oracle/split inputs use `ORACLE-ARCHIVE.jsonl`; source-bound archive receipts identify recoverable original bytes. Protected writer baselines are directly readable. A report's historical checksum continues to describe the original bytes when a later compression journal supplies the archive mapping.

The selected manifest includes per-run source/configuration, actual compressed traces, oracle archive files/receipts, raw writer populations, reports/viewers, all small session/controller records and the private check/compression/derived artifacts. Large read-observation populations and the offline fixture's redundant raw clone remain outside this selected manifest; the original run checks and source-bound reports retain their own bindings. Original first failures, incorrectly captioned first derivations and intermediate render recovery files are preserved.

The part-6 reference is `tx2-dxt1-p6-reference-a-{session,zero,ladder,off-before,off-after}/`; its previously retained source/collector/oracle evidence remains authoritative. Part-7 comparison rows are derived observations, not a new execution of that source. The global `../TRACE-INDEX.md` catalogs actual trace-bearing attempts; a pre-lease admission refusal has no invented timeline entry. `../COMPRESSED-2026-11-14.md` has the per-directory selected byte totals and restore command.

[All bars and host contexts](VERDICT-7.md), [broadcast](BROADCAST-7.md), [model retention](MODEL-7.md), [tails](TAIL-7.md), [checks](CHECKS-7.md), [content/freshness/binding audit](AUDIT-7.md), [pins](PINS-7.md), [compression](COMPRESSION-7.md).
