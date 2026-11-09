# NS north-star bench (EXP-N01)

The hill-climb fitness function. One command measures Sam's five priorities (`lab/NORTH-STAR.md`) under the
measurement semantics of `lab/TARGETS.md` v2 (sections 1.1, 2.1, 4.1; RULINGS Q16, Q27, Q28, Q31a-d) and writes
one bound receipt.

```sh
node lab/bin/gate.mjs NS --lane xtdb|qlever --rung 10k [--slot s1] [--ns-profile smoke|screening|acceptance] \
  [--zero-readers [--match-duration-s S]] [--baseline RUN-ID] [--composition public] [--exp EXP-NNN]
node --test lab/bench/test/bench.test.ts        # unit tests (also run by G0)
```

A comparison needs two runs on the same trace: a **zero-reader run** (`--zero-readers`, the matched baseline for
writer attribution, TARGETS 1.1 P1 item 5) and the **ladder run** with `--baseline <zero-reader run id>`. Without a
baseline the receipt is INVALID for writer attribution. Profiles: `acceptance` (120 s warmup, 600 s per level; the only
one that can close an obligation), `screening` (30 s, 120 s), `smoke` (15 s, 45 s; first numbers only).

Gate verdicts: **FAIL** (harness problem, endpoint mismatch, any correctness violation, O-REPLAY mismatch), **INVALID**
(client saturated, rung not fully seeded, development override, no matched baseline), **MEASURED** (every number
stands; each bar has its own pass/miss in `ns.bars`; a missed bar is a fitness result, not a gate failure).

## Files

| File | What |
| --- | --- |
| `driver.ts` | Seed, trace, phases, writer, feed consumer, analysis, report. |
| `reader-worker.ts` | Closed-loop readers and the P5 sweeper, one composition per worker thread. |
| `lib/trace.ts` | The frozen writer trace (TARGETS 2.1). Its sha256 is the generator source hash in every receipt. |
| `lib/world.ts` | Subject worlds, hop classes, P4 size buckets, closed-form population counts. |
| `lib/composition.ts` | The composition interface and the `public` composition. |
| `lib/model.ts` | Expected-state model (valid-time aware multiset digests). |
| `lib/feed.ts` | Durable P3 consumer with crash injection. |
| `lib/scheduler.ts` | Open-loop scheduler, per-subject serial queues, overlay injection. |
| `lib/hist.ts` | Log-linear histogram (0.79% bucket width), JSON round trip, merge. |
| `lib/oracle.ts` | O-REPLAY sample case builder and comparison. |
| `lib/evaluate.ts` | P5 seams: `evaluate(world, release)` and outbox `publish`, both fail closed until EXP-D01. |
| `duet.ts` | PAIR-0 coordinator: two drivers at one absolute start, noise recorder, calibration, looks, analysis; `recompute`. |
| `lib/paired.ts` | Paired statistics: pooled-quantile ratios with a round bootstrap, censoring, s_d, slot bias, sign flip, decisions, planner, window grade. |
| `lib/noise.ts` | Round plan, host sampler, VM agent (one `colima ssh`), calibration spin, hiccup meter, round summaries, rules (`lab/config/noise.json`). |
| `lib/rounds.ts` | Per-round histograms: commit, commitAll and commitCensored over every offered command, read probe, per-second goodput and max. |
| `lib/single-analysis.ts` | Q100k sequential same-arm timing-grade helper for G03; retains all hard-rule history; no runner or acceptance admission. |
| `lib/pair-analysis.ts` | The one function that turns rounds and noise into a PAIR receipt's `stats` and `noise`. |

## Paired rounds (PAIR-0, EXP-M01; R22, RULINGS Q60)

