# Genuine actual-v2 full-path benchmark: observed results

**All 54 native processes and 1,188 measured samples passed complete-answer validation.**
This establishes this bounded comparison, not item 1 completion or production readiness.

## Main finding

The real actual-v2 API-only binding is **not uniformly faster** than the unchanged stable artifact.
With the exact same frozen core and identical ordered answers/counters, its within-replication warm median is
23–29% slower for 512 unique string values and 33–36% slower for the 64-edge full recursive closure.
Other paths improve or are close; sparse-history direction reverses between the two independent replications.

The separately labeled typed implementation adds observable full-boundary cost. It is not used to attribute
an ABI effect: repeated 512-byte strings cost 2.22–3.46× the API-only legacy path, and recursive closure
costs 1.61–1.86×, using within-replication warm medians. Wider typed SQL/result carriers and the typed core
change together in T. These timings do not isolate a native-kernel bottleneck or prove its cause.

## Exact experiment

- A: unchanged stable C_STRUCT / v1.2.0 artifact `62c9f24e…`; legacy SQL contract.
- B: genuine C_STRUCT_UNSTABLE / v2.0.0 artifact `69916109…`; TD_LEGACY_ONLY and byte-identical frozen core.
- T: genuine actual-v2 typed checkpoint `5b661f38…`; different typed core, explicitly separate attribution.
- Both v2 artifacts reproduced bit-for-bit under unchanged pre/post source hashes. Full proof, source/header snapshots, build logs and manifest are retained.
- Existing host DuckDB 2.0.0 / d54cbbe3df; host-library hash `e7cda112…`; GCC 14.2, C++17, O3/NDEBUG, no sanitizers, one DuckDB thread, 96 MB managed-memory setting.
- Eight all-string datasets × A/B/T plus three typed-only datasets × T; two independent processes per eligible arm/dataset = 54 processes.
- Two unmeasured warmups; 21 measured warm calls per process; one separately labeled process-first call. Candidate order rotates and dataset order is seeded/shuffled.
- 1,134 warm + 54 process-first samples, each fully fetched and validated. 108 separate diagnostic samples are not subtracted from primary costs.
- SQL list/STRUCT construction includes all retained history. No output count shortcut or invisible-row prefilter. Exact ordered answers and native counters agree across A/B/T on all eight string datasets.

## Warm full-path wall time

Values are pooled p50 / p95 milliseconds across 42 warm samples per cell. The final columns use ratios of medians within each independent replication, not ratios of pooled medians.

| Dataset | History / result rows | A ms | B ms | T ms | B/A, two replications | T/B, two replications |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| empty_ground_string | 0 / 1 | 1.124 / 1.878 | 1.109 / 1.185 | 1.169 / 1.575 | 0.984× / 0.970× | 1.355× / 1.095× |
| strings_12_byte_carrier | 512 / 64 | 1.104 / 1.285 | 1.061 / 1.368 | 1.395 / 1.955 | 0.982× / 0.931× | 1.492× / 1.263× |
| strings_13_byte_carrier | 512 / 64 | 1.100 / 1.631 | 1.106 / 1.337 | 1.461 / 1.661 | 0.965× / 1.050× | 1.346× / 1.317× |
| strings_512_byte_carrier | 512 / 64 | 1.422 / 1.826 | 1.157 / 1.295 | 2.731 / 4.270 | 0.782× / 0.842× | 2.221× / 3.461× |
| strings_recursive_chain | 64 / 2080 | 3.866 / 4.632 | 5.218 / 5.511 | 9.114 / 12.313 | 1.332× / 1.365× | 1.861× / 1.611× |
| strings_repeated_short | 512 / 64 | 1.399 / 1.682 | 1.038 / 1.367 | 1.373 / 1.536 | 0.876× / 0.714× | 1.279× / 1.374× |
| strings_sparse_history | 512 / 32 | 1.336 / 1.448 | 1.293 / 1.391 | 1.357 / 1.818 | 1.226× / 0.770× | 0.982× / 1.653× |
| strings_unique_short | 512 / 512 | 1.436 / 1.669 | 1.937 / 2.878 | 2.205 / 3.859 | 1.226× / 1.287× | 1.201× / 1.373× |

### Typed-only observations

There is deliberately no coercing legacy-string comparator for these mixed/numeric semantics.

| Dataset | History / result rows | T p50 / p95 ms | Replication p50 ms |
| --- | ---: | ---: | ---: |
| typed_f64_boundary_repeated | 512 / 10 | 1.497 / 1.726 | 1.261 / 1.692 |
| typed_i64_unique | 512 / 512 | 2.072 / 2.629 | 2.068 / 2.074 |
| typed_mixed_repeated | 512 / 8 | 1.386 / 1.878 | 1.297 / 1.671 |

