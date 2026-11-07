# Sam's pasted tuning targets, 2026-11-07 (verbatim from his messages)

Sam's ruling on how to use this text: the five priorities (part 1) are the north star for the hill-climb (copied into
lab/NORTH-STAR.md). Everything after the "Saved:" line is a suggestion the orchestrator may adjust per database. Sam,
2026-11-07: "No do not rule out QLever ... It's ok that it fails on that [exact int64 and decimal], we can figure out how to
handle that some other way." Only this pasted text is in scope; Sam did not intend the full analysis file to be used.

---

What the fact store has to be tuned for

Short answer: this is not mainly a write problem. Writes are small and the average rate is modest. The store has to be tuned
for five things, in this order:

Many concurrent reads, each pinned to an exact point in time, that never block writers.
Small, atomic, idempotent commits per subject, with low latency, because a person is waiting on the next step.
An ordered, resumable change feed, so the runtime knows which subjects to re-run.
A fast path to current values, kept separate from history.
Release activation: re-evaluating up to 100k subjects without hurting live traffic.

Saved: analysis/fact-store-workload-properties-2026-11-07.md. It holds all four rounds, the ranked list, the engine fit and a
benchmark suite.

 WRITES (small, per subject)                     READS (many, pinned to a time)
 people  ─ evidence  ─┐                      ┌─ reconcile pull per subject          HOT
 systems ─ signals   ─┤  one command =       ├─ projections (lists, API, MCP, UI)   HOT
 agents  ─ proposals ─┤  one atomic commit   ├─ change feed → who to re-run         HOT
 runtime ─ outcomes  ─┘  per subject         ├─ release sweep / plan impact         WARM
 releases (rare, big)                        ├─ explain / audit at a past time      COLD
            ▼                                └─ analytics                           COLD
   append-only log = source of truth

1. What writes look like
Shape: 5 to 50 facts in one command, all about one subject, plus a blob reference for documents. The sources are people
(evidence, decisions), systems (signals, often duplicated), agents (proposals), and the runtime (action outcomes).
Volume (my estimate):
About 1,300 placements a day, from the 116k-a-quarter forecast.
At 300 to 1,000 facts each, that's 5 to 15 facts/s on average, with peaks 10 to 50 times higher.
Retained history grows to 150M to 500M facts a year.
What matters:
Commit latency. The person is waiting.
Idempotency. Webhook retries and lost acknowledgements.
Ordering per subject.
A separate bulk lane, so imports can't starve live reads.
Cheap retroactive corrections ("the address was wrong since October") that correctly invalidate derived state.

2. What reads look like, given those writes
Read | Shape | Needs
Reconcile pull (hottest) | One subject's world at a point in time. A bounded subgraph, 3 to 6 hops, 50 to 2,000 facts | Fast
current-value lookup by tenant, entity and attribute; ref traversal; an exact snapshot
Change feed | "What changed since tx T?" | Gap-free, resumable, ordered per subject
Lists, API, MCP | Filter and sort across subjects within a tenant | Served from maintained projections, not raw triple joins
Release sweep / plan | Reconcile 10k to 100k subjects at one point in time | A long snapshot that doesn't block writers
Explain / audit | Reads at a past point in time | A history index; reproduces bit for bit

Every write triggers reads. One form submission causes a reconcile, dependency lookups, projection updates and UI refreshes. I
estimate 10 to 100 reads per write.

So read-your-own-write must be immediate. The reconcile right after a commit must see it. That's the one place eventual
consistency would surface as a bug users can see.

3. Concurrency and transactions
Write transaction:
Scope: one command for one subject. It is atomic: facts, journal and receipt, plus ideally the outbox and next wakeup.
Conflicts: optimistic compare-and-set on the subject's last position.
Ordering: serial per subject, parallel across subjects.
Not needed: global serializability.
Read transaction:
Every read names its point in time: valid time and record time.
No locks: readers never block writers. An append-only log with snapshots makes this natural.
Long reads: sweeps should pin a position in an immutable log, not hold a long-lived database transaction.
Load target: your 256 concurrent readers, 1,024 under stress, measured with a fixed writer trace running.

4. The world definition and the runtime at the same time
A release is immutable and content-addressed. Publishing never changes the release in use.
Activation is itself a fact ("account A uses release R from time t"). In-flight reconciles finish on the old release and the
next ones use the new one. Publishing and running never need locks between them.
The runtime reads a compiled copy of each release, cached by its hash. The triples are for querying, explaining and
versioning, not for the hot path.
Activation drives a sweep. Diff the old and new releases, use the dependency index to find the affected subjects, and re-run
only those.
Rate the store must feed: about 1,100 subject pulls per second per core, to match the reconciler's 0.8 ms per worker.

5. Must-have gates
Fail any one and the engine is out:
Per-subject atomic, idempotent commit, with lost-ack resolution.
Snapshot reads at a named point in time.
An ordered change feed that reports entity, attribute and the valid-time range affected.
Exact int64 and decimal. QLever already fails this.
Real erasure or crypto-shredding of PII.
Tenant isolation at the storage layer.
An atomic path to the outbox and work items.

The likely shape:
Source of truth: one engine as an append-only log with per-subject commits.
Read indexes on top: a current index, a history index and an analytical copy, all maintained from the change feed.
The hill-climb picks the best engine for each layer, not one engine for everything. This matches Ben's own "store as facts,
read from projections".
