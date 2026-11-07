# Targets: how the hill-climb measures Sam's five priorities (v2, 2026-11-07)

The north star is fixed in `lab/NORTH-STAR.md`. This file is the orchestrator's interpretation of it and of the rest
of Sam's pasted message (`lab/research/SAM-pasted-targets-2026-11-07.md`). Sam confirmed the restatement on
2026-11-07: keep the ten-goal plan, re-tune the performance targets and requirements to the five priorities, keep both
engines possible for every layer, build each to the fullest extent, and work around what an engine cannot do.

**Threshold policy.** The numbers below are orchestrator-provisional bars derived from the pasted workload. Calibration
may tighten a bar; loosening one needs Sam. Correctness is the floor on every priority: a fast wrong answer scores zero.

## 1. The five priorities as measurements

Every priority is measured on the same fixed writer trace (section 2) with reads running, on one identified profile.

| # | Priority (Sam's words, abridged) | Measurement | Provisional bar |
| --- | --- | --- | --- |
| P1 | Many concurrent reads, each pinned to an exact point in time, that never block writers | Closed-loop readers at 1, 4, 16, 64, 256 (and 1,024 stress). Every read names its basis (valid time and record time or tx). Record correctness-qualified read goodput and p99 per level, and writer commit latency and throughput per level. | At 256 readers: zero correctness violations; read goodput does not fall from the 64-reader level; read p99 ≤ 100 ms; writer commit p99 ≤ 1.25x its zero-reader baseline and no command waits more than 2 s. At 1,024: zero violations, goodput ≥ 0.9 of the 256 level, writer commit p99 ≤ 2x baseline, back to the 256-level bar within 60 s after stress. |
| P2 | Small, atomic, idempotent commits per subject, with low latency | Commit latency for one command of 10 facts about one subject (also 5 and 50); read-your-own-write; duplicate and lost-ACK handling. | Commit p50 ≤ 10 ms and p99 ≤ 50 ms (10 facts, with P1's 256 readers running). The pull at the returned tx sees the commit 100% of the time with no extra wait. Duplicates and lost ACKs return the original receipt 100% of the time. |
| P3 | An ordered, resumable change feed, so the runtime knows which subjects to re-run | Feed entries carry tx, entity, attribute and the valid-time range affected. Lag from commit to "affected subjects known". Gaps, order per subject, resume after restart. | Zero gaps and zero order violations per subject over a run; resume from a checkpoint replays exactly; lag p99 ≤ 250 ms with P1's 256 readers running. |
| P4 | A fast path to current values, kept separate from history | Subject pull: one subject's world at the current basis, a bounded subgraph of 3 to 6 hops and 50 to 2,000 facts. Throughput per engine core; whether current reads touch history. | Single-client pull p50 ≤ 5 ms and p99 ≤ 25 ms; at least 1,100 pulls/s per engine core; current-pull latency and bytes read stay flat as retained history grows (depths 1, 3, 10). |
| P5 | Release activation: re-evaluating up to 100k subjects without hurting live traffic | Sweep 100k subjects (pull each at one pinned basis) while the writer trace and 64 live readers run. | Sweep wall time ≤ 100 s (about 1,100 pulls/s/core on one core; the reconciler reference is 0.8 ms per worker); live read p99 and writer commit p99 each ≤ 1.5x their no-sweep values; the long snapshot never blocks writers or unrelated compaction. |

### 1.1 Measurement semantics (v2, frozen before any comparison; Codex plan-v2 review findings 1 to 5)

The bars above only count when measured under these definitions. A run that departs from them cannot close an NS obligation.

**P1 pinned reads that never block writers.**
1. Readers and writers share one hot set: at least 50% of reads target subjects written in the previous 60 s (section 2.1 active set).
2. 10% of subgraph reads are issued as two or more queries at the same named basis, and the driver commits a mutation to those same
   subjects between the steps. The answer must equal the oracle's answer at the requested basis, never the latest state.
3. Every P1 window contains at least one maintenance event (XTDB compaction; QLever index rebuild or delta merge; index-layer catch-up).
4. The driver records the basis it requested (from the receipts it observed) independently of anything the engine echoes; the verifier
   checks every sampled answer at the driver-recorded basis.
5. Writer waits caused by readers are attributed two ways: writer latency at each reader level against the zero-reader run on the same
   trace segment and burst phase, and engine-side wait evidence where the engine exposes it (QLever broker queue wait; XTDB has no
   read-path locks, so its evidence is the matched-phase comparison).

**P2 commits.**
1. Open loop: commands are offered on the frozen schedule (section 2.1); latency runs from the scheduled offer time to the published ACK
   (the ACK is sent only after the commit is durable and readable), so queueing behind other writers counts.
2. The bars apply to the trace's own commands, reported per size band (5 to 10, 11 to 25, 26 to 50 facts); the p50 ≤ 10 ms and p99 ≤ 50 ms
   bars apply to the 5-to-10 band and the 11-to-25 band, and the 26-to-50 band reports p99 against a provisional 100 ms. The 10-fact
   probe stays as a diagnostic only.
3. Every offered command is accounted for: committed with a receipt, rejected with a typed error, or a typed conflict. Zero unaccounted.

**P3 change feed.**
1. Commit time is the source of truth's publication instant for that transaction (the moment it becomes readable and the ACK may be
   sent), stamped by the source on the host monotonic clock the driver also reads.
