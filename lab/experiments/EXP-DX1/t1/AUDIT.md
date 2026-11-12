# DX-T1 observation audit

North star: P2 latency under 256 readers. No acceptance contract, seed or semantic oracle is changed.

## Observation-to-result sites (preamble 9a)

| Site | Content check | Freshness check | Binding check | Meaning |
| --- | --- | --- | --- | --- |
| `lab/trace/report.mjs` `complete` | validates interval shapes and declared JFR bytes/export counts/SHA256; requires Mac/VM/Postgres collectors, writer trace IDs and every Node drain footer; reports missing data | unique run directory; timestamps compared with run start and final benchmark time | every record must match run/source/slot; server children match the exact HTTP parent span | trace collection completeness only; never oracle PASS |
| `lab/trace/report.mjs` coverage numerator | exclusive interval union, unknown retained; truncation excludes coverage numerator | only this attempt's matched roots | same trace ID and parent span; writer denominator checked separately | reported fraction, not a promoted verdict |
| `lab/bin/trace-store.mjs` `archive` | SHA256 reread of every copied destination file before source removal | exclusive destination; existing destination refused | catalog names the raw tree and run tag; reports remain | byte-verified local movement only |
| `lab/trace/finalize.mjs` output/exit | runs the report checks; gzip/parser/collection errors are retained | fresh raw filenames and footer required | run/source/slot manifest; hashes every raw file | nonzero on incomplete tracing; does not certify semantics |
| Existing bench oracle/bar verdicts | unchanged comparators and expected-state inputs; wrappers preserve return/errors | existing gates retain their original attempt rules | existing source/receipt binding untouched | no new semantic PASS implementation |

`TRACE-REPORT.md` is generated from observations, including unknowns. Independent review still decides promotion.
The builder's unit/smoke/benchmark results are execution evidence, not independent certification.

## Pinned paths

A literal path scan of the sealed acceptance JSON/Markdown/Python/SHA256SUMS references found 0 changed pinned paths.
The acceptance files are unchanged. Old/new SHA256 values below are for review; no pin is updated here.

| path | base SHA256 | new SHA256 |
| --- | --- | --- |
| none | n/a | n/a |

## First failures retained

- `tx2-dxt1-smoke-a`: gateway reader-form error, no benchmark; raw output and automatic incomplete report retained.
- `tx2-dxt1-smoke-b`: preflight JVM initial/max heap mismatch, no benchmark; retained separately.
- `tx2-dxt1-smoke-c`: oracle PASS, 2,073,483/2,073,483 exact reads, but launcher shutdown lost JFR; Mac swap was denied.
  Its historical `complete:true` covered only Node trace checks in that source revision. It is not evidence of all-layer
  collection. The next source explicitly requires fresh, SHA256-bound JFR exports and the system collectors.

- `tx2-dxt1-smoke-d`: JFR startup option conflict (`filename` with `dumponexit=false`), before the benchmark.
  The controller died before cleanup. Recovery retained the startup log, removed only this prefix's resources, verified
  `recovery-remaining.txt` was empty and then removed its dead-owner lock. No latency or semantic result is claimed.
