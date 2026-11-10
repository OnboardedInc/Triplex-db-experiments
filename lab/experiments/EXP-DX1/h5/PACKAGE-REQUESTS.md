# Package-owner follow-up (no package edits in H5)

## Position lookup during a growing seed

Observed: the 10k seed begins near 200–210 commands/s and slows markedly after about 200k logical commands. The raw command-progress curve, cgroups, two transactor JVM thread dumps and source hashes are in durable DX-H5 evidence. The guest snapshot has ~12 GiB available, no swap, zero recent memory pressure and little I/O pressure. These observations do not prove the entire cause.

Across two thread snapshots 252.94 seconds apart, the scope processor consumed 177.744 CPU seconds (.703 CPUs), prefetch-worker-1 consumed100.198 (.396 CPUs), and G1 concurrent marking39.552 (.156 CPUs). In the second snapshot the processor is inside `datomic.iter.MergeIter` / `filter_retractions`, called by the stored transaction function's `value` helper at NO_SOURCE_FILE:7, from line24. This matches `packages/datomic/gateway/src/triplex/gateway/commit.clj:7` and `:24`: `(first (d/datoms db :eavt scope :triplex.scope/position))`. The schema makes position cardinality-one, repeatedly replaced as logical head rises.

**Hypothesis, not verified root cause:** an EAVT walk begins at older numeric values and spends increasing work skipping their retractions before finding current head. The stack and growth curve support investigating it; two samples do not establish causal cost or a speedup.

Requested package change: qualify a head lookup whose work stays bounded as logical position advances, avoiding a scan through retired earlier position values, while keeping head allocation inside the same atomic stored transaction. Preserve all span/provisional shifts, replay/identity checks, scope/entity conflict preconditions, genuine per-command positions, journal entries and outcome-unknown handling. Benchmark identical writes at fresh and growing heads (e.g.50k/250k/1m), and rerun independent full W0 fingerprints/history/counts, concurrency/conflict tests and P5 gates. Do not substitute an unchecked cached/client head. I did not implement a specific index mechanism or claim a particular Datomic API solves it.

H5 workaround: none for this suspected package limit. Qualified seed commands remain in immutable reference order. Eight-way concurrent probes were faster but changed reference fact positions, so they cannot replace the reference seed. Existing public transaction batching may be worth investigating before adding a new API; H5 did not qualify such a design.

## Reach cache/row decoding

The eight live reader clients' original default entry budgets exceeded the fixed8GiB driver cgroup in every 1k baseline. H5's explicit10000-entry benchmark hook uses the original session-reset and full-ref-repair protocol; a fresh200-subject/two-cut equality gate and real-client protocol test passed before retries. Needed supported package surface: configurable per-client entity/byte budget with concurrency-safe reset and reference repair, rather than a benchmark prototype wrapper. A raw-row/lazy decode API for `getReachRowsMany` is a measured P5 optimization candidate, not implemented or accepted here.

No package API change was required for complete-history batching: H5 uses the existing `rows(history:true,entityIds,basis)` endpoint, with full old/new row-byte equality and unchanged W0 controller gates.
