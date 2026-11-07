# Item4.1 — first tiny graph unit result

Observed **2026-10-31 23:05:22 UTC**: **PASS**, exit0, exactly **8 returned public calls / 8 checks / 0 failures**, across four synthetic graphs with n<=1. Independent read-only result review found no mismatch. This is a functional smoke result, **not** performance data, broad graph acceptance, full item4 completion or production-readiness evidence.

## Scope and evidence

- [RESULT.json](RESULT.json) contains the fixed project result and every reached scenario record. All eight expected and actual classifications agree; complete=true. There was one execution and no retry or broader automatic suite.
- [FIXTURES.json](FIXTURES.json) specifies the four exact public graph inputs and call sequence: empty graph; positive self-loop; negative self-loop; aggregate self-loop. For each, analyze returns a certificate whose canonical core is compared with the independent mathematical reference, and the public checker is called on that returned certificate.
- [SOURCE-IDENTITIES.json](SOURCE-IDENTITIES.json) identifies the eight project source/test files by logical name, byte count and content hash. The three product files are already saved in the source checkpoint linked below. The four oracle/suite files and original launcher were local-only at this result checkpoint; their content identities are **not** a claim that those test sources are already remotely saved. The fixtures and reached-result records here are saved independently of that remaining source-publication gap.
- [INDEPENDENT-READBACK.md](INDEPENDENT-READBACK.md) is the frozen independent review, retained verbatim. It checks all eight records, totals, completion/exit agreement, project event order and recorded source lineage without a rerun. It expressly does not claim an independent runtime-byte attestation.
- [FILES.json](FILES.json) identifies this exact result collection. No computer-environment snapshots, raw tracebacks or performance measurements are included.

## Related saved project work

- [Exact graph tool source at49786aa0]([PRIVATE_REFERENCE_REMOVED]). Its README's UNRUN statement records its earlier source-only publication, before this first tiny unit; this later result does not silently rewrite that history.
- [Selected graph contract/review]([PRIVATE_REFERENCE_REMOVED]).
- [Primary graph theory/performance research]([PRIVATE_REFERENCE_REMOVED]).

## What this does not establish

No nontrivial SCC/path, additional semantic fixture, malformed graph/certificate, valid non-BFS auxiliary-tree control, metamorphic relation, raw-cap case, optional4105-graph domain, performance/scalability/capacity test or full suite was run. No Datalog dependency extraction/evaluation, aggregate-language implementation, native syntax, DuckDB/SQL/host integration or prior held action was executed. Original item4 remains incomplete and untested; the separate4.1 graph tool has **only this tiny observed coverage**. Item5 owned-reducer source work is independent and still uncompiled/untested.

Next useful project steps are preserving the new test source on its project branch and separately reviewing the scope of any further small unit. Nothing in this result authorizes another execution, expands the result's conclusions or changes any existing hold.