## Process-first and memory limits

Process-first means a fresh process and first native invocation after connect/LOAD and table staging.
It is **not OS/disk-cache cold**. In particular, A/B recursive first-call timings overlap despite the warm regression.
All raw first-call values, connect/LOAD, staging and teardown timings remain in the per-process reports.

| Dataset | A first-call ms | B first-call ms | T first-call ms |
| --- | ---: | ---: | ---: |
| empty_ground_string | 1.093 / 2.393 | 1.525 / 1.533 | 1.605 / 1.549 |
| strings_12_byte_carrier | 2.052 / 1.575 | 1.997 / 1.794 | 2.339 / 1.974 |
| strings_13_byte_carrier | 1.848 / 1.827 | 1.553 / 1.941 | 1.979 / 1.943 |
| strings_512_byte_carrier | 2.595 / 2.058 | 1.991 / 1.904 | 3.729 / 3.277 |
| strings_recursive_chain | 4.607 / 5.148 | 4.388 / 5.592 | 9.186 / 12.593 |
| strings_repeated_short | 1.673 / 2.057 | 1.534 / 1.611 | 1.955 / 1.981 |
| strings_sparse_history | 1.549 / 2.014 | 1.964 / 1.625 | 2.086 / 1.824 |
| strings_unique_short | 1.943 / 1.976 | 1.956 / 2.600 | 3.875 / 4.908 |

Peak RSS is a fresh-process high-water measurement including Python, DuckDB, staged data and full client
results/validation—not native allocation attribution or proof that a 96 MB setting bounds the entire process.
Across all tested datasets the observed per-arm RSS range was:
- A: 95.24–96.32 MiB.
- B: 95.23–96.29 MiB.
- T: 95.23–96.21 MiB.

## Validation and diagnostic costs

Primary times already include complete nested fetch. Strict test-tool validation/checksum costs are recorded
separately, with an additional fetch-plus-client-validation pipeline time. The test comparator is not a claim
about a production JSON adapter. It inspects typed fields/bits, so T validation does more work.

| Dataset | A fetch + validation p50 ms | B ms | T ms |
| --- | ---: | ---: | ---: |
| strings_unique_short | 1.789 | 2.469 | 3.174 |
| strings_recursive_chain | 5.703 | 8.054 | 17.740 |
| strings_512_byte_carrier | 1.679 | 1.339 | 3.025 |

The separate list-aggregate/full-input-fetch and parameter-carrier controls are single observations per process
after primary sampling. They are not interchangeable paths or additive phases. Do not subtract them from the
full-path median to manufacture parse, kernel, flatten or output timings. Those internal phases were not instrumented.

## Qualification and acceptance boundary

- This is one shared AMD EPYC 9V74 host, inherited affinity on nine logical CPUs, no CPU isolation, and no cache flushing. Other task activity was uncontrolled. The environment observation was made after terminal status and does not prove constant load during sampling.
- CPU and wall medians are both retained. Replication drift and the sparse-history direction reversal prohibit a blanket speedup claim; two processes are not a statistical certification of an entire workload population.
- API-only B genuinely LOADed; three initial A/B cases had identical ordered answers and counters. The original frozen 22-test legacy suite had 21 semantic passes and one expected 0.1.0-versus-0.2.0 metadata assertion failure. The version-only adapted suite passed all 22; both logs and the exact diff are retained.
- The immutable typed checkpoint independently passed all 29 SQL/native cases / 87 native calls, including shuffled duplicates and ambient nocase. This does not replace storage migration, browser, sanitizer/lifetime, resource or full project acceptance.
- No implementation source, Git reference, PR or Page was modified by this worker. No Codex task or dependency installation was used.
- Recommendation: retain the actual-v2 architecture decision, but record these regressions honestly. Instrument and optimize demonstrated boundary costs in a separately versioned candidate before claiming a performance benefit. Do not hide list construction/fetch or widen limits to improve the graph.

## Evidence

- `status.json`, `summary.json`, `analysis.json`, `environment-observation.json`.
- All 54 `*.raw.json`, full first answers, per-sample checksums/counters, payloads, stdout/stderr and schedule.
- `../real-artifact-provenance-1857/comparison-manifest-source-pinned.json` and its source-pinned reproduction directory.
- `../native-real-confirmed-1858.json`, `../real-controls-smoke-1858/status.json`, legacy logs and version-only diff.
