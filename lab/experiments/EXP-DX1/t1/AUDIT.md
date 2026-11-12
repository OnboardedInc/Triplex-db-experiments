# DX-T1 observation audit

North star: P2 latency under 256 readers. No acceptance contract, seed or semantic oracle is changed.

## Observation-to-result sites (preamble 9a)

| Site | Content check | Freshness check | Binding check | Meaning |
| --- | --- | --- | --- | --- |
| `lab/trace/report.mjs` `complete` | validates interval shapes; requires writer trace IDs and every Node drain footer; reports missing data | unique run directory; timestamps compared with run start | every record must match run/source/slot; server children match the exact HTTP parent span | trace collection completeness only; never oracle PASS |
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
