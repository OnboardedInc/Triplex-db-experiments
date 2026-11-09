## 7. Builder brief for round A (Codex builder, medium)

**North star:** P5 (section 0). **Scope and targets:** `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` (1.1 P5, 2.1, 4.1,
6.1). **Branch:** `exp/P5-release-sweep` from main. **Do not** edit `packages/` except to add, if needed, an internal
(non-public) read export the bench can call with `ResolvedTemporalBasis.recordedPosition`; no public API change (Q89g is Sam's).

1. `lab/bench/lib/w0-seed.ts`: stream `population(rung(N))` (`packages/w0/src/population.ts:554`) into Triplex operations, one
   transact per W0 command in reference order on a fresh scope; assert that each receipt's position equals the reference position;
   record the submitted operations and receipts (for O-REPLAY in G1); write a seed manifest with the fingerprint and the store counts
   of section 4.4. Map W0 values to Triplex value kinds under the numbers rule (cents as integers, no floats).
2. `lab/bench/lib/w0-world.ts`: adapter rows at P to the W0 world (`{subject, facts: [{e, a, v, tx}]}`), following SPEC 4.2 items 3
   and 4 for reach; never copy retraction fields (Q89i); canonical bytes by SPEC 9.
3. `lab/bench/lib/sweep.ts`: subject list and its hash; cursor `(sweepId, P, page index)` persisted per published page; W worker
   threads, each reading its pages at P, building worlds, calling `sweepSubject` (G0 preview) or `reconcile` (activation), returning
   records as transferred buffers; the controller of R24 5.2 item 3 with its constants bound in the receipt; per-stage CPU.
4. `lab/bench/lib/composition.ts`: add `sweepPage(subjects, {position, validAt})`, optional `pinBasis(position, owner)`, and
   `publishOutbox(records)` to `CompositionHandle`; implement for `memory` and for `public` (A0: one `getByEntities` per hop at P;
   outbox as one Triplex transact of outbox entities per frame of 64; refuse a P beyond the position read in the same statement).
5. `lab/bench/lib/evaluate.ts`: replace the fail-closed seams with the W0 kernel and the outbox path; keep failing closed when the W0
   or O-DOMAIN pin is missing.
6. `lab/bench/lib/w0-trace.ts`: the W0 trace mapper of section 4.1, never writing shared entities in this round; its hash in receipts.
7. `lab/bench/driver.ts`: `--world w0 --rung <N>`; replace `runSweep`'s basis (`driver.ts:611`) with the P shape and `V_act` from a deterministic runtime clock anchored at `V_W0` (section 1.4);
   phases: seed and verify (G0), activation, warm-up, rounds per section 4.2 (single-arm alternation until M01 merges).
8. Gates G0 to G5, G7, G9 as offline tests under `lab/bench/test/`, plus the G6 cases of section 5 on the RQ01 branch's harness if it
   has merged, else as a stacked commit the reviewer runs against that branch.
9. A PASS audit (the preamble's rule): every path from an observation to a PASS in the gates, listed and tested.

**Done when:** A0 passes at 1k and 10k offline; A1's G0 passes on an exclusive XTDB slot at 1k; A1 screening receipts exist with every
field of section 4.4; the report states per-stage CPU, bytes per fact on XTDB at 1k, and whether predictions held. **Reviewed by** a
Codex reviewer at high that did not build it, asked to check that each gate rejects the inputs it should (PROTOCOL 6 wording).

---