A comparison is a duet: A0 (arm A) and the candidate (arm B) replay the same trace window at the same instant on two
identically configured slots in the cpuset regime (`lab/config/slots-pair.json`, explicitly selected with `TX2_SLOTS_FILE`: xtdb s1 on vCPUs 0-1, s3 on 2-3, no quota),
inside a measurement lease (every heavy token; pool admission frozen). Rounds are aligned to the series' burst period
(`screening-b180`: a 60 s burst every 180 s, so each 150 s measured window holds about 3,300 commands). Per round, both
arms, pre-registered rules (`lab/config/noise.json`) exclude disturbed rounds; the statistics never look at latency
to decide what counts.

```sh
export TX2_CONFIG_DIR="$PWD"
export TX2_SLOTS_FILE="$PWD/lab/config/slots-pair.json" # opt in; shared defaults stay unchanged
node lab/bench/wait-slot.mjs --after none --slots 2 --lane xtdb --need-gib 3.5      # two exclusive XTDB slots fit
node lab/bin/engine.mjs up --lane xtdb --slot s1 --exp EXP-M01
node lab/bin/engine.mjs up --lane xtdb --slot s3 --exp EXP-M01
node lab/bin/gate.mjs PAIR --lane xtdb --slots s1,s3 --mode aa --rounds 8 --series screening-b180 \
  --composition public-queued --exp EXP-M01 --run-kind calibration --raw-archive ~/Claude/Projects/triplex-db-2/EXP-M01
node lab/bench/duet.ts recompute --receipt lab/runs/PAIR/<run-id>.json             # every number, from the receipt alone
```

Primary metric: `commitAll` p50 (every offered frozen-trace command; expired, failed, rejected and still-pending ones at
their censor time, Q60d); `commit` (committed only) and `probeAll` (open-loop read probe, 20/s) are reported next to it.
A quantile that censored values can reach is not identified and gets no interval. Receipt fields: `pair` (both arms'
image, effective config hash, effective `cpu.max`, `cpuset.cpus.effective`, `cpu.weight`; plan and rules by hash;
`analysisInputJson`), `stats.p50`/`p99` (`ratio`, `lo`, `hi`, `mdr`), `stats.metrics.<metric>` (per-round log ratios,
A/A s_d, slot bias, sign flip, procedure false-positive rate, p99 floor), `noise` (A/A s_d, exclusions by rule id, rule
values per round, calibration reference, `windowGrade`). Verdicts: `PAIRED_DECIDED`, `PAIRED_INCONCLUSIVE`,
`INVALID_NOISE` (RED, or over a third of rounds excluded), `INVALID` (protocol departure), `FAIL` (harness, identity,
correctness). Offline pipeline check: `--composition memory --no-lease` with development round sizes (FAILs by design).

PAIR-0 stays default-off: only an explicit PAIR gate runs the duet. See
[the current Q69a runbook](../experiments/EXP-M01-paired-measurement/RUNBOOK-rebase.md) for capacity, partitioning, timing and restoration prerequisites.

## Trace definition (frozen; `lib/trace.ts`)

- Trace time 0 = start of the measured window (after the seed). Poisson offers at 15 facts/s; bursts at 50x for 60 s at
  120 s + k x 600 s. Sizes: 60% 5-10, 30% 11-25, 10% 26-50 facts, uniform inside a band. Writers 40/30/10/20
  (person, system, agent, runtime). 10% of system signals re-sent 0.5-5 s later with the same commandId; 1% lose
  their ACK; 1% are corrections valid from 30 days back.
- Subjects: active set of 2% of the rung; 95% of commands pick from it with Zipf s = 1.1 over a seeded slot ranking,
  5% uniform; residency 2,000 s, staggered initial entries, seeded replacement.
- `generateTrace({ seed, subjects, durationS, params })` returns `TraceEvent[]` (`seq, atMs, kind, subject, facts,
  correction, ackLoss, resend, burst, active, stream`). `traceDigest(events)` hashes them. Same inputs, same bytes.
