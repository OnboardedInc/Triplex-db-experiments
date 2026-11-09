# EXP-DF01: lane D feed route (offline first)

Source: R41 section 4.3 E6 (lab/research/R41-*.md), R29 (lab/research/R29-datomic-lane-design.md, the gateway design and section 2.2),
rulings Q89d and Q90c (lab/acceptance/RULINGS-PENDING.md). Builder Codex medium; reviewer Codex high. Base: exp/FD01-feed-contract
731e10e4 (accepted offline, verify/FD01 c20526eb; includes lane D's DA00/DA01 from contract 0.3.13).

**North star:** P3 on lane D (ordered resumable feed), measured by FD01's conformance suite run on the Datomic adapter, then EXP-P3M's
driver. Sam's 2026-11-08 goal keeps the Datomic lane running in parallel with lanes X and Q.

## Build

1. The gateway route `GET /v1/db/{db}/log?fromT=&limit=&waitMs=`: a long-poll woken by `tx-report-queue`, reading `d/tx-range` from the
   checkpoint t (start inclusive, end exclusive).
2. Map t to positions through the position-to-t map (Q89d). Project identity datoms only (R29 section 2.2 row 6).
3. Read the Triplex stamp from the transaction's annotation, never `:db/txInstant` (Q90c). List transactions that are not Triplex commits
   as skipped, not dropped silently.
4. The consumer store is FD01's host SQLite store, not a Datomic transaction (R41-b; amends R29:244).
5. A Datomic FeedSource adapter for FD01, so FD01's conformance suite runs on lane D unchanged.

## Gates (offline, against a fake report queue and recorded tx-range pages, plus the dev-storage peer only when the orchestrator unparks it)

1. FD01's conformance suite on the Datomic adapter: gaps, order, payload, resume byte-identical to first delivery, duplicates, the
   M-FEED-GAP mutation control caught.
2. Resume across an excision batch is byte-identical.
3. A peer restart loses the report queue, and the route resumes from the log alone (R29:359).
4. A non-Triplex transaction appears as skipped with its t.
5. G0. Do not edit lab/acceptance; list any pin you move.
