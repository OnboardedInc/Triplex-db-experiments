# EXP-DI01: the dependency-index consumer (brief, after the planner design check)

Planner design check, Opus 5.5 high, 2026-11-09. Design source: R41 section 4.3 E2 (lab/research/R41-p3-readiness.md), which is R37 B6.
Goals and targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md.

**North star:** P3, "an ordered, resumable change feed, so the runtime knows which subjects to re-run" (NORTH-STAR item 3; TARGETS 1.1
P3 items 3 and 4; NS-P3-DOMAIN-AFFECTED-SET; Q98g pending). Measured by equality of the consumer's durable affected set with O-DOMAIN
`affected` at every position, with that set, the index change and the checkpoint in one durable write.

**Base branch:** `exp/FD01-feed-contract` at `731e10e4` (FD01 accepted offline, not merged). Branch `exp/DI01-dependency-index` from it.
`lab/bench/lib/w0-*.ts`, `packages/w0` and `lab/oracles/domain` are identical between 731e10e4 and main, so nothing else is needed.

**Slot:** none. Offline: O-DOMAIN, the TypeScript W0 kernel, the memory composition and the host SQLite store. No Docker, no engine.

## 1. What the design check found

### 1.1 Where W0 dependencies come from, and why the consumer needs reads

1. **W0 dependencies are `evaluate`'s `dependencies` array** (W0 SPEC 8.1, 8.7): the union of every rule's static read set (SPEC 6.3,
   section 7), instantiated from the subject's world. O-DOMAIN's `affected` (lab/oracles/domain/w0.py:904-915) evaluates each world and
   intersects its dependencies with the written pairs; the TS kernel does the same (packages/w0/src/affected.ts).
2. **`dependencyState` is unrelated to W0 dependencies.** It is core's storage call `dependencyState(attributes, basis)`
   (packages/core/src/store/Triples.ts:150-155, 276-279): for a list of attributes across the whole scope it returns the latest source
   position and the earliest future valid-time edge of their facts. It is not per subject and knows nothing of W0 rules.
3. **The dependencies cannot be computed from feed entries alone.** FD01's `FeedChange` (packages/core/src/feed/index.ts) carries op,
   entity, attribute, validFrom, validTo, position and assertionId, and never a value (Q98a). Which pairs a subject depends on is
   static given its id and the release, except for the values of four reference attributes: `S.location`, `L.jurisdiction`,
   `S.documents` and `S.decisions`. The release in force also needs the activation fact's value. Everything else needs no read.
4. **Reads are needed only for changes to those reference pairs and to the activation pair,** at the change's own position, one hop,
   no world pull. The pinned-read API is `StorageAdapter.getByEntities(ids, {recordedPosition: p, validAt: V})` through
   `handle.storage`, exactly as `portableSweep` uses it on lanes Q and D (lab/bench/lib/w0-public.ts:111-130), with its guard that
   every row has `recorded_position <= p` and is not retracted at or before p. On lane X the same call goes through `publicSweep`'s
   head-guarded XTDB adapter (w0-public.ts:9-60). The public `Triples.entities` cannot be used today because its
   `TemporalBasis` takes only instants (packages/core/src/Temporal.ts:11-14; the EXP-W02-R2 note in w0-public.ts). After RT01 round B
   lands on a lane, `Triples.entities(ids, {recordedAt: instantOf(stamp)})` pins the same commit (Q90a, Q98d) and may replace it.
   Offline, a replay-backed reader over the command log (`visibleRows` in lab/bench/lib/w0-world.ts) and the memory composition's
   `sweepPage` serve the same interface.
5. **Atomicity is kept if the reads happen before the transaction and everything else inside it.** The reads depend only on the page
   (entity, attribute, position), never on consumer state, and a pinned read returns a fixed answer, so a replay after any crash reads
   the same values. The affected computation, the index change, the boundary rows, effects, affected rows, deliveries and the checkpoint
   then commit in FD01's single `BEGIN IMMEDIATE` transaction. Two FD01 changes are required for that:
   1. `SqliteConsumerStore.apply` takes a precomputed `affected` array (ConsumerStore.ts:60-66). The index state must be read under the
      same write lock as the checkpoint compare-and-set, so `apply` needs a variant that takes a synchronous deriver run inside the
      transaction after the CAS check. `node:sqlite` is synchronous, so the deriver can do its SQL lookups there.
   2. FD01's `auditConsumerAtomicity` compares only effects, affected and checkpoint snapshots (REPORT round 2 audit table). The
      snapshot must include the index and boundary tables, or the 900-stop atomicity matrix does not cover them.
