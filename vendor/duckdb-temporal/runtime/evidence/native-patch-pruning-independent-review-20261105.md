# Independent review of native patch history pruning

Reviewed candidate `c3ff1d73398b46cc7019465f78fc44f7e598670a` against common source `773f7746466caf0ba4eff70a741e9594d07f39cc`. This is a source-only correctness/performance review, not an execution receipt. No candidate files were changed and no engine, build or fixture hashing was run for this review.

No correctness blocker was found under the native-owned valid-state contract.

The added predicate is redundant: `__td_native_old` selects assertions with `a.e=c.entity_id` (`native/src/temporal_command.cpp:267–269`), and `c.entity_id` is the validated immutable request literal (`:74–85`). The history view exposes `a.e` directly as `entity_id` (`native/catalog.sql:262`). Therefore adding `h.entity_id=<request literal>` to the unchanged assertion-ID join (`temporal_command.cpp:136–137`) preserves its rows while exposing the target to the optimizer.

Owned configuration requires binary collation (`native/owner_probe/owner_probe.cpp:47–57`); the existing literal encoder escapes quotes without normalizing identifier bytes (`native/src/temporal_sql.hpp:6–10`). Replay remains the first CASE branch, followed by the same format and affected/resulting 4096-row admissions (`temporal_command.cpp:126–137`). Fragment construction, original validation-command binding, source carriers, canonical IDs, transaction boundaries and receipt SQL are unchanged. In particular, the history provenance/schema checks remain in `native/catalog.sql:264–315`.

The planned focused gate contains twelve methods: two new pruning tests, eight interval-patch methods and two independent interval-oracle methods. The new tests (`adapter/test-native-patch-pruning.ts:19–82`) cover quoted NFC/NFD/case-distinct IDs, repeated carries, canonical replay, old cuts, batch-created targets, explicit rollback/retry, empty target history and required-field rejection. Existing suites cover original schema/reference meaning, retained budgets, late failure, writer conflicts and malformed provenance. This review does not claim those tests were executed by the reviewer.

Before performance acceptance, regenerate SQL from the exact built candidate and inspect actual operator cardinalities, then run the unchanged shared mixed gate. The history view still materializes its global provenance source set (`native/catalog.sql:255–260`). The new target predicate consequently does not establish target-only I/O for arbitrary provenance-heavy stores. This is a performance boundary, not a blocker to the predicate equivalence or the shared-case experiment.
