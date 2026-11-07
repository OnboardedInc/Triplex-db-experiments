# Pinned DuckDB C API v2 host boundary research

1 November 2026. **Source research and independent pinned-source review only. No host adapter, selected transport contract, implementation or execution plan is supplied.** The exact public ref is `d54cbbe3df17e8e5ce68312f483b4155836112aa`, whose header declares actual unstable C API2.0.0. This is not an installed library/version observation or stability promise.

## Conclusion

Among the inspected callback families, a single-scan-thread leaf table function exposing an immutable, completed, owned reducer outcome is a defensible smallest useful research boundary. It is **completed-result egress**, not arbitrary SQL-child ingestion, a Datalog completion certificate or direct SQL aggregate compatibility. The actual aggregate builder requires a combine contract that the standalone full-tuple-deduplicating reducer does not provide. The typed carrier, binding identity/access, per-execution ownership and error handling remain unselected prerequisites.

- [RESEARCH.md](RESEARCH.md) separates pinned declarations, implementation observations and the conditional boundary inference.
- [PINNED-EVIDENCE.md](PINNED-EVIDENCE.md) records11 upstream public blob identities and bounded source sections; no upstream header or binary is copied into this checkpoint.
- [RISKS-AND-OPEN-CLAIMS.md](RISKS-AND-OPEN-CLAIMS.md) identifies concrete type/NULL/NUL/f64-word, registration, lifetime, interruption, error and streaming-atomicity limitations.
- [INDEPENDENT-REVIEW.md](INDEPENDENT-REVIEW.md) independently matches all11 source identities and central claims, adds Q1 and explicitly bounds unchecked claims.

## Important qualifications

Connection registration is database-visible, not a private per-connection closure. A concrete tag-preserving SQL carrier is required; successful cast-capable getters or NULL handling are not the project's strict tagged admission. Callback chunks/views and vector/string arenas have borrowed lifetimes, and representation-aware selection/validity rules must be honored. Native completion-before-output does not itself retract chunks already consumed after a later host error.

The pinned error setters disagree with their null-info comments. A live non-null callback carrier avoids that particular nullable form, but **does not establish nonthrowing text-error translation**: the text setter performs an owning string copy without its own local error-handler wrapper. Q1 is a source-risk qualification, not a reproduced runtime failure, a selected workaround or evidence that every callback error path is broken. Error/allocation/nonthrowing cleanup prerequisites remain open.

## Relation to item5

The separate standalone reducer now has [a58-case semantic/projection unit and a5-case complete-final-counter unit]([PRIVATE_REFERENCE_REMOVED]), each compiled and run once with its bounded PASS. Those results do not verify any host-v2 boundary in this research. No source-level feasibility finding establishes ABI/export/load/registration success, exact carrier round-trip, cancellation responsiveness, cleanup, SQL/counter agreement, spilling, compatibility, performance, production readiness or fullitem5 acceptance.

Only new project research, public source identities/citations and independent review are saved here. There are no computer-environment snapshots/details, raw diagnostics, code-generation/execution packets, upstream binaries or stopped material. Existing held actions/dependencies are unchanged. Later targeted error-channel/carrier-owner research is separate and is not represented as reviewed or selected by this checkpoint.
