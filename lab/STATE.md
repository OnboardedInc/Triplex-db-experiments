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

## Running agents (10 max)
| Agent | Purpose | Output |
| --- | --- | --- |
| EXP-001 (opus high, worktree exp/001-xtdb-baseline) | XTDB A0 baseline: G1 full rerun, G2 control, entry checks | receipts copied to lab/runs |
| EXP-002 (opus high, worktree exp/002-qlever-baseline) | QLever A0 baseline with R8 knobs; G1, G2, G4 counterexamples | receipts copied to lab/runs |
| EXP-X02 (opus high, worktree exp/X02-xtql-parity) | XTQL parity from R12; XTQL cut acquisition; fixed cut; no int64 wrap; controls | lab/experiments/EXP-X02-xtql-parity/ |
| EXP-O01 (opus high, worktree exp/O01-replay-oracle) | O-REPLAY oracle (corrected clock model) | lab/oracles/replay (branch) |
| EXP-G01 (opus high, main checkout, no commit) | hand-derived golden vectors | lab/acceptance/golden/ |
| EXP-A01 resumed (opus high) | acceptance contract 0.2.0 | lab/acceptance/ |
| V-R01 (opus high, worktree verify/R01) | verify exp/R01-entity-core | lab/experiments/EXP-R01-entity-core/VERIFY.md |
| R10 (sonnet xhigh) | read-only recursion (C8); probe tx2-probe-r10 | lab/research/R10-read-only-recursion.md |
| R14 (sonnet xhigh) | XTDB wrong-result hazards | lab/research/R14-xtdb-correctness-hazards.md |
| R15 (sonnet xhigh) | presence/deletion/cascade policy options | lab/research/R15-presence-deletion-cascade.md |
| DONE | R1-R9, R12, R13; EXP-000 harness (stopped after report) | |

## Briefs ready, not dispatched
- EXP-F01 (needs exclusive xtdb slot), F02/F03/F04 (dev slots) - dispatch once EXP-000 has dev engines up.
- To write: EXP-P01 presence/deletion/cascade policy draft (Q9), EXP-R02 (after G01 reviewed), EXP-F05 QLever fault injection (after R8), EXP-O01 oracle (after A01), EXP-001/002 baselines (after EXP-000),
  EXP-Q03 QLever order keys + EXISTS helpers (after QLever baseline).

## Engine slots
- dev engines up: tx2-xtdb-dev :5470 (3 GiB), tx2-qlever-dev :7070 (2.5 GiB; EXP-002 may raise). `node lab/bin/engine.mjs status`.
- s1..s3 free (3.5 GiB each) subject to the 11 GiB pool.

## Next actions
1. On V-R01: promote R01 to main if PROMOTE (merge exp/R01-entity-core), else route fixes.
2. On A01 0.2.0: Codex re-check of the contract, then freeze 1.0.0; arrange an independent review of G01 vectors; cross-check O01 vs G01.
3. On baselines: write EXP-F01/F02 dispatch (falsifiers), EXP-F05 brief (QLever fault matrix incl. R8/R13 items), EXP-Q03 (order keys + EXISTS helpers).
4. On R10: EXP-X03/Q04 read-only recursion. On R14: guards into capability matrix and native helpers. On R15: provisional G9 policy ruling.