2. The cursor is (epoch, position), a total order over transactions; per-subject order follows from it.
3. The expected affected-subject set per transaction comes from the oracles: subjects written directly (O-REPLAY) plus subjects affected
   through referenced entities under the world definition's dependency rules (O-DOMAIN, section 6.1).
4. "Affected subjects known" means the consumer has durably recorded the affected-subject set and its checkpoint in one durable write.
   Lag runs from commit time to that durable record.
5. Delivery is at-least-once from the last checkpoint; consumer effects are keyed by (consumer, position, subject), so replay is
   idempotent. Visible duplicate effects must be zero; replay attempts are allowed and counted separately.
6. Crashes are injected at three points: before the effect, after the effect but before the checkpoint, after the checkpoint.

**P4 current pulls.**
1. Frozen pull buckets, weighted by count: 50% of pulls 50 to 200 facts, 35% 201 to 800, 15% 801 to 2,000; hops 3 (40%), 4 (35%), 6 (25%).
   The p50 ≤ 5 ms and p99 ≤ 25 ms bars apply to the weighted mix; each bucket reports its own p50 and p99, and the largest bucket has a
   provisional p99 ≤ 50 ms.
2. History flatness uses one matched sample of 1,000 subjects: measure at history depth 1, add corrections to the same subjects to depth 3
   and then 10, and measure again. The bar is p99 and bytes read at depth 10 ≤ 1.1x depth 1 (RULINGS Q16, Q27).
3. "Per engine core" uses the CPU quota bound in the receipt; host-side broker and kernel CPU are reported next to engine-core throughput.

**P5 release activation.**
1. A sweep evaluates release R against the world definition W0 (section 6.1) for every subject in R's scope at one shared basis, and the
   receipt binds the basis and R's content hash.
2. Coverage is exact: every in-scope subject is evaluated exactly once (the receipt carries the hash of the subject list).
3. Results are published as work items through the atomic outbox path; the expected outputs come from O-DOMAIN, independently.
4. After the basis is captured the driver mutates selected subjects; their sweep outputs must reflect the captured basis, not the mutation.
5. Wall time ≤ 100 s includes evaluation and publication. A second, throttled variant (about 10 minutes) overlaps a real compaction or
   index rebuild and must keep its basis and never block writers.

**Secondary measurements from the paste** (reported every run, bars set after calibration): bulk lane (a 1M-fact import must
not push live read p99 past 1.5x); retroactive corrections ("wrong since October": the feed reports the valid-time range and
explain at the old basis still shows the old belief); explain and audit at a past point in time (reproduces bit for bit).

## 2. The fixed workload (from the paste)

