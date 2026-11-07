# Independent delta receipt — A's additive errata

**Reviewed:** 2026-11-01 UTC. **Disposition:** P2-01 and P2-02 from frozen `10-REVIEW.md` are **CLOSED for source/citation precision** by the exact separately additive erratum below. No new P0/P1/P2 defect found in this narrow delta. The initial review and its manifest/checksum remain unchanged historical records of the then-open findings.

## Exact inputs

A directory: `.agent-logs/goal6-v2-cancellation-primary/additive-errata-001/`

| File | SHA-256 |
|---|---|
| `ERRATA.md` | `7e7cb845f3cc5a3aa354b1f611e24ab3f0c8edbd1b0b58400c22d0ea47b11f9d` |
| `PROVENANCE.md` | `4621a7980d208bfebd57097e8279f666962f89fc9c282265c8865178953f3eaf` |
| `PROGRESS.md` | `057461a5407aa435e54fb3f8dbd678281feb7dcf37e1cc2cc9e917ebef1a7df1` |
| `MANIFEST.json` | `3c2ee4767cf130becdf3a5033a14c12c6363914a00fa1367e246571d581c7f73` |
| `SHA256SUMS` | `3dae089864ca667fd52e699eebce6cb8d8e8fc7f1a78b126e9f216f2d6baf23e` |

All four listed file hashes and the checksum file's selected identity match. All five texts were read, including provenance, progress and manifest limits. Relevant original report, vector/common/client-context public-response records, manifest and checksum identities were separately rechecked against the already reviewed frozen values. This is content verification, not a fresh public acquisition, product parse/import or execution. The initial peer's five checksum-listed files and checksum identity also still match.

## Delta reasoning

1. **E1 closes P2-01.** It preserves the vector-reference citation at [vector.yaml 512–527](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L512-L527) and separately cites [arena 698–708](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/vector/vector.yaml#L698-L708) and [common 130–135](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/api_spec/v2/common/common.yaml#L130-L135). These match the already inspected retained text: first-use arena allocation, borrowed ownership, expiry on flatten/reallocation/destruction and the shared lifetime of allocated bytes. It adds no observation that an allocation actually occurred in this project.
2. **E2 closes P2-02.** It explicitly states function-local thread-local persistence, no new-query reset, increment only on deadline-valid short-circuit reach after the interrupt-state test, and the divisible-by-256 condition. This matches [client_context.cpp 1100–1110](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/client_context.cpp#L1100-L1110). It preserves separate direct blocking checks and rejects time/work/preemption or fresh-query-quantum inferences. It does not turn the hand residue example into an empirical result.
3. **Scope remains preliminary.** The erratum retains the exact unstable-v2 pin, original packet identity, upstream-admission/polling/helper-safety/atomicity/health gaps, empirical UNRUN status, and all existing holds/stops/pauses. No adapter or implementation is supplied, no failed read is retried, and no capacity, future-stability, runtime, overall-heavy-round or action authority is introduced.

## Result and stopping point

Read original A research **with this exact erratum** when using the scoped source review. The two minor precision issues are closed; the original review's other qualifications and optional incomplete content-rehash limitation remain intact. No other claim or source is newly audited by this delta. Overall research synthesis/selection, any later source design/implementation and any action admission remain separate. All empirical stages remain **UNRUN**.