- **Overlays (for golden scenarios).** Background events have `stream: "background"`. A scenario adds its own events
  with its own `stream` name on top, never instead of background ones; the driver offers them through the same
  per-subject serial queues (`scheduler.inject`) and every accounting table splits by stream. Current overlays:
  `probe10` (P2 10-fact probe, diagnostic only, 1/s), `p5-mutation` (post-capture mutations, P5 item 4),
  `p4-history` (history growth on the matched sample, bulk commands). Split reads add no writes (Q31b).

## World (`lib/world.ts`)

Subject = placement. Hop class by `i mod 20` (0-7 hop 3, 8-14 hop 4, 15-19 hop 6); account `floor(i/20) mod A`,
A = max(20, ceil(N/500)); size bucket by `a mod 20` (0-9 small 50-200 facts, 10-16 medium 201-800, 17-19 large
801-2,000). Uniform subjects therefore follow the frozen P4 weights 50/35/15 x 40/35/25. `populationCounts(n, A)` is
closed form; `subjectInCell(n, A, bucket, hop, u1, u2, u3)` samples a cell. Money is scaled `integer`, hours and weights
decimal strings, no binary64 business values.

## Composition interface (`lib/composition.ts`)

```ts
interface CompositionHandle {
  name: string;
  assignments: { source, current, history, analytics, replicationEdges };      // TARGETS 4.1 item 1
  watermarks(): Promise<Record<string, number>>;                                // per read index
  coordinate(position): { stream, epoch, offset, ordinal };                      // 4.1 item 3, Q31c
  transact(operations, meta): Promise<Outcome<Receipt>>;                         // writer
  transactionByCommand(commandId): Promise<Outcome<record | null>>;             // lost-ACK resolution
  pull(rootEntityId, basis, between?): Promise<PullResult>;                      // subject pull; `between` = split read
  sweepPull(rootEntityId, basis): Promise<PullResult>;                           // P5 sweep reader
  feedPage(after, limit): Promise<{ transactions, next }>;                       // feed reader
  currentPosition(): Promise<number>;
  close(): Promise<void>;
}
// PullResult: { triples, entities, roundTrips, depth, route, language, waitedMs }
```

Register a new composition in `COMPOSITIONS` (name -> factory(lane, scope)); readers resolve the same name. A
composition that routes reads must honor `WATERMARK_WAIT_MS` (10 ms, Q31d) and report `route` (`source`, an index
name, or `fallback`), the surface `language` and `waitedMs`; the fallback's latency is part of the read's latency.
`public` serves everything from the source of truth's own surface (`Triples.entities` at `{recordedAt, validAt}`).

## Reads

- Basis (Q16): 80% the latest acknowledged receipt, 15% a receipt from the last hour, 5% the latest receipt with valid
  time up to 90 days back. The driver records the basis from receipts it observed (txId, position, instant), never from
  an engine echo, and judges every read at that basis.
- Subjects in P1 levels: 60% from subjects acknowledged in the last 60 s, 40% uniform. P4 `p4mix`: frozen bucket x hop
  weights. P4 history: the matched sample (1,000 subjects at 10k), measured at depth 1, then grown in place to 3, then 10.
- 10% of P1 reads are split: step 1, wait for the ACK of a frozen-trace command already queued or in flight for that
  subject, step 2 at the same basis.
- Correctness: `:placement/stamp` and the whole-world multiset digest must equal `Model.expected(subject, R, V)`.
  A seeded sample (1% of reads on 12 sample subjects, up to 24 reads) is re-checked by O-REPLAY from command intent.

## Metric names and receipt fields

The gate receipt (`lab/runs/NS/<run-id>.json`) holds the usual identity fields plus:

