# Targets: how the hill-climb measures Sam's five priorities (v1, 2026-11-07)

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

## 3. Requirements (the paste's must-haves), mapped onto the ten goals

These are requirements for both engines, not knockout gates (Sam, 2026-11-07). Where an engine cannot meet one natively,
the lane says so plainly and builds a workaround.

| Requirement | Goal | XTDB starting point | QLever starting point |
| --- | --- | --- | --- |
| Per-subject atomic, idempotent commit with lost-ACK resolution | 7 | native transactions, ASSERT for CAS, claims table | log of record plus broker (PLAN C2, C3) |
| Snapshot reads at a named point in time (valid and record time), no locks, reproducible | 9, 4 | native valid and system time; snapshot tokens; H-X-CUT | one request is one snapshot; publication marker; ledger for past bases |
| Ordered change feed with entity, attribute and valid-time range affected | 7, 8 | Triplex journal from ledger rows | the log of record is the feed |
| No silent precision loss (Sam's corrected rule, replacing "exact int64 and decimal"; `lab/research/SAM-pasted-numbers-2026-11-07.md`): exact storage and round trip for every value kind the world definition uses; order-preserving comparison for any attribute used in a range rule; a hard error, never silent conversion, for any value the engine cannot hold; integer range of at least 2^53; arithmetic over many rows only where a projection needs it | 1, 2, 5 | BIGINT, DECIMAL and VARCHAR store exactly; arithmetic in the TypeScript kernel per subject; DECIMAL(32,0) cast only where a projection sums | lexical channels and fixed-width hex order keys store and sort exactly; 60-bit integers cover 2^53; the write path rejects values outside ±2^59 instead of letting UPDATE wrap them; per-subject arithmetic in the kernel |
| Real erasure or crypto-shredding of PII | 9 | `ERASE` or crypto-shredding (R15) | index rebuild after delete, or crypto-shredding |
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

## 5. Correct but not tuned (from the paste)

Global serializability is not needed. Everything in the ten goals must still be correct; only P1 to P5 and the secondary
measurements are tuned.

## 6. The 20 real-world golden scenarios

Sam, 2026-11-07: "create 20 real-world golden test scenarios on top of the normal performance tests that really put the system
under the load of what we're expecting." These sit on top of the NS benchmark (sections 1 and 2) and form the GS gate.

**Rules for every scenario.**

1. A seeded, deterministic generator produces the command stream and the reads; the same seed gives the same bytes.
2. Expected answers come from the independent oracle O-REPLAY (or a frozen hand derivation), never from a system under test.
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
