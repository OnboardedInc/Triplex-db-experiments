# Item 5 — reviewed primary aggregate research

2026-10-31. Three parallel GPT-6.1-Sol max research lanes and a separate GPT-6.1-Sol max primary-source peer review. **Research only: no implementation contract selected and no empirical acceptance.**

Read [ERRATA.md](ERRATA.md) and [the independent review](peer-review.md) before relying on the original reports. The authored reports remain substantively unchanged; this collection only normalizes line endings and the terminal newline. Corrections are additive and visible, not silent revisions.

## Findings to carry forward

- A completed relation contributes distinct **full tuples**. Distinct tuples with the same measure still count/sum separately; duplicate proofs of one tuple do not. DISTINCT measure is not an interchangeable SQL oracle.
- Exact scalar aggregate facts require a completed lower-stratum source. Negative and aggregate edges are strict; unreachable cycles must be checked. A graph certificate alone does not prove dependency extraction or runtime completion.
- Observed groups and an explicit global empty group differ. Without logical NULL, count, sum, and empty extrema need explicit typed/presence policies.
- Exact-final checked i64 sum and checked narrow-prefix addition are different semantics. At most 100,000 admitted i64 contributions need 80 magnitude bits plus sign for every partial total. A distinct-source cap does not bound an unbounded duplicate input stream.
- F64 reproducibility, exact accumulation, correct final rounding, and per-prefix finiteness are different promises. No floating-sum alternative is selected here.
- Actual unstable v2 aggregate callbacks are real, but are not a general grouping operator for a nested Datalog argument. Typed row spooling and custom-state spilling are different capabilities; the pinned public builder/custom-state path has specific limitations, not a universal no-spilling result.
- [Upstream issue 28132](https://github.com/duckdb/duckdb/issues/28132) reports same-signature v2 aggregate coalescing. It was source-checked as open/reproduced; no exact-pin project reproduction was run.

A narrow N1 completed-relation reducer is a coherent **alternative**, not an adopted contract. Its physical input, ownership, error order, limits/counters, arithmetic representation, and integration boundaries still require explicit choices and independent review. This collection contains research and conditional oracle obligations, not a launch or execution plan.

## Contents

- [Theory and alternatives](theory-report.md), [conditional synthetic oracle/SQL obligations](oracle-obligations.md), [theory sources](theory-sources.md).
- [Numeric proofs and alternatives](numeric-report.md), [numeric sources](numeric-sources.md).
- [Pinned v2 capabilities and analytical performance alternatives](v2-performance.md), [v2 sources](v2-sources.md).
- [Independent research peer review](peer-review.md), [fresh peer source checks](peer-sources.md), [additive errata](ERRATA.md).
- [File-content inventory](FILES.json), including byte lengths, SHA-256 and Git blob identifiers. These describe only the authored project documents.

The review references companion local draft/decision records as review context; they are not part of this publication and are not selected contracts or execution authority. No prior stopped material is included or reconstructed.

## Evidence limits and current state

All compiler, native, SQL, automated-oracle, test, benchmark, spill, ownership, compatibility, integration and performance-measurement stages are **UNRUN**. Paper timings are not this project's timings. No speedup, production readiness, or item-5 acceptance is claimed.

Items 3 and 4 remain incomplete/unaccepted and all existing stopped/dependent held actions are unchanged. The independently scoped item 4.1 certificate checker is separately researched and untested; this item-5 research does not complete it. Items 6–10 remain queued.

Declared project host reference: DuckDB 2.0.0, source d54cbbe3df17e8e5ce68312f483b4155836112aa, actual unstable C API v2. Published project source considered by the research: 691ccf65eb0bee686c1919bfa893d1027db30162. These are project source references, not observations of an installed runtime.

The user's [project-data policy]([PRIVATE_REFERENCE_REMOVED]) remains binding: no computer-environment snapshots/details. This collection contains only new project research, primary citations, mathematical/synthetic examples, and document-content integrity information.
