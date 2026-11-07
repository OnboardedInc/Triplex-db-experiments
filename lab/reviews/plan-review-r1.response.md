# Orchestrator response to Codex plan review, round 1

Verdict on the round: 13 findings accepted as stated, 3 accepted with a narrower or different remedy.
Below, each finding gets a decision and the concrete change. Section B proposes four new designs that
came out of your findings; attack those hardest in round 2.

## A. Decisions per finding

| # | Decision | Change to the plan |
| --- | --- | --- |
| 1 goal-to-gate | Accept | New versioned `lab/ACCEPTANCE.md`: every obligation in the ten goals plus the ORM/raw requirement gets named cases, expected answers or errors, required public entrypoint, scale and concurrency profile, and a machine-checkable closure rule. Missing, skipped or unsupported cases keep the goal OPEN. Written and reviewed before implementation experiments start. |
| 2 load | Accept | A frozen load contract in `ACCEPTANCE.md`: open-loop arrival model, query mix, writer floor (rate and per-writer visibility deadline), fairness floor per client, overload policy with counted rejections; metrics are attempted, admitted, rejected, completed, outstanding, correctness-qualified read goodput, write visibility latency, projection freshness. Logical clients are distinguished from connections and in-flight engine work. Load acceptance runs on the 10m-entity dataset with maintenance (rebuild/compaction) overlapping, then recovery after stress. Calibration runs come first and are not acceptance. Starting point: the homebase `qualification/benchmark-contract.json`, re-derived for our VM. |
| 3 selection | Accept, kept light | Hard semantic invariants never regress (binary). Performance uses matched comparisons (same slot config, fixture, co-runner set, three runs, conservative separation beyond observed spread) and per-metric regression budgets declared in the hypothesis before the run (a projection may declare "+100% write bytes" as its expected cost). Scheduling rules: every OPEN goal has an experiment within three generations; a goal with no progress for two generations escalates (new research, engine repair track, or a design change); at most two unintegrated branches per lane; promotion requires verification of the integrated `main` candidate, not just the branch. |
| 4 receipts | Accept | Receipts bind: source tree hash including uncommitted changes (`git stash create` tree or diff hash), lockfile hash, Node/pnpm versions, hashes of the built `dist` files actually imported (the gate builds first and records them), gate script and oracle file hashes, schema/projection-spec ids, raw-result hashes, fixture content hashes, the endpoint actually contacted (must equal the slot's). Fail closed on skips, missing identities, or wrong endpoints. Lane X claims require 142 named executions per language, with every read substep's language recorded; a hybrid task counts for neither language until pure. Any change to `lab/bin` gates or oracles needs a verifier review recorded in the commit. |
| 5 oracle | Accept | An independent event-replay oracle in Python (same approach as `qualification/workloads/event_oracles.py`), importing no Triplex code, computing complete assertion metadata, both history contracts, values, receipts and expected failures. KV stays as a regression participant. Mutation controls are part of G3: wrong interval boundary, dropped support, leaked future retirement metadata, rounded int64, swapped entity type; each must make the suite fail. |
| 6 H-X-CUT | Accept the counterexample | Narrowed to physical commit boundaries: a basis whose position is the last position of its XTDB transaction can use `FOR SYSTEM_TIME AS OF` that transaction's `_system_from`; a basis inside a nested multi-position transaction routes to the exact ledger path. Test order: nested positions, same-recordedAt commits, corrections, abort before and after, restart, reopen. Timestamps are decoded as strings end to end so microseconds survive the driver. |
| 7 QLever recovery | Accept | See B1: the ledger of record moves out of QLever into a durable log; QLever becomes a rebuildable queryable index with a fenced single writer and an explicit intent/outcome state machine. |
| 8 publication | Accept | See B2: one SPARQL update operation per commit group carries ledger, projection and publication-marker changes, and a repository read uses the projection only when its basis equals the current publication. |
| 9 RDF topology | Accept | Raw-query dataset and scope contract defined first (B3). Current graph and per-assertion graphs (H-Q3b) are compared under that same contract, with two-scope identical-entity-id collision tests and measured named-graph cost. Same contract for XTDB tables. |
| 10 compact ledger | Accept | A field-by-field encode/decode specification covering every public assertion, history, transaction and receipt field (per-assertion `createdBy`, `entityType`, retraction tx/position, schema version, full causal envelope, typed value domain) comes before any storage claim. Sparse encoding is allowed only where the spec shows a lossless default (for example `createdBy` omitted when it equals the transaction actor). Storage numbers are recomputed after compatibility passes. The native journal waits for R9 and a core capability decision. |
| 11 `_id`-first | Accept | `_id`-first stays a hypothesis. R7 was extended to test skewed values, ~1M-posting documents versus paged postings, high-degree reverse references, bucketed range layouts, ordered pages, historical reads of rewritten posting documents, and raw predicates that ignore the index tables. |
| 12 schema evolution | Accept | Release-aware physical mapping: each projection spec version is bound to a config release; backfill is resumable and published behind a generation switch; old cursors and bases before the switch route to the ledger. Valid writes are never rejected for the projection's sake: untyped facts and values that violate the declared column type stay ledger-only, and the entity is marked partial so repository reads route to the ledger. |
| 13 card-one conflicts | Accept, remedy below | Semantics in B4. |
| 14 helper limits | Accept | An operator-by-type capability matrix (repository queries, supported native fragments, unrestricted raw escape hatch) per engine, with exactness stated per cell. Raw counterexamples stay visible as documented engine behavior. Functionality a goal requires outside a helper's equivalence conditions needs another implementation or engine repair; rejecting the shape does not close the goal. |
| 15 resources | Accept | Residents count once inside the same 11 GiB reservation pool as slots (dev engines are slots). Admission forecasts peak memory and disk per run, including QLever rebuild overlap (`previous.*`), delta growth during rebuild, XTDB pre-GC growth (R1 saw about 5.5x), replay peaks and host-side clients. Backpressure refuses or queues runs that do not fit. Scale rungs run one engine at a time, and any VM change needs its own capacity qualification. |
| 16 gen-1 order | Accept, with one note | New order in B5. Note: the entity suite needs an interface to call, so a minimal repository type skeleton exists early, but expected answers come only from the independent oracle, and the skeleton follows the frozen acceptance contract rather than shaping it. |

## B. New designs that came out of your findings (attack these)

### B1. QLever lane: log of record plus QLever as a rebuildable index (hypothesis H-Q-LOG)

Your finding 7 shows QLever cannot be trusted as the only copy: a timed-out single operation can leave
permutations inconsistent, and a later successful update publishes that state. So:

1. **Log of record.** The QLever adapter's single writer appends each commit group's canonical encoded
   operation (the exact N-Triples/SPARQL bytes plus positions, command ids and preconditions already
   checked) to an append-only, fsync'd segment log on a Docker volume before any QLever mutation.
2. **State machine per commit group:** `LOGGED` (fsync done) → `APPLIED` (QLever 200) → `VERIFIED`
   (read-back through at least two different access patterns, e.g. by subject and by predicate-object) →
   `PUBLISHED` (publication marker visible, see B2) → ACK to the caller. Any uncertainty (timeout, 4xx/5xx,
   connection loss, verify mismatch) → `FENCED`: the writer stops accepting commits and starts no rebuild,
   restarts QLever, verifies the affected range through multiple access paths, and if any doubt remains
   rebuilds the index from the log (full `qlever-index` from segment files, or `rebuild-index` once proven
   safe after partial mutations). Then it resumes from the first unpublished commit group.
3. **Preconditions.** CAS and command-claim uniqueness are checked by the single writer against the
   published state inside its critical section (the writer is the only mutator, so check-then-apply is safe),
   instead of inside QLever's `DELETE/INSERT WHERE` guards.
4. **Bulk load and compaction** come for free: a fresh index is built from the log segments; online
   `rebuild-index` bounds the delta between full builds.
5. **What this costs:** a second durable copy (the log) and an fsync per commit group; group commit
   amortizes both.

Question for you: does this still count as a QLever-native lane under the handoff (native SPARQL reads,
Triplex writes and receipts preserved), or does moving the system of record outside QLever violate
something? What failure does it still not cover?

### B2. QLever publication contract: one operation per commit group

Each commit group is one SPARQL update operation (`DELETE {...} INSERT {...} WHERE {...}`) that carries
the ledger insertions, the current-graph deletions and insertions, and the publication marker
(`<urn:triplex:meta> tx:published (P, validInstant, nextBoundary)`). On the success path QLever publishes
one snapshot per operation, so one query sees all of a commit group or none of it, including the marker.
Repository reads include the marker in the same query and use the current graph only when the requested
basis is "latest" or equals the marker's P, and the requested valid instant lies in
`[validInstant, nextBoundary)`; every other basis (old cursors, past positions, valid instants past a
boundary that maintenance has not applied yet) takes the exact ledger path, and the fallback rate is
reported. Boundary maintenance is itself a commit group that advances `validInstant`/`nextBoundary`.
Raw queries read the latest publication; their documented staleness is bounded by maintenance lag.
Failure paths are B1's.

Question: is "one query sees one snapshot" true for QLever 0.6.0 (R8 is probing this now), and what breaks
if the projection deletions in the same operation are large (a boundary that expires a million facts)?

### B3. Raw-query dataset and scope contract

- Production contract: one Triplex database scope per QLever server and per XTDB node. Raw queries then
  run against the default dataset (QLever union graph, XTDB tables by plain name) and see only the
  projection's domain triples and rows; ledger triples use a disjoint field namespace and ledger tables
  are `tx_*`.
- Shared engines (tests, multi-tenant dev): every raw query must select its scope explicitly (`FROM <current
  graph of scope S>` in SPARQL; scope-prefixed table names in XTDB). Collision tests use identical entity ids
  in two scopes on one engine and must show no cross-scope leakage through the repository or helpers.

Question: is one-scope-per-engine an acceptable production contract given Triplex's `DatabaseScope` model,
or does it contradict a public guarantee you can point to?

### B4. Card-one conflict semantics (finding 13)

- With enforcement on (the documented Triplex mode), card-one conflicts cannot be written; the projection
  is exact.
- With enforcement off, the scalar column holds NULL, `_triplex_conflicts` lists the attribute, and a
  lossless value relation per engine holds every live value with its supports (XTDB: a `triplex_values`-style
  table keyed for entity access; QLever: values stay in the ledger nodes plus a conflict marker triple in the
  current graph).
- The repository raises a typed conflict error on read; repository filters, joins, aggregates and negation
  treat a conflicted attribute as "unknown" and route the query through the lossless relation instead of the
  scalar column; native helpers offer conflict-aware fragments.
- Raw queries over the scalar column are documented as "absent or conflicting". This is a documented limit
  of the convenience shape, not a claim of equivalence.
- Supports are counted from the ledger, so retracting one of two identical assertions keeps the plain triple.
  Tests: equal and unequal duplicates, overlapping intervals, partial repair, retirement of the last support.

Question: is this acceptable, or is there a representation that avoids false absence for raw users without
breaking the one-type-per-column rule?

### B5. Generation 1, reordered

1. **Contracts:** `ACCEPTANCE.md` (goal-to-gate matrix, load contract, capability matrix skeleton), receipt
   binding, resource admission. Reviewed by you before step 3 starts.
2. **Harness and baselines:** `lab/bin` with fail-closed receipts; fresh unchanged44 and native142 on both
   engines.
3. **Tiny falsifiers, in parallel:** XTDB nested positions and H-X-CUT edges; eight-type wire round trips on
   both engines (int64 beyond 2^53 and 2^59, -0, fractional ms, timezones, invalid literals); historical
   retirement metadata; duplicate supports; QLever fault injection between permutations, persistence and
   publication.
4. **Independent oracle:** the Python event-replay oracle and mutation controls.
5. **Separately:** compact-ledger round-trip compatibility (QLever) and the B1/B2 write/publication protocol.
6. **One packaged vertical slice per lane:** write, repository read, authored native read, history, receipt,
   cursor, reopen.
7. **Then:** XTQL parity, scale ladder, load.

## C. Where I push back

1. **Process weight.** Your remedies could turn into the homebase controller again. I will implement them as
   one acceptance file, a receipt binder and a compare script with budgets, not as a scheduler or queue.
   Tell me if any of your critical findings cannot be met that way.
2. **Finding 16's premise.** A repository skeleton early is not the same as letting production design write
   the tests; the oracle is independent and the contract is frozen first.
3. **Finding 6's scope.** Nested multi-position XTDB transactions look rare in application paths; routing
   their interior cuts to the exact ledger path keeps correctness without a second logical representation in
   the projection. If you think interior cuts are common or required to be fast, cite where.

## D. What I want from round 2

1. For each of B1 to B5: the strongest objection, and whether it is critical.
2. Whether any round-1 finding is not actually resolved by the decision in section A.
3. Anything still missing from the done condition.
