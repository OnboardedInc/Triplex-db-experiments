# EXP-X02 XTQL parity: report (saved by the orchestrator from the agent's hand-back, 2026-11-08)

**Result: PROGRESSED.** Every native task runs as pure XTQL and as pure SQL; the XTQL candidate gate is not closed (timeouts only).
Branch `exp/X02-xtql-parity`, tip bf1ad4d (3 commits, 15 files). Not merged: awaiting independent verification (V-X02).

| Gate | Result | Receipt |
| --- | --- | --- |
| G0 | PASS, 931 tests (20 new), no unexpected skips | G0-xtdb-20261107T193510Z-12a4a5 |
| G1 | PASS 88/88 | G1-xtdb-20261107T194910Z-96d758 |
| G2 SQL, candidate | PASS 142/142, strict xtdb-sql 142 | G2-xtdb-20261107T200907Z-245d69 |
| G2 XTQL, diagnostic | PASS 142/142, strict xtql 142, zero hybrid | G2-xtdb-20261107T191535Z-6a787d |
| G2 XTQL, candidate | FAIL 134 and 126 of 142; every failure a 30 s timeout, none wrong or impure | G2-xtdb-20261107T195430Z-b7a17d, G2-xtdb-20261107T201247Z-f3ac1c |

- The candidate failures happened while the shared dev XTDB ran at 200% CPU (and was once OOM-killed mid-run). Re-run on an exclusive slot.
- Changes: `TRIPLEX_XTDB_NATIVE_LANGUAGE=xtql|xtdb-sql` selects the language (the harness should record it); one pinned cut per task;
  XTQL answers are bare `XTQL (...)` with XTQL `limit`; exact integer sums with a typed `integer-overflow` in both languages (fixed an R12
  recombination bug that overflowed on totals inside int64); interim XTQL recursion by depth unrolling to D ≤ 8 with a fixpoint check.
- Live checks (`x02-live-20261107T194452Z.json`): 50 controls x 2 languages 100/100 with hand-derived answers; 21/21 mutants killed; a
  writer between calls stays hidden in both languages.
- Hazards: no builder uses `= ANY` and the SQL envelope now rejects it; #6313 handled with `(p) IS TRUE` in builders 09, 12, 13, 18 and the
  reachability round; #6345: XTQL reachability refuses edge sets above 100k. **New hazard:** DECIMAL to BIGINT casts round through a double
  (1e18 + 4 reads back as 1e18); DECIMAL sums are exact only when read as text; `packages/core/src/datalog/compiler.ts:572` may be exposed.
- Follow-up: XTQL reachability (22.5 s at depth 6 against 0.6 s in SQL) and the SQL scratch-table helper are replaced by EXP-C8.