| Item | Value |
| --- | --- |
| Command shape | 5 to 50 facts about one subject, plus a blob reference for documents. Declared mix: 60% 5 to 10 facts, 30% 11 to 25, 10% 26 to 50. |
| Writers | People (evidence, decisions), systems (signals, often duplicated), agents (proposals), runtime (action outcomes). Mix 40 / 30 / 10 / 20 by command count. |
| Rate | Steady 15 facts/s (the paste's 5 to 15 facts/s average, high end); bursts at 50x (750 facts/s) for 60 s every 10 minutes. |
| Duplicates | 10% of system signals are re-sent with the same commandId; 1% of commands lose their ACK and are retried. |
| Corrections | 1% of commands are retroactive valid-time corrections 30 days back. |
| Reads per write | 10 to 100 (each write triggers a reconcile pull, dependency lookups, projection updates, UI refreshes). |
| Read basis mix | 80% at the latest committed tx (named exactly), 15% at a tx within the last hour, 5% at a past basis up to 90 days back (RULINGS Q16). |
| Conflicts | Optimistic compare-and-set on the subject's last position; serial per subject, parallel across subjects. |
| Bulk lane | Separate, throttled; imports must not starve live reads. |
| Scale | Year one: 10m entities with 100m active facts; retained history 150M to 500M facts per year. Rungs: 10k, 100k, 1m, 10m subjects. |

### 2.1 The trace generator and offer schedule (frozen before any comparison; Codex finding 2)

1. **Active set.** At any time 2% of the rung's subjects are in active onboarding (200 at the 10k rung, 200k at 10m). 95% of commands
   pick a subject from the active set with Zipf s = 1.1 over a seeded ranking; 5% pick uniformly from all subjects (corrections and late
   signals). Subjects leave the active set after 2,000 s of trace time and are replaced by seeded draws, so overlap between writers on a
   subject is real and repeatable.
2. **Command size.** Uniform within each band of section 2's 60/30/10 mix.
3. **Offer schedule.** Open loop: a Poisson process at the steady rate with seeded arrivals; bursts start at 120 s + k x 600 s from the
   start of the measured window, identical for baselines and candidates.
4. **Scenario overlay.** A golden scenario's commands are added on top of the background trace, never instead of it; both streams are
   accounted for separately in the receipt.
5. **Freeze.** The generator source hash and the seed are bound in every receipt; a change to either starts a new comparison series.

## 3. Requirements (the paste's must-haves), mapped onto the ten goals

These are requirements for both engines, not knockout gates (Sam, 2026-11-07). Where an engine cannot meet one natively,
the lane says so plainly and builds a workaround.

| Requirement | Goal | XTDB starting point | QLever starting point |
| --- | --- | --- | --- |
| Per-subject atomic, idempotent commit with lost-ACK resolution | 7 | native transactions, ASSERT for CAS, claims table | log of record plus broker (PLAN C2, C3) |
| Snapshot reads at a named point in time (valid and record time), no locks, reproducible | 9, 4 | native valid and system time; snapshot tokens; H-X-CUT | one request is one snapshot; publication marker; ledger for past bases |
| Ordered change feed with entity, attribute and valid-time range affected | 7, 8 | Triplex journal from ledger rows | the log of record is the feed |
| No silent precision loss (Sam's corrected rule, replacing "exact int64 and decimal"; `lab/research/SAM-pasted-numbers-2026-11-07.md`): exact storage and round trip for every value kind the world definition uses; order-preserving comparison for any attribute used in a range rule; a hard error, never silent conversion, for any value the engine cannot hold; integer range of at least 2^53; arithmetic over many rows only where a projection needs it | 1, 2, 5 | BIGINT, DECIMAL and VARCHAR store exactly; arithmetic in the TypeScript kernel per subject; DECIMAL(32,0) cast only where a projection sums | lexical channels and fixed-width hex order keys store and sort exactly; 60-bit integers cover 2^53; the write path rejects values outside ±2^59 instead of letting UPDATE wrap them; per-subject arithmetic in the kernel |
| Real erasure or crypto-shredding of PII (semantics in section 7) | 9 | `ERASE` or crypto-shredding (R15) | index rebuild after delete, or crypto-shredding |
| Tenant isolation at the storage layer | 10 | per-tenant storage (database or node) | per-tenant index |
| Atomic path to the outbox and work items | 7 | tables in the same transaction | records in the same log frame |
| Read-your-own-write immediately after commit | 7, 9 | same transaction for ledger and current index | publication before ACK (C2.4) |
| Long sweeps pin a log position, not a long database transaction | 6, 9 | snapshot token or system-time basis | position in the log; one request per page |
| Cheap retroactive corrections that invalidate derived state | 8, 9 | valid-time DML in the current index | ledger plus current-graph maintenance |

Money and decimals are stored as scaled integers (cents) or as decimal strings with an order-preserving encoding; floats are never
used for business values (only for approximate, deterministic values such as a risk score). Triplex has no decimal value kind
today; adding one under these rules (exact storage, order-preserving encoding, hard error on unrepresentable values, kernel-side
arithmetic) is a core change on the critical path for goal 1.

## 4. The suggested shape, as a hypothesis

The paste suggests one append-only source of truth with per-subject commits and three read indexes on top (current, history,
analytical), maintained from the change feed, with the best engine chosen for each layer. Both engines are candidates for
every layer, including the source of truth.

```
                        commands (one subject each)
                                  |
                                  v
                 +-----------------------------------+
                 |  SOURCE OF TRUTH (append-only)     |   candidates: XTDB native tx log;
                 |  per-subject CAS, receipts, claims |               QLever + log of record
                 +-----------------+-----------------+
                                   | change feed (tx, entity, attribute, valid-time range)
            +----------------------+----------------------+
            v                      v                      v
   +----------------+     +----------------+     +------------------+
   | CURRENT INDEX  |     | HISTORY INDEX  |     | ANALYTICAL COPY  |
   | P1, P4         |     | P1 past bases, |     | P5 sweeps, plan  |
   | sync for the   |     | explain, audit |     | impact           |
   | hot path       |     |                |     |                  |
   +----------------+     +----------------+     +------------------+
   candidates for each read layer: XTDB tables or QLever graphs
```

Compositions to compare (the hill-climb measures, then picks per layer): all-XTDB; all-QLever (with its log of record);
XTDB source of truth with QLever read indexes; QLever source of truth with XTDB read indexes where measurements favor it.

### 4.1 Composition identity and layer swaps (Codex finding 11; RULINGS Q28)

1. **A composition names four assignments:** source of truth, current index, history index, analytical copy, each XTDB or QLever.
2. **Receipts bind every component:** engine image digest, configuration hash and slot per assignment, plus every replication edge (feed
   consumer source hash, translation generation) and each index's watermark at read time.
3. **A basis is a source-of-truth position** (epoch, position) plus a valid time. Each read index publishes a watermark w. A read at basis
   B is served by index I only if w(I) ≥ B.position; otherwise it waits up to 250 ms (the P3 lag bar) and then routes to a fallback that
   has the position (the source of truth's own query surface, or another index), and the receipt records the route. No index ever
   answers for a basis it has not reached.
4. **ACK ownership:** the source of truth sends the ACK, and only after the current index's watermark has reached the commit's position
   (the current index is synchronous with the ACK, which is what makes read-your-own-write hold); history and analytics are asynchronous
   behind watermarks.
5. **Layers are swapped one at a time** under matched workloads at small rungs (current-index candidates fed the same feed and measured on
   P1 and P4; history candidates on past-basis reads and GS.12; source candidates on P2 and P3). Only the two or three best compositions
   go on to end-to-end validation with the golden scenarios.

## 5. Correct but not tuned (from the paste)

Global serializability is not needed. Everything in the ten goals must still be correct; only P1 to P5 and the secondary
measurements are tuned. Performance bars that do not map to a priority workload (for example a general recursion latency bar, latency
growth from 1m to 10m for arbitrary selective queries, deep-page cost) are reported secondary measurements with no authority to block
done (RULINGS Q25); bounded execution (budgets, cancellation, typed resource errors) stays a correctness obligation.

## 6. The 20 real-world golden scenarios

Sam, 2026-11-07: "create 20 real-world golden test scenarios on top of the normal performance tests that really put the system
under the load of what we're expecting." These sit on top of the NS benchmark (sections 1 and 2) and form the GS gate.

**Rules for every scenario.**

1. A seeded, deterministic generator produces the command stream and the reads; the same seed gives the same bytes.
2. Expected answers come from the independent oracles, never from a system under test: O-REPLAY for database state and values,
   O-DOMAIN for domain outputs and effects under the world definition W0 (section 6.1), or a frozen hand derivation with a citation.
3. Unless a scenario says otherwise, it runs at the year-one profile (10m entities, 100m active facts, retained history) with the
   fixed writer trace (section 2) running and 256 concurrent pinned readers.
4. A scenario fails on any wrong answer, any lost or duplicated commit, any feed gap or order violation, or any missed bar. Its
   receipt records the correctness verdicts and the P1 to P5 measurements together.
5. All 20 run on every composition being compared, and the final acceptance reruns all 20 fresh.

| # | Scenario | Real-world story and load shape | What is checked (beyond exact answers) | Priorities |
| --- | --- | --- | --- | --- |
| 1 | Monday onboarding rush | A day's 1,300 placements compressed into business hours, with a 10x burst at 9am; workers and recruiters submit forms; every commit triggers a reconcile pull | P1 and P2 bars hold through the burst; no writer waits over 2 s | P1, P2 |
| 2 | Form submit, person waiting | A worker submits I-9 Section 1 (10 facts); the reconcile pull runs immediately at the returned tx | the next task is visible on the first pull, every time; commit p99 ≤ 50 ms under scenario 1's load | P2, P4 |
| 3 | Webhook storm after an outage | 1,000 duplicate E-Verify status signals across 100 subjects in 10 s, out of order | exactly-once receipts; no read sees a half-applied command; per-subject order kept | P2, P3 |
| 4 | Lost acknowledgements and a restart | 1% of commits lose their ACK and are retried; mid-run, the engine (or QLever broker) is killed and restarted | every retry returns the original receipt; no acknowledged commit is lost; readers resume at their pinned bases | P2, P1 |
| 5 | Background-check results burst | A vendor posts results for 5,000 subjects in 5 minutes while the UI reads | live read p99 holds; the feed reports every changed subject within the lag bar | P1, P3 |
| 6 | One recruiter decision, 50 workers | A single decision fans out as 50 per-subject commands driven by persisted messages | each subject commits once, in order; no cross-subject transaction; all 50 visible to their next pulls | P2, P3 |
| 7 | Two reviewers, one I-9 | Two reviewers approve and waive the same subject at the same moment, 500 times across subjects | compare-and-set lets exactly one win per race; the loser gets a typed conflict, never a silent overwrite | P2 |
| 8 | "Address wrong since October" | Valid-time corrections 30 days back on 1,000 subjects during live traffic | the feed reports the valid-time range; derived state is re-run; explain at the old basis still shows the old belief | P3, P1 |
| 9 | Start dates move | 2,000 placement start dates shift forward and back, moving obligations | next-boundary times recompute; reads at bases on both sides of a boundary are exact | P1, P3 |
| 10 | Release activation | A new release changes 3 requirements; activation is a fact; the sweep re-reconciles 100k subjects at one pinned basis with live traffic | P5 bars (sweep ≤ 100 s, live p99 ≤ 1.5x); in-flight reconciles finish on the old release | P5, P1 |
| 11 | Plan impact preview | "Who gains work" for a candidate release over 100k subjects, without applying it, during live traffic | identical answer to the post-activation sweep; never blocks writers | P5, P1 |
| 12 | Audit: what did we know on March 3 | Explain reads at a past basis for 1,000 subjects, repeated three times while writes continue | bit-for-bit identical answers across repeats and engines; as-of pull p99 reported | P1 |
| 13 | HRIS backfill | A 1M-fact import through the bulk lane while live traffic runs | live read p99 ≤ 1.5x; per-batch receipts; the bulk lane never starves live commits | P2, P1 |
| 14 | Account factory | A new tenant is provisioned with 10k entities and its first release while other tenants are live | the new tenant is invisible to others at the storage layer; others' p99 holds | P1, P2 |
| 15 | Tenant mix | One large tenant (1m entities) and 1,000 small tenants (1k each) under the same live load | storage-layer isolation; per-tenant pull and commit bars hold for large and small tenants | P1, P4 |
| 16 | PII erasure request | Erase PII for 10k subjects (crypto-shredding or real deletion) during live traffic | values are unrecoverable from every layer; history keeps its shape; explain still works | P1, P3 |
| 17 | Agent proposals churn | Agents write drafts and proposals at 5x the human rate, most discarded | proposals never leak into decisions; pulls at a basis see exactly what was committed | P2, P4 |
| 18 | Recruiter dashboards | "Placements in this branch with an overdue I-9" lists with filters, sort and paging at 256 concurrent readers | answers come from maintained projections, match the oracle, and keep stable cursors while writes continue | P1, P4 |
| 19 | Feed consumer crash | The dependency-index consumer crashes mid-stream and resumes from its checkpoint | no gap, no duplicate processing, per-subject order kept; catch-up lag measured | P3 |
| 20 | Midnight expiry wave | 20,000 documents expire at midnight (valid-time boundaries) while morning traffic starts | every affected subject is re-run at the boundary; reads before and after midnight are exact; live p99 holds | P3, P5, P1 |

**Numbers rule inside the scenarios.** Pay rates, hours and money use scaled integers or decimal strings with order-preserving
encodings; scenarios include range rules such as "pay rate at or above $16.50" and "hours over 40", and at least one write of a
value the engine cannot hold, which must fail with a typed error.

### 6.1 World definition W0, the domain oracle and the added failure combinations (Codex findings 6 and 7)

**W0 is a small frozen world definition** used by every scenario, the P5 sweep and the P3 dependency rules. It is synthetic and stands in
for Onboarded's real world definition; it is not a product feature of Triplex.
1. About 12 rules over the domain: I-9 Section 1 and 2 tasks with due times; E-Verify status; background-check result; document expiry
   (valid-time boundaries); pay rate at or above the work location's minimum wage (a shared referenced entity, so a location change
   affects every worker there); hours over 40 (overtime); start-date boundaries; proposals never count as decisions.
2. Two releases, R1 and R2, where R2 changes three requirements; releases are content-addressed, and activation is a fact.
3. It is implemented twice: the TypeScript reference kernel the drivers call, and O-DOMAIN, an independent stdlib-only Python oracle that
   gives the expected next tasks, obligations with due times, work items and effect traces from the same command stream.
4. Plan-impact preview (GS.11) and activation (GS.10) are compared at one common input basis, never at different bases.
5. Every scenario carries positive witnesses (subjects that must change) and negative witnesses (subjects that must not).

**Failure combinations added to existing scenarios.**
| Scenario | Added schedule | Expected outcome |
| --- | --- | --- |
| GS.03 | A vendor's older revision of a status arrives after a newer one for the same subject | Acknowledged as `superseded`: no change to current values, recorded in the journal (provisional, flagged for Sam) |
| GS.04b | The current index's feed consumer is cut for 60 s while the source keeps committing | Reads at bases beyond the index watermark wait or route to a fallback per section 4.1; none answers from the stale index |
| GS.06b | A work location's minimum wage changes (one shared referenced entity) | Every worker at that location appears in the feed's affected-subject set and is re-run; no other worker is |
| GS.15 | A tenant-A route attempts to read tenant B's storage directly; one tenant's feed consumer is slowed 10x | The access fails at the storage layer; other tenants' feed lag and p99 hold |
| GS.19b | The consumer crashes after delivering an outbox item but before recording completion | The receiver deduplicates by the delivery key: exactly one externally visible effect |

## 7. Erasure semantics (Codex finding 8; RULINGS Q24)

1. **The boundary is the erasure commit's publication.** A read that started before the erasure published may return the old value; every
   read that starts after it, at any basis including bases before the erasure, returns a typed erased marker (`ErasedValue {erasedAt}`)
   in place of the value. Assertion identities and valid and record intervals keep their shape. (Provisional, flagged for Sam: explain at
   a pre-erasure basis shows the marker, not the value.)
2. **Reproduction holds modulo erasure.** Cursor stability, bit-for-bit explain and GS.12 compare answers with erased values replaced by
   their markers.
3. **Protected-copy inventory.** Every lane lists every place a protected value or anything derived from it lives: source log and journal,
   current index, history index, analytical copy, order-key and lexical channels, the QLever broker's log of record, caches, checkpoints,
   backups. Erasure must reach each one, or the value must be stored only under a per-subject key that is destroyed (crypto-shredding).
4. **Derived channels count.** An order key reveals ordering, so a PII attribute's order key is either inside the encrypted envelope (range
   rules on PII then run in the kernel after decryption) or the attribute is not eligible for range rules.
5. **Restore re-applies erasure.** The erasure ledger is kept apart from the data and replayed after any restore or rebuild.
6. **Tests:** a reader already pinned when the erasure lands; a rebuild after erasure; a restore from a pre-erasure backup; independent
   post-erasure expected answers from the oracle.
