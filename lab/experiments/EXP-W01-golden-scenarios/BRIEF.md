# EXP-W01 the 20 real-world golden scenarios (GS gate)

**North star:** all five priorities under the load Onboarded actually expects (Sam: "20 real-world golden test scenarios on top of
the normal performance tests that really put the system under the load of what we're expecting").
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md; the 20 scenarios and their rules are TARGETS section 6. Inherited
homebase files are for code facts only.

## Commander's intent
Each of the 20 scenarios in TARGETS section 6 becomes a seeded, deterministic, executable scenario with golden expected answers
from the independent oracle and declared load bars, runnable as `node lab/bin/gate.mjs GS --lane xtdb|qlever [--scenario N]
[--rung ...]`. When this lands, every composition the loop compares (all-XTDB, all-QLever, hybrids) is judged on the same 20
real-world stories, and the final acceptance can rerun them fresh.

## Point of view
- **Golden means independent.** Expected answers come from O-REPLAY (lab/oracles/replay on branch exp/O01-replay-oracle; read
  SCHEMA.md and RULES.md) fed with the scenario's command stream, never from a system under test. Where O-REPLAY lacks a rule a
  scenario needs (erasure, presence, tenancy, release activation as a fact), write the scenario's expectation by hand with a
  citation, and list the gap for the orchestrator.
- **Scenarios are data plus a script.** `lab/scenarios/<NN-slug>/scenario.json` (seed, profile, command generator parameters,
  reads with bases, bars, fault injections) plus `run.mjs` using the NS driver's composition interface from EXP-N01 (another agent
  is building `lab/bench/` in parallel; agree on its README API; until it lands, code against the interface described in
  lab/experiments/EXP-N01-northstar-bench/BRIEF.md and keep an adapter seam).
- **Real-world shapes from TARGETS section 2:** commands of 5 to 50 facts about one subject; people, systems, agents, runtime writers;
  duplicates; lost ACKs; corrections 30 days back; releases as immutable content-addressed configuration with activation as a fact;
  money and pay rates as scaled integers or order-preserving decimal strings with range rules ("pay rate at or above $16.50", "hours
  over 40"); at least one unrepresentable value per numeric scenario that must fail with a typed error.
- **Build in order of value:** scenarios 2, 3, 4, 7, 8, 10, 12, 19 first (they exercise P2, P3 and exact pinned reads directly), then
  the rest. Each scenario is useful at the 10k rung before the 10m rung exists.
- Fault injection (engine kill/restart, ACK loss, consumer crash) goes through the harness slots on an exclusive slot.

## Boundaries
Worktree branch `exp/W01-golden-scenarios`. Files: `lab/scenarios/**`, the GS gate in `lab/bin/gate.mjs` (coordinate: N01 edits the
same file for NS; keep your change a small separate function and rebase if needed). No packages/* changes. Merge the O01 branch into
your worktree to use the oracle (do not modify it; report oracle bugs).

## Gates
- All 20 scenario specs exist with expectations; at least the first 8 run end to end at the 10k rung on both lanes with bound receipts
  (PASS or FAIL with first failures). Expectation generation is reproducible (same seed, same bytes).

## Report
Result class, per-scenario status table (spec, expectations, runs on xtdb/qlever, verdict), oracle gaps, and receipts. ≤300 words.
