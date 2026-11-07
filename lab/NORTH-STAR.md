# North star (Sam, 2026-11-07): what the fact store has to be tuned for

This is the hill-climb target. It is fixed; everything else in `lab/` serves it. Every brief names which of
the five priorities it moves. Every hourly learnings pass and every promotion decision rereads this file first.

Sam's words, verbatim:

> What the fact store has to be tuned for
>
> Short answer: this is not mainly a write problem. Writes are small and the average rate is modest. The store
> has to be tuned for five things, in this order:
>
> 1. Many concurrent reads, each pinned to an exact point in time, that never block writers.
> 2. Small, atomic, idempotent commits per subject, with low latency, because a person is waiting on the next step.
> 3. An ordered, resumable change feed, so the runtime knows which subjects to re-run.
> 4. A fast path to current values, kept separate from history.
> 5. Release activation: re-evaluating up to 100k subjects without hurting live traffic.

## How the loop uses this file

1. **Priority order decides ties.** When two experiments compete for an agent slot, an engine slot or the
   orchestrator's attention, the one that moves the higher-ranked priority goes first.
2. **Every brief has a "North star" line** naming the priority it moves and the measurement that will show it.
   A brief that moves none of the five needs a stated reason (for example a correctness floor the five depend on).
3. **Correctness is the floor, not the target.** Exact values, exact cuts and atomic commits are never traded for
   speed on any of the five.
4. **Specifics are adjustable.** The rest of Sam's pasted message (verbatim in
   `lab/research/SAM-pasted-targets-2026-11-07.md`, everything after its "Saved" line) is a suggestion. The
   orchestrator's current interpretation of it, including requirements, metrics, benchmarks and the per-layer
   engine design, lives in `lab/TARGETS.md` and may change per database as evidence arrives. This file does not change.
5. **Both engines stay in.** Sam, 2026-11-07: "do not rule out QLever ... It's ok that it fails on that [exact int64
   and decimal], we can figure out how to handle that some other way." No suggested gate eliminates an engine; a gap
   becomes a design problem for that engine, solved some other way.