6. **A failed pinned read aborts the apply before the transaction** (BasisNotAvailable, read route behind the feed). The consumer retries
   the same page. It never falls back to a latest read, because that would make a replay diverge.

### 1.2 The reverse index, the two hops and the release

Store in the consumer's SQLite file: `di_ref(consumer, entity, attribute, value)` for the four reference attributes, indexed on
`(consumer, attribute, value)`, and `di_release(consumer, release)`. A write maps to subjects through the state as of position p - 1:

| Written pair at position p | Affected subjects |
| --- | --- |
| `(S, a)`, S a placement (`pl:<local>`), a not `answers` | S |
| `(S, answers)`, or any answer attribute (`field`, `value`, `next`) | none (ballast, SPEC 3, C57) |
| `(d, docType / expiresOn / reverified)` | the owner S only if `di_ref(S, documents, d)`; the id prefix alone is not enough (SPEC 6.3) |
| `(D, target / verdict / author)` | the owner S only if `di_ref(S, decisions, D)` |
| `(L, jurisdiction)` | every S with `di_ref(S, location, L)`, under every release (C60) |
| `(L, localMinWageCents)` | the same set when the release's MINWAGE `floorSources` holds `location.localMinWageCents` (R2, R3); none under R1 (C35, C36) |
| `(J, stateMinWageCents)` | every S with `di_ref(S, location, L)` and `di_ref(L, jurisdiction, J)`, every release (C34, C58, C59) |
| the activation pair (`p5:tenant`, `p5/activation` in lab/bench/lib/w0-traffic.ts:168-179) | none; it updates `di_release` |
| anything else | none |

1. **Rules come from the compiled release, not from hand-written constants.** The builder derives the table from the release's read
   sets (packages/w0 release compilation) and a cross-check gate (3, item 5) compares the index's instantiated pairs with the kernel's
   `dependencies` per subject.
2. **When a hop changes in the same transaction, the before-state decides** (SPEC 10 item 2). Compute the affected set for every change
   at position p from the index as of p - 1, then apply p's index change. Examples:
   1. `(L, jurisdiction) := J2` and `(J2, stateMinWageCents)` at one position: the subjects at L are affected through `(L, jurisdiction)`;
      the subjects already under J2 through J2's pair. The new L to J2 link is used from p + 1. The union is what O-DOMAIN gives.
   2. `(S, location) := L2` and `(L2, localMinWageCents)` at one position: S through `(S, location)`; the subjects already at L2 (under R2).
   3. `(S, decisions) := D` with D's three facts at one position: S through `(S, decisions)`; D's own pairs join S's index at p + 1.
   4. A retraction of a reference is handled the same way: the post-state read at p replaces the index rows for that pair.
3. **A transaction can carry several positions** (`FeedTransaction.positions`, P2X operation groups). Process positions in ascending
   order within the page and apply the index change between positions, because W0's `tx` is per position (SPEC 4.1, Q40f).
4. **The release in force** is `resolveRelease(activations visible at p - 1, V)` (SPEC 5.4). An activation changes no affected set at its
   own position but changes the `(L, localMinWageCents)` rule from p + 1. R3's scope adds no dependency (SPEC 7.9).
5. **Q44b is a query, not a feed rule.** The P5 sweep needs "the subjects R3 reaches", which is `affected(R3, worlds, listed J pairs)`
   (SPEC 10 item 7, C87). Expose `reach(pairs, release)` on the index, answered from the same tables with no feed entry.

### 1.3 The 11 case files with `"op": "affected"`

All under /Users/sam/projects/triplex-db-2/lab/world/W0/cases/. Nine have an expected set; two are error cases.

