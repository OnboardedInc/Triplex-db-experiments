# EXP-N01 north-star benchmark driver (NS gate)

**North star:** measures all five priorities (P1 to P5). This is the hill-climb's fitness function; nothing can be tuned
until it exists.
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md (sections 1 and 2 define every measurement, bar and the fixed
writer trace). Inherited homebase load harnesses are for code facts only.

## Commander's intent
One command, `node lab/bin/gate.mjs NS --lane xtdb|qlever --rung 10k|100k|1m|10m [--composition ...]`, runs the fixed writer trace
from TARGETS section 2 against a Triplex runtime on a harness slot, runs the measurements of TARGETS section 1 (P1 reader ladder
1/4/16/64/256 plus 1,024 stress; P2 commit latency and read-your-own-write; P3 feed lag, gaps and resume; P4 subject pull;
P5 sweep of up to 100k subjects at a pinned basis with live traffic), and writes one bound receipt with every number, the bar it
was judged against, and a correctness verdict for every read it sampled. When this lands, every later experiment states its
result as a delta on these numbers, on matched runs, and the loop can climb.

## Point of view
- **Drive Triplex through its public API** (`Triples.transact`, entity reads at a basis, `transactions({ after })`, native query
  entrypoints) so the numbers describe what an application gets. Engine-specific fast paths plug in later as alternative read
  implementations behind the same driver interface; keep that interface explicit (a `Composition` object: writer, subject-pull
  reader, feed reader, sweep reader).
- **Open-loop writer, closed-loop readers.** The writer trace is open-loop on a schedule (no coordinated omission: latency is
  measured from the scheduled send time). Readers are closed-loop at fixed counts. Use HdrHistogram-style recording (write a small
  log-linear histogram in TS if no dependency is available; do not add npm dependencies to the repo without recording why).
- **Correctness-qualified goodput.** Sample reads are checked against expected answers; at minimum check read-your-own-write and
  monotonic visibility on every read, and full answers against the independent oracle (lab/oracles/replay on branch
  exp/O01-replay-oracle; read its SCHEMA.md) for a seeded sample. A wrong read counts as a failure, never as goodput.
- **Subject world generator.** Placements, workers, I-9 forms, sections, evidence, accounts and releases with refs 3 to 6 hops deep
  and 50 to 2,000 facts per subject world; deterministic from a seed; rung sizes 10k to 10m subjects. Population counts must be
  computable without materializing (for the oracle).
- **Load generation must not be the bottleneck:** run readers on Node worker threads or multiple processes; record client CPU; a run
  where the client saturates is marked INVALID.
- **Another agent (EXP-W01) is building the 20 golden scenarios on top of this driver.** Put the driver in `lab/bench/` with a
  documented API (`lab/bench/README.md`): trace definition, composition interface, metric names, receipt fields. W01 owns
  `lab/scenarios/`.

## Boundaries
Worktree branch `exp/N01-northstar-bench`. Files: `lab/bench/**`, `lab/bin/gate.mjs` (add the NS gate), receipt fields in
`lab/bin/receipt.mjs`. No changes to packages/* except tiny test-only exports if unavoidable (say why). Engines via the harness
slots; use an exclusive slot (s1) for measured runs and record co-runners. Smoke at 10k on both lanes; 100k if time allows.

## Gates
- `node lab/bin/gate.mjs NS --lane xtdb --rung 10k` and `--lane qlever --rung 10k` produce bound receipts with all P1 to P5 numbers
  (P5 at a sweep size the rung supports), correctness verdicts, bars, and INVALID flags where the client saturated.
- Driver unit tests (trace determinism, histogram accuracy, scheduled-time latency) pass in G0.

## Report
Result class, receipts, the first A0 numbers for both lanes, what is still synthetic, and the driver API summary for W01. ≤300 words.