| Field | Content |
| --- | --- |
| `ns.bars.P1..P5` | `[{ id, value, bar, pass, note }]`; ids follow `load-contract.json` (`NS-P1-READ-P99-256-MS`, ...) |
| `ns.trace` | `digest`, `seed`, `generatorSha256`, generated stats (commands, resends, corrections, active share) |
| `ns.seed` | seeded vs planned subjects, assertions vs closed form, facts/s, first/last position coordinates |
| `ns.correctness` | reads, correct, violations by kind, errors, sample |
| `ns.client` | saturated phases (worker or main ELU > 0.9), process user and kernel CPU |
| `ns.oracle` | O-REPLAY verdict, entity queries, mismatches, oracle commit |
| `ns.baseline` | matched zero-reader run id and its writes hash |
| `compositionIdentity` | four assignments, each with lane, slot, container, image id and digests, config hash, CPU quota; replication edges; watermarks per phase |
| `fixtures` | sha256 of every bench source file |

The raw report (`runs/NS/<run-id>/ns-report.json`, stored by hash) adds per-phase stats (`phases[].stats`: reads,
goodputPerS, read histogram summary, hotShare, basisMix, split, routing.fallbackShare, buckets, writer commit and
matchedZeroReader, feedLag, maintenanceEvents, watermarks, client ELU, engine CPU), `priorities.P2.progress.queue.series`
(queue depth per second), `priorities.P3` (durable consumer counts, crashes, replay), `priorities.P4` (weighted mix and
per-bucket p50/p99, history depths, throughput per quota core), `priorities.P5` (sweep, coverage hash, release hash,
seams) and full histograms (`histograms["L256.read"]`, `tx2-loglinear-hist/1`, mergeable with `Histogram.fromJSON`).

## Seams (fail closed)

- P5 `evaluate` and outbox `publish` (EXP-D01 W0 kernel, O-DOMAIN), throttled sweep variant overlapping compaction.
- Maintenance events are only observed (engine logs); the driver cannot force XTDB compaction or a QLever rebuild yet.
- Engine bytes read per pull (history flatness bytes bar), QLever broker queue wait.
- Expected affected subjects through dependency rules (O-DOMAIN); deliberately invalid trace commands (none yet).
- One-engine compositions only: no index routing, so fallback share is 0 by construction.

## QLever bulk seed (engine-free; for the QLever A0)

Transacts on QLever cost 0.7-1.5 s each (about 30 facts/s), so a 10k rung seeds through an index build instead:

```sh
node lab/bench/qlever-bulk-seed.ts --rung 10k --out runs/qlever-seed/ns-v2-10k     # about 2.5 min, no engine
#  -> seed.nq.gz (N-Quads, gzip members) + manifest.json (scope, positions, ids, oracle sample commands)
# engine side (lab/bin/engine.mjs owns it; not implemented here): fresh QLever slot volume, then
#   gunzip -c seed.nq.gz | qlever-index -i triplex -f - -F nq --stxxl-memory 512M --no-patterns
# instead of the bootstrap-only index, then start the server as usual, then:
node lab/bin/gate.mjs NS --lane qlever --slot s1 --rung 10k --composition public --seed-manifest runs/qlever-seed/ns-v2-10k/manifest.json ...
```

The loader runs the real Triplex write path (core `Triples.transact` over the public `makeQleverStorageAdapter`)
against a capture client that writes each UPDATE's VALUES rows out as quads, so the bytes are what the adapter would
have stored (rows and their field channels, the `:_tx/*` journal, command claims, operation receipts, the meta
position). It refuses any query it does not recognize. The driver's `--seed-manifest` checks that the engine's position
equals the manifest's last position before it starts. 10k rung (ns-v2): 384,785 assertions (closed form matches),
1,031 commands, 24,550,838 quads, 6.74 GB decompressed, 150 MB gzipped. Not yet indexed or read back on a live QLever:
`-F nq` on QLever 0.6.0 and the first pulls on the indexed scope are the first checks when a QLever slot is free.

Paired R22 GREEN can survive hard-rule exclusions; it never substitutes for Q100k single-arm timing GREEN. See the runbook for Q100l single-arm NS capacity and the unresolved three-median preflight sample count. New duet evidence uses gradingVersion 2 to retain hard-rule history; historical evidence retains its original recomputation shape.