| Case | Release | Writes | Expected | What it tests |
| --- | --- | --- | --- | --- |
| C34-affected-state-wage-r1.json | R1 | `(jur:ny, stateMinWageCents)` | pl:a, pl:b | two hops: the placements at loc:nyc (jur:ny), not pl:c (jur:ca) or pl:d (no location) |
| C35-affected-local-wage-r1.json | R1 | `(loc:nyc, localMinWageCents)` | none | the local floor is not read under R1 |
| C36-affected-local-wage-r2.json | R2 | `(loc:nyc, localMinWageCents)` | pl:a, pl:b | the same write under R2 affects the location's placements |
| C57-affected-ballast-write-r1.json | R1 | `(pl:a/ans:1, value)`, `(pl:a, answers)` | none | ballast affects nobody, including the subject written directly |
| C58-affected-jurisdiction-write-r1.json | R1 | `(jur:ny, stateMinWageCents)` | pl:a, pl:b | one jurisdiction reached through two different locations |
| C59-affected-jurisdiction-write-r2.json | R2 | `(jur:ny, stateMinWageCents)` | pl:a, pl:b | the depth-two pair is read under R2 too, so the set is unchanged |
| C60-affected-location-repoint-r1.json | R1 | `(loc:buf, jurisdiction)` | pl:b | re-pointing a location's jurisdiction affects only that location's placements |
| C87-affected-r3-scope-reach.json | R3 | ten `(jur:j010..j100, stateMinWageCents)` | pl:a, pl:b | R3's reach; pl:b's world has no jur:j010 facts, the pair comes from the reference alone |
| C121-affected-worlds-unsorted.json | R1 | `(jur:ny, stateMinWageCents)` | pl:a, pl:b | worlds given in descending order; the answer is ascending |
| C67-err-affected-duplicate-subjects.json | R1 | `(pl:a, startDate)` | `W0.E_SHAPE` | two worlds for one subject (oracle input validation) |
| C96-err-affected-world-by-world.json | R1 | none | `W0.E_CARDINALITY` | worlds validated in order (oracle input validation) |

C67 and C96 cannot be expressed as a feed: they test the oracle's input checks. They are recorded as not applicable, not as passes.
GS.06b's W0 map (SPEC 11.3) also names C23, an `evaluate` case for MINWAGE outputs, not an affected set.

### 1.4 The next-boundary schedule (GS.20)

1. **`dependencyState.nextTemporalBoundary` is the wrong source.** It is scope-wide per attribute list, and it sees only fact valid-time
   edges. GS.20's midnight wave is a rule boundary: DOCEXP's `B = endOfDay(expiresOn)` (SPEC 7.7) is computed from a value, and no fact
   has an edge there. A subject's boundaries have two sources:
   1. **Rule boundaries:** `evaluate`'s `obligations[].boundary` (SPEC 8.3: `start`, `doc.window`, `due`). Only the re-run knows them,
      because they need values. C19 and C20 carry `doc.window` and `due` obligations at 2027-01-16T00:00Z; C21 is the basis at that instant.
   2. **Fact edges:** a change whose `validFrom` or `validTo` is later than V, read straight from the feed entry and mapped to subjects
      with the table in 1.2. The W0 seed has one family: the future pay raise at 2026-11-16 (lab/bench/lib/w0-seed.ts:88-89).
2. **Where it lives:** table `di_boundary(consumer, subject, at, kind, basisPosition)` in the same SQLite file. Fact edges are written by
   the deriver inside the feed transaction. Rule boundaries are written by the re-runner through `recordObligations(subject,
   basisPosition, boundaries)` in its own SQLite transaction, which replaces that subject's obligation rows only for a newer basis.
3. **How it is reported:** `due(consumer, untilValidTime)` returns `(subject, at, kind)` rows. Boundary rows are never inserted into
   `affected` or `effects` and never keyed by a feed position, and receipts list them in a separate `boundaries` section, because a
   boundary is not a feed entry.

## 2. Build steps, in order

1. **Branch** `exp/DI01-dependency-index` from `exp/FD01-feed-contract` 731e10e4.
2. **ConsumerStore deriver.** Add `applyDerived(consumer, expected, page, derive, crash?)` to `SqliteConsumerStore` (keep `apply` for
   FD01 callers). Inside the existing `BEGIN IMMEDIATE`, after the CAS and order checks and before the `after-effect` hook, call
   `derive(db, page)`, which returns the affected rows and writes the index and boundary rows. Validate the rows against page positions
   as `apply` does. Extend `ConsumerSnapshot` and `auditConsumerAtomicity` in testkit to include `di_ref`, `di_release` and `di_boundary`.
3. **Pinned reference reader.** Interface `readRefs(entities, position, validAt)` with three implementations: `StorageAdapter.getByEntities`
   with the portableSweep row guard (lanes), memory composition `sweepPage` filtered to the requested entities, and a replay reader over
   the command log. One batched call per position that has reference or activation changes; none otherwise.
4. **Index tables and deriver** (packages/host/src/feed, beside ConsumerStore): `di_ref`, `di_release`, `di_boundary`; the mapping
   table of 1.2 derived from the compiled release; per-position processing in ascending order; the before-state rule; release
   resolution at V; fact edges from `validFrom` and `validTo`.
