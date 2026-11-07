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
