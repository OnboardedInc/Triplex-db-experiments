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
- [x] read context  - [x] PLAN v0  - [x] research R1-R6 folded in (PLAN v1-pre, commit 8499483)
- [ ] Codex adversarial review round 1 running -> lab/reviews/plan-review-r1.codex.md (+ .log has session id)
- [ ] Codex round 2 (resume same session)  - [ ] PLAN v1  - [ ] build loop (EXP-000 brief ready)  - [ ] gen-1 dispatch
- Hourly cron ae766d26 (:07): update learnings in NOTEBOOK, launch Sonnet research if learnings raise questions.

## Running agents
| Agent | Purpose | Output |
| --- | --- | --- |
| R7 (sonnet xhigh) | XTDB page pruning, _id/IID, index-table shapes, ingest tuning; probe tx2-probe-r7:5467 (5g) | lab/research/R7-xtdb-indexing-ingest.md |
| R8 (sonnet xhigh) | QLever idempotent reapply, rebuild under load, group commit curve; probe tx2-probe-r8:7068 (5g) | lab/research/R8-qlever-write-lifecycle.md |
| R9 (sonnet xhigh) | core write/journal/schema/read plumbing for projection + repository | lab/research/R9-core-plumbing.md |
| Codex r1 (gpt-6.1-sol xhigh) | adversarial plan review | lab/reviews/plan-review-r1.codex.md |
| R1-R6 | DONE | lab/research/R1..R6 |

## Engine slots
| Slot | Holder | Ports |
| --- | --- | --- |
| probe | R7 tx2-probe-r7:5467 (5g), R8 tx2-probe-r8:7068 (5g) running now; VM 12 GiB so dev engines wait | |
| planned | dev: XTDB 5470, QLever 7070; s1..s3: XTDB 5471-5473, QLever 7071-7073 | lab/config/slots.json (EXP-000) |

## Next actions
1. On Codex r1: write lab/reviews/plan-review-r1.response.md (accept/rebut each finding), resume Codex session for round 2.
2. PLAN v1 from review; then dispatch EXP-000 (brief: lab/experiments/EXP-000-loop-harness/BRIEF.md), Opus high, on main.
3. On R9: finalize EXP-003 (repository + projection spec compiler) brief; on R7/R8: finalize EXP-005/EXP-007 briefs.