5. **Queries:** `affectedAt(consumer, epoch, position)`, `reach(pairs, release)` (Q44b, C87) and `due(consumer, untilValidTime)`,
   plus `recordObligations` for the re-runner.
6. **Case fixtures.** For each of the nine cases with an expected set, build a feed: the union of the worlds' facts as commits grouped
   by their `tx` (assert that shared facts agree across worlds), then one commit at `basis.tx + 1` carrying the case's writes with
   arbitrary valid values (pairs only matter). Check the fixture by comparing each subject's kernel `dependencies` at `basis.tx` with
   the case world's; worlds need not be byte-equal, because the union adds shared facts some case worlds omit (C87's pl:b).
7. **Trace driver** (lab/bench, new file `di01.ts`): the 10k-rung seed prefix from `seedCommands`, then `mapW0Trace` over
   `generateTrace` unchanged (its hash bound, Q92k), interleaved with a separate seeded DI01 overlay schedule whose hash is bound
   separately: state and local wage writes, `(L, jurisdiction)` re-points, `(S, location)` moves, a reference retraction, decisions
   and documents written before their link, same-position hop changes (1.2 item 2), one R1 to R2 activation, ballast-only commands.
8. **Expected side,** independent of the index: worlds rebuilt from the command log with `visibleRows`, `reachableRows` and `worldOf` at
   `(p - 1, V)`, sent to O-DOMAIN `affected` through lab/bench/lib/w0-oracle.py. A world is passed for every placement written at or
   before p (an empty world if it has no facts before p). For speed, the candidate worlds per position may be limited to subjects whose
   reachable entity set at p - 1 holds an entity written at p, plus placements written at p; at every overlay position and every
   1,000th position, pass all worlds so the candidate filter is itself checked.
9. **Lag probe** at the 100k rung (step 3 of the gates), paired with FD01's `apply` on the same pages, alternating arms.
10. **Report** in lab/experiments/EXP-DI01/REPORT.md with the receipts, the overlay and mapper hashes, V, and the open questions of 4.

## 3. Gates

1. **G0** on the branch, plus the FD01 conformance suite unchanged and green.
2. **Named cases:** zero misses and zero extras against O-DOMAIN `affected` on the nine cases of 1.3 with expected sets, run through
   the consumer (step 6). C67 and C96 are reported as not applicable.
3. **10k-rung trace:** zero misses and zero extras at every position of the seed prefix, the EXP-P5 mapper trace (Q92k) and the overlay.
   The receipt counts the positions where O-DOMAIN's set differs from the directly written subjects (ballast-only, unlinked owned
   entities, shared writes). If that count is zero the gate is void, because a direct-subject consumer would also pass.
4. **GS.06b:** W02 v2's GS.06 fixture (`affectedClaim`, exp/W02-gs-harness-v2 2e09b37e) with DI01 as the consumer in place of the
   kernel-on-pulled-worlds call; and at the 100k rung, writes to `(loc:l0001, localMinWageCents)` under R2, `(loc:l0001, jurisdiction)` and
   `(jur:j001, stateMinWageCents)`, each equal to O-DOMAIN, every worker at that location or jurisdiction re-run once and no other.
   Expected sizes from SPEC 12.5: about 1,125 and 1,953; the exact counts come from the population generator.
5. **Kernel cross-check:** for every subject at the trace's last position and at 100 sampled positions, the pairs the index
   instantiates equal the kernel's `dependencies` (or are a superset only by pairs the gate lists, which must be none).
6. **Crash and resume:** FD01's crash matrix (500 keyed stops over its five hooks, 300 unkeyed split and 100 keyed split controls)
   rerun with the deriver, with the extended atomicity snapshot; after every replay the index tables and affected rows are byte-identical to a run
   without crashes.
7. **Boundaries:** the obligations of C19 and C20 come back from `due` after `recordObligations`; the seed's 2026-11-16 pay raise
   appears as a fact edge for exactly the subjects that have it; no boundary row appears in `affected` or `effects`.
8. **Added lag at the 100k rung:** consumer apply time with DI01 minus FD01's `apply` on the same page, for (a) the loc:l0001 local wage
   write (about 1,125 workers, the largest location, TARGETS 6.1 item 6), (b) the jur:j001 state wage write (about 1,953, the largest
   single-write fanout), (c) the loc:l0001 jurisdiction re-point (about 1,125 plus one pinned read), (d) a one-subject trace position.
   At least 1,000 samples each. **Prediction: added p99 <= 20 ms for (a), (b) and (d)**; for (c) the same bound excluding the pinned
   read, whose latency is reported separately because offline it is the memory composition's, not a lane's. FD01's own write p99 was
   5.4 to 11.1 ms on the shared host, so report both arms. Diagnostic: zero readers, offline.

