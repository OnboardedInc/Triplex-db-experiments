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
- [x] read context  - [x] PLAN v0  - [ ] research folded in  - [ ] Codex adversarial review  - [ ] PLAN v1
- [ ] build loop (EXP-000)  - [ ] gen-1 dispatch

## Running agents
| Agent | Purpose | Output |
| --- | --- | --- |
| R1 | XTDB 2.2 capabilities | lab/research/R1-xtdb-capabilities.md |
| R2 | QLever 0.6 capabilities | lab/research/R2-qlever-capabilities.md |
| R3 | ORM over triple stores prior art | lab/research/R3-orm-prior-art.md |
| R4 | codebase + harness map, pure tests | lab/research/R4-codebase-harness-map.md |
| R5 | QLever semantic blockers root cause | lab/research/R5-qlever-semantic-blockers.md |
| R6 | XTDB lane gap analysis | lab/research/R6-xtdb-gap-analysis.md |

## Engine slots
| Slot | Holder | Ports |
| --- | --- | --- |
| probe | R1 may use tx2-probe-r1:5461; R2 tx2-probe-r2:7061; R5 tx2-probe-r5:7062 | |

## Next actions
1. Fold R1-R6 into PLAN v1-pre.
2. Codex conversational adversarial review (2-3 rounds), save transcript to lab/reviews/.
3. Dispatch EXP-000 harness.
