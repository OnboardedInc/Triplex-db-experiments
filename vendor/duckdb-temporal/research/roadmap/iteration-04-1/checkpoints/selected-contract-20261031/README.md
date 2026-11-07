# Item4.1 selected source-only explicit-graph contract

Selected 2026-10-31 at22:15:45UTC after [fresh primary research]([PRIVATE_REFERENCE_REMOVED]), independent contract review and coordinator content/math review found no blocking defect.

Read [DECISION.md](DECISION.md) first. It additively selects the exact [CONTRACT.md](CONTRACT.md) for **new source writing only**. The author's frozen draft status/history is preserved byte-for-byte; it is not silently rewritten as accepted implementation. [SELECTION.json](SELECTION.json) records the exact reviewed document hashes.

## Selected tool, not a native-engine restart

- Pure in-memory Python3.11-source requirement, two functions: analyze an explicit finite signed graph; independently check an untrusted graph certificate. No CLI, parser, JSON/bytes codec, native import or host adapter.
- Dense vertices and producer-to-consumer positive/negative/aggregate-strict edges, all components included. Fixed raw-occurrence/vertex limits are protocol policy, not measured computer-capacity claims.
- Deterministic iterative two-pass SCC producer; independently implemented checker uses in/out trees plus every original cross-edge rank, never a producer SCC/helper call.
- Canonical least-ready schedule separate from least semantic levels. Rejection selects the least strict internal edge then one shortest/lex return, with independently checked distance/tight-edge evidence.
- Canonical semantic fields are distinct from arbitrary valid auxiliary trees. Raw counters/telemetry are not embedded in certificates. Malformed graph, invalid evidence, semantic verdict and exceptional runtime failure remain distinct.

[PROOF-AND-COST.md](PROOF-AND-COST.md), [review notes](REVIEW-NOTES.md), and [the independent contract review](INDEPENDENT-REVIEW.md) give exact obligations and source/math evidence. [FILES.json](FILES.json) inventories only these authored project document contents.

Three disjoint source-only lanes are authoring the producer, independent checker, and a separate tiny closure oracle/test source. No source is imported/parsed/compiled/run by this selection. All new empirical tests, oracle comparisons, mutation, performance and acceptance remain UNRUN. A future new unit scope requires its own review and applicable tool permission; no old held action or dependency is altered.

This tool does not extract Datalog dependencies, evaluate negation/history/aggregates, establish a temporal cut or runtime relation completion, integrate DuckDB, or accept item4. Item4 remains incomplete/untested and4.1 remains untested. All prior stopped saves and explicitly dependent old native syntax remain held. No computer-environment details or old payloads are included/reconstructed; project source requirements are not installation observations.