## 4. Corrections to R41 E2

1. **"Dependencies as of the position before each transaction" cannot come from the feed.** Entries carry no values (Q98a), so the
   index needs pinned one-hop reads of the four reference attributes and the activation. E2 does not say this, and it does not name a
   read API. Use `StorageAdapter.getByEntities` at `recordedPosition` (1.1 item 4); after RT01 round B, `Triples.entities` at the stamp.
2. **"Write the affected set, the index delta and the checkpoint in one transaction" needs an FD01 change.** `apply` accepts only a
   precomputed affected array; the index must be read and changed under the transaction's lock, and FD01's atomicity audit must cover
   the new tables (1.1 item 5).
3. **The next-boundary schedule does not come from `dependencyState.nextTemporalBoundary`.** That call is scope-wide per attribute
   list and sees only fact edges; GS.20's expiry wave is a rule boundary that only the re-run's `obligations` give (1.4).
4. **Q44b is the R3 reach query, not "the release in force".** The release in force is SPEC 5.4 `resolveRelease` and matters only for
   `(L, localMinWageCents)` (SPEC 10 item 5). R3's scope adds no dependency (SPEC 7.9).
5. **The 11 case files include two error cases** (C67, C96) that a consumer cannot run, and C121 is an ordering case. Nine cases gate.
6. **The 10k EXP-P5 trace alone cannot discriminate.** `mapW0Trace` never writes a shared entity (lab/bench/lib/w0-trace.ts:7, the
   p5.test.ts "no shared writes" test), and every mapped command's first row is a rule-relevant fact of its own subject, so O-DOMAIN's
   set equals the direct subject at every mapped position. The gate needs the seed prefix (ballast-only commands) and a DI01 overlay
   with shared and reference writes (step 7). Q92k is still pending (RULINGS-PENDING.md:79).
7. **The largest location is not the largest fanout.** At the 100k rung loc:l0001 holds about 1,125 workers, but a `stateMinWageCents`
   write to jur:j001 reaches about 1,953 (SPEC 12.5). Measure both.
8. **Valid time is unstated.** W0 worlds are the store's answer at one valid time (SPEC 4.2 item 1), so the index's reference values
   depend on V. For this experiment V is fixed per run, at or after every `validFrom` in the run, used by both sides and recorded; the
   run fails if any reference fact has a later `validFrom` or a finite `validTo`. See open question 1.
9. **Two smaller gaps.** A placement's first write must count (the expected side must pass a world for every placement written up to p),
   and a document or decision affects its owner only once linked, not by id prefix.

## 5. Open questions for the orchestrator (not blocking the build)

1. **Valid-time-varying references** (GS.08 address corrections, GS.09): should the index hold every reference value visible at p over
   all valid time? That never misses a re-run, but it gives extras against O-DOMAIN at a single valid time.
2. **Erase changes:** SPEC 10 item 1 counts asserts and retracts only. An `erase` of `(S, ssn)` changes EVSUB's output (row 3), so the
   recommendation is to treat `erase` as a write of its pair. No W0 case covers it.
3. **TARGETS 1.1 P3 item 3 and the NS.P3 obligation statement define the expected set as direct subjects (O-REPLAY) plus O-DOMAIN's**,
   while SPEC 10 item 3, C57 and Q98g (pending) say a ballast write affects nobody. This brief gates on O-DOMAIN alone and reports the
   positions where the two definitions differ; the contract text needs to be brought into line.
4. **Bootstrap:** this experiment replays from position 0. A consumer that starts from a snapshot is later work.
5. **NS bench:** lab/bench/lib/feed.ts runs a non-W0 world (accounts, `:placement/stamp`), so DI01 reaches NS.P3 only once EXP-P3M drives
   the W0 trace (Q94c).

## Orchestrator decision on the affected-set conflict (2026-11-09)

Gate on O-DOMAIN `affected` alone. Sam's words for P3 are "so the runtime knows which subjects to re-run"; a write that changes no
dependency (a ballast write, SPEC 10 item 3, case C57) gives the runtime nothing to re-run. TARGETS 1.1 P3 item 3's "directly written
subjects plus O-DOMAIN" is the orchestrator's interpretation and is amended to O-DOMAIN alone when Q98g compiles in contract 0.4.0. Keep
reporting the positions where the two definitions differ.
