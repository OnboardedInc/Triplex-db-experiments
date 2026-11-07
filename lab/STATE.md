# Orchestrator state (read this first after any context compaction)

Updated: 2026-11-07 (gen-0, planning)

## Environment facts
- Repo: /Users/sam/projects/triplex-db-2 (git, branch main). Baseline commit f1939df = handoff archive d19428bd.
- Docker: colima profile `triplex2` (6 CPU / 12 GiB / 60 GiB). ALWAYS `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`.
  After any `colima` command run `docker context use colima` (Sam's Onboarded stack lives on the default VM).
- Images pulled in triplex2: ghcr.io/xtdb/xtdb:2.2.0@sha256:a6a42650..., adfreiburg/qlever:0.6.0@sha256:37d5ede1...
- Deps: `pnpm install --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store` done (receipt lab/research/install-receipt.log).
- References: /Users/sam/projects/triplex-db-2/references/* pinned in references/MANIFEST.json (gitignored contents).
- Agent models: research = Sonnet xhigh; coding = Opus high (commander's-intent briefs); adversarial review = Codex gpt-6.1-sol xhigh.

## Phase
- [x] read context  - [x] PLAN v0  - [x] research R1-R6 folded in (PLAN v1-pre)
- [x] Codex review round 1 (session 01a1b72e-26d6-77a1-ac09-6ab8c3b10d43): lab/reviews/plan-review-r1.codex.md,
      response lab/reviews/plan-review-r1.response.md; PLAN v1-rc committed d22ba76
- [x] Codex round 2 -> lab/reviews/plan-review-r2.codex.md; PLAN v1 written (contracts C1-C8, integrated done predicate)
- [x] Codex round 3 + round 4: READY TO EXECUTE (gated). PLAN v1.1 committed 4ddd773.
- [x] EXP-A01 acceptance contract 0.1.0-draft (88 obligations) + lab/acceptance/RULINGS.md
- [x] Codex acceptance review r1: NOT READY (16 findings, all accepted); RULINGS revised (Q1 per-cell, Q8b, Q10, Q11 reversed)
- [ ] A01 author revising to 0.2.0; then Codex re-check; then freeze 1.0.0  - [~] build loop: EXP-000 harness RUNNING on main; EXP-A01 acceptance contract RUNNING
- Hourly cron ae766d26 (:07): update learnings in NOTEBOOK, launch Sonnet research if learnings raise questions.

## Running agents
| Agent | Purpose | Output |
| --- | --- | --- |
| EXP-000 (opus high, on main) | loop harness lab/bin, slots, pool, bound receipts, dev engines | lab/experiments/EXP-000-loop-harness/REPORT.md |
| EXP-O01 (opus high, worktree, exp/O01-replay-oracle) | O-REPLAY independent Python oracle | lab/oracles/replay (branch) |
| EXP-G01 (opus high, main checkout, no commit) | hand-derived golden vectors | lab/acceptance/golden/ |
| R7 (sonnet xhigh) | XTDB pruning/IID/index-table shapes (+skew/ranges/ordered pages, extended), ingest | lab/research/R7-xtdb-indexing-ingest.md |
| R8 (sonnet xhigh) | QLever reapply/rebuild under load/group commit/durability | lab/research/R8-qlever-write-lifecycle.md |
| V-R01 (opus high, worktree verify/R01) | independent verification of exp/R01-entity-core (DONE, author PASS) | lab/experiments/EXP-R01-entity-core/VERIFY.md |
| EXP-A01 resumed (opus high) | contract 0.2.0 addressing Codex acceptance review (16 findings) | lab/acceptance/ |
| R10 (sonnet xhigh) | read-only recursion (C8); probe tx2-probe-r10 7063/5465 max 1.5 GiB | lab/research/R10-read-only-recursion.md |
| R12 (sonnet xhigh) | XTQL cookbook, 23 operations verified vs SQL; probe tx2-probe-r12 5464 max 1.5 GiB | lab/research/R12-xtql-cookbook.md |
| R13 (sonnet xhigh) | log of record + fsync durability on colima/macOS | lab/research/R13-log-of-record.md |
| DONE | R1-R6, R9 | lab/research/ |

## Briefs ready, not dispatched
- EXP-F01 (needs exclusive xtdb slot), F02/F03/F04 (dev slots) - dispatch once EXP-000 has dev engines up.
- To write: EXP-P01 presence/deletion/cascade policy draft (Q9), EXP-R02 (after G01 reviewed), EXP-F05 QLever fault injection (after R8), EXP-O01 oracle (after A01), EXP-001/002 baselines (after EXP-000),
  EXP-Q03 QLever order keys + EXISTS helpers (after QLever baseline).

## Engine slots
| Slot | Holder | Ports |
| --- | --- | --- |
| probe | R7 tx2-probe-r7:5467 (5g), R8 tx2-probe-r8:7068 (5g) running now; VM 12 GiB so dev engines wait | |
| planned | dev: XTDB 5470, QLever 7070; s1..s3: XTDB 5471-5473, QLever 7071-7073 | lab/config/slots.json (EXP-000) |

## Next actions
1. On Codex r1: write lab/reviews/plan-review-r1.response.md (accept/rebut each finding), resume Codex session for round 2.
2. PLAN v1 from review; then dispatch EXP-000 (brief: lab/experiments/EXP-000-loop-harness/BRIEF.md), Opus high, on main.
3. On R9: finalize EXP-003 (repository + projection spec compiler) brief; on R7/R8: finalize EXP-005/EXP-007 briefs.
