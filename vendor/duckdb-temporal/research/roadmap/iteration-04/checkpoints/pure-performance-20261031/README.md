# Item4: independent database/API performance analysis

2026-10-31. **New source-only analytical results; every empirical stage remains UNRUN.** No application code, API, ABI, registration, logical billing, or accepted legacy path was changed. The implementation examined is [published PR7 source691ccf65]([PRIVATE_REFERENCE_REMOVED]), targeting exact DuckDB2.0.0/d54cbbe3df17e8e5ce68312f483b4155836112aa and genuine unstable CAPIv2. This is not compiler/runtime/performance acceptance or permission to alter any held action.

## Results and confidence

- [V2 boundary-cost report](v2-boundary-costs.md) reconstructs successful callback API/FP-guard counts. It identifies lifetime-qualified opportunities to reduce output-plumbing calls, pool long strings per stable resize epoch, and avoid discarded non-dictionary views using existing immediate kind metadata. Retain fresh guards after every retained operation; no undocumented FP guarantee or measured speedup is inferred. STRUCT size propagation is an exact-implementation-only hypothesis, not a generic public-v2 promise.
- [Trace-constrained negation report](trace-safe-negation.md) separates logical charges from physical hash/index/allocation costs. Its strongest narrow source proof seeks only an uncharged old-row prefix in an already selected delta posting vector, keeping full-list greedy estimates/ties and the exact charged suffix unchanged. Ordinary set equivalence alone does not permit caching/pushdown/reordering under today's audit mechanism. All proposed changes need separate implementation and verification.
- [Measurement axes](measurement-axes.md) distinguish callback invocations, temporal facts, tuples, cells, long-string occurrences/bytes, unique values and physical vector representations.
- [Independent pure peer review](independent-review.md) found no blocking research-claim defect, independently reconstructed source arithmetic/invariants and retrieved12 exact-pinned primary source identities. It does not establish that the candidate compiles or passes tests.

## Notation: do not merge local report symbols blindly

Use `R` for callback invocations, `N_out` for nonempty answers, `C_out` for emitted cells, and `L_str` for long-string occurrences in this combined summary. The boundary report calls these `N`, `C` and `L`. Its successful binding guard model is `122+11I+F+O+25R+13N_out+2L_str`; core guards are additional.

For the trace report, rename its negative work `N` to `W_neg`, and its actual negative-check count `C` to `Q_neg`. Then successful runs satisfy `2Q_neg <= W_neg <= 9Q_neg` (arity1..8), not a timing/RSS bound. Its posting-vector length `L` is `L_idx`, unrelated to `L_str`. Source-level prefix-seek enumeration is `O(old+k)` versus `O(log(L_idx)+k)`, excluding unchanged downstream work; benefit is unmeasured.

[Exact pinned API/source bibliography](v2-primary-sources.md) and [negation primary-source notes](negation-primary-sources.md) document the evidence. `FILES.json` lists exact physical bytes/SHA256/Git-blob identities except itself. Only the six independently released new research documents plus this summary/list are included; no working-note or unrelated corpus is part of this result. No benchmarks, test passes or completion of item4/goals5–10 is claimed.
