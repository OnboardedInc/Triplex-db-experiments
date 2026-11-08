# EXP-J01 bytes and triples per commit on both lanes (P2; also P3 and P5 through QLever delta growth and storage)

**North star:** P2 (small atomic commits with low latency). Every byte and triple a commit writes is paid on the commit path and again on
every later read and rebuild: QLever's update cost grows with its delta, and XTDB's per-commit volume decides how far the history rungs
can go (EXP-P2X stopped near 25k commits because each one cost about 250 KB of slot volume). **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md,
lab/TARGETS.md 1.1 and 2.1; rulings Q50c and Q51d-f (lab/acceptance/RULINGS-PENDING.md); journal rulings Q14b, Q30, Q49a (erasure commits
carry identities only) and G7.journal.logical-contract in lab/acceptance/ACCEPTANCE.md.

## Commander's intent
Account for every byte (XTDB) and every triple (QLever) that one 10-fact command writes, on A0 and on the two candidates, name the source
of each, and cut the dominant source behind an option without changing the logical journal. Done means a table that adds up to the
measured totals, and one candidate encoding that writes at least 3x less per command on each lane with the journal still logically
identical (the oracle comparison and G1 still pass).

## Known numbers to explain
- XTDB A0: 27,581 bytes of source log per 10-fact commit; the subject-stamp candidate (exp/P2X-xtdb-commit-feed): 95,364 bytes (probe p10
  under lab/experiments/EXP-P2X-xtdb-commit-feed/probes/ on that branch; the suspect is an always-NULL second parameter column per stamped
  column introduced by the heap fix); about 250 KB of slot volume per trace-sized commit.
- QLever A0: about 750 triples per 10-fact command against R17's estimate of 94 (lab/research/R17-qlever-northstar-fit.md); the broker
  candidate (exp/P2Q-qlever-log-broker) publishes up to 64 commands per guarded update.

## Point of view
1. **Phase 1, audit (do this first, mostly reading):** read packages/core/src/store/transactionMetadata.ts (the journal: `:_tx/change`
   facts embed each triple's value inside a change, written as a JSON-valued assertion), packages/core/src/store/writeEventUtils.ts,
   packages/xtdb/src/XtdbStorageAdapter.ts and packages/qlever/src/QleverStorageAdapter.ts. Write down, per 10-fact command, every row or
   triple written (data, journal, claims, attempts, receipts, operation markers, outbox, ledger), and predict the totals before measuring.
2. **Phase 1, measure:** on A0, count bytes per commit on XTDB (the p10 method: source-log record size) and triples per command on QLever
   (delta size before and after one command) for 1, 10 and 50 facts. The table must add up to the measured totals within 5%.
3. **Phase 2, cut the largest source** with a candidate encoding behind an option (default off, A0 unchanged). Likely levers: journal
   changes that reference the data assertion by id instead of copying its value; one journal record per command instead of per triple;
   dropping derivable rows; for the P2X candidate, a single sign-encoded ordinal column or typed NULLs. Keep Q49a (erasure commits carry
   identities only, earlier change values re-rendered as markers) and Q14b (bit-exact typed values in the journal) true.
4. **Measure the effect on P2:** same slot, same window, interleaved A0/candidate: bytes per commit, triples per command, and commit
   service time (1 writer, closed loop, 10 facts) on a fresh engine and after 10k commits.

## Predictions (falsifiable)
- The journal (values copied into `:_tx/change` facts) is more than half of A0's bytes on XTDB and more than half of its triples on QLever.
- The candidate cuts bytes per commit and triples per command by at least 3x on each lane, and XTDB service time after 10k commits by at
  least 1.5x.

## Boundaries
- Worktree branch `exp/J01-bytes-per-commit`. Files: packages/core/src/store/** (journal encoding, behind an option), the write paths of
  packages/xtdb and packages/qlever behind the same option, tests, and lab/experiments/EXP-J01-bytes-per-commit/**. Read but do not edit the
  P2X and P2Q branches; report what their encodings add.
- Engines: the shared dev residents only (tx2-xtdb-dev :5470, tx2-qlever-dev :7070) through lab/bin/heavy.mjs, short runs, using fresh
  scopes; never recreate, stop or restart them. The pool is full, so no exclusive slots. Docker only with
  DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through lab/bin/engine.mjs. Never touch /Users/sam/projects/triplex-db or ports
  15442 and 17019. The host is saturated: judge time only relatively (same window, interleaved).
- pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Subagents, if any: Opus only, never fork.

## Report (return as text; the orchestrator saves it as REPORT.md)
The per-source table for each lane and arm with predicted and measured totals; the candidate encoding and its option; before/after bytes,
triples and service time; G1 results on both lanes with the option off and on; the journal-equivalence evidence; final commit hash.
