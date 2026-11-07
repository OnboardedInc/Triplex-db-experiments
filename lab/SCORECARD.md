# Scorecard (v2, 2026-11-07): fitness for Sam's five priorities

Scope: `lab/SCOPE.md`. Fitness: `lab/NORTH-STAR.md`. Bars and the golden scenarios: `lab/TARGETS.md`. Fresh evidence from this
checkout only. Cell values: OPEN, MEASURED(<value, receipt>), PASS(<receipt>), GAP(<documented workaround>).

## 1. North star (measured per composition; read priorities also per surface)

| Priority | all-XTDB (XTQL) | all-XTDB (SQL) | all-QLever (+log) | XTDB SoT + QLever reads | QLever SoT + XTDB reads |
| --- | --- | --- | --- | --- | --- |
| P1 pinned reads never block writers | OPEN | OPEN | OPEN | OPEN | OPEN |
| P2 small atomic idempotent commits, low latency | OPEN | (shared with XTQL) | OPEN | OPEN | OPEN |
| P3 ordered resumable change feed | OPEN | (shared) | OPEN | OPEN | OPEN |
| P4 fast current values, separate from history | OPEN | OPEN | OPEN | OPEN | OPEN |
| P5 release activation over 100k subjects | OPEN | OPEN | OPEN | OPEN | OPEN |

### 1.1 Research probes (direction only, not gate evidence: loaded host, not the frozen trace)

| Priority | XTDB 2.2.0, one 2-CPU node (R16) | QLever (R17) |
| --- | --- | --- |
| P1 | Pinned reads exact (0 drift), writes never blocked; at 4+ closed-loop readers commit service time rose from about 17 ms to 90-112 ms (readers and indexer share the JVM's CPU); pgwire caps connections at `server.numThreads` (42) | pending |
| P2 | Correct (RYOW 200/200, duplicates 100/100 P0004, CAS one winner); commit p50 16-24 ms, p99 33-200 ms (bars 10 and 50); 172 commits/s at 16 writers | pending |
| P3 | No native change stream; METADATA plus feed row in the same tx, one source-log tailer: lag p50 29-35 ms, p99 about 120 ms; 32 pollers on `xt.txs` stalled commits | pending |
| P4 | Flat with history: single-subject pull p50 3.95 / 3.81 / 5.34 ms at depth 1 / 3 / 10; a 4-query 40-entity pull 35-40 ms p50 | pending |
| P5 | Token pins no files; 100k subjects in about 41 s alone, 91 s under live load (bar 100 s); live pull p99 +39% (bar 1.5x) | pending |

## 2. Golden scenarios (GS gate, 20 scenarios in TARGETS.md section 6)

| Composition | Passing | Receipt |
| --- | --- | --- |
| all-XTDB | 0/20 (not built) | none |
| all-QLever (+log) | 0/20 (not built) | none |
| hybrids | 0/20 (not built) | none |

## 3. Requirements (TARGETS.md section 3)

| Requirement | XTDB | QLever |
| --- | --- | --- |
| Per-subject atomic idempotent commit, lost-ACK resolution | OPEN | OPEN |
| Snapshot reads at a named point in time | OPEN | OPEN |
| Change feed with entity, attribute, valid-time range | OPEN | OPEN |
| No silent precision loss (corrected numeric rule) | OPEN | OPEN |
| Real erasure or crypto-shredding of PII | OPEN | OPEN |
| Tenant isolation at the storage layer | OPEN | OPEN |
| Atomic path to outbox and work items | OPEN | OPEN |
| Read-your-own-write immediately | OPEN | OPEN |

## 4. Ten-goal correctness floor (closure computed from lab/acceptance/obligations.json)

| Goal | X-XTQL | X-SQL | Q-SPARQL |
| --- | --- | --- | --- |
| 1 exact types, schemas, cardinality, uniqueness, refs | OPEN | OPEN | OPEN |
| 2 expressions, arithmetic boundaries, errors | OPEN | OPEN | OPEN |
| 3 plans, costing, admission, recursion | OPEN | OPEN | OPEN |
| 4 absence and negation at coherent cuts | OPEN | OPEN | OPEN |
| 5 aggregates, typed groups, empties | OPEN | OPEN | OPEN |
| 6 cancellation, deadlines, resources, cleanup | OPEN | OPEN | OPEN |
| 7 atomic writes, receipts, migration, recovery | OPEN | OPEN | OPEN |
| 8 bounded reuse, publication, maintained supports | OPEN | OPEN | OPEN |
| 9 bitemporal intervals, presence, corrections, deletion, cascades | OPEN | OPEN | OPEN |
| 10 public TS/schema integration, cursors, lifecycle, capabilities | OPEN | OPEN | OPEN |
| R entity API ("ORM") and raw queries make sense | OPEN | OPEN | OPEN |

## 5. Gate receipts so far (A0 controls on today's adapters)

| Gate | XTDB | QLever |
| --- | --- | --- |
| G0 | PASS `G0-xtdb-20261107T190435Z-3bbfe6` | PASS `G0-qlever-20261107T184305Z-5edbe5` |
| G1 unchanged44 | PASS 88/88 `G1-xtdb-20261107T190528Z-50077c` | FAIL 0/88 (OOM at 2.5 GiB) `G1-qlever-20261107T185736Z-ea0be5`; EXP-002 running |
| G2 native142 | PASS 142/142 `G2-xtdb-20261107T190622Z-f59e9c` (strict XTQL 0, SQL 58, hybrid 13) | no receipt yet |
| NS, GS | not built | not built |
- QLever baseline (EXP-002, merged 85aba57): G0 PASS 916 `G0-qlever-20261107T190644Z-50f7a4`; G1 PASS 88/88 (f1, planner 1)
  `G1-qlever-20261107T191405Z-e08600`; G2 PASS 142/142 `G2-qlever-20261107T200815Z-fdd70e` (planner 100) and
  `G2-qlever-20261107T200954Z-594199` (planner 1); G4 FAIL as expected (16 counterexample executions) `G4-qlever-20261107T201137Z-d6a89e`.
- Wire exactness falsifier (EXP-F02, merged 7247c82): partly falsified, 5 silent changes; fixes in EXP-F02b.
