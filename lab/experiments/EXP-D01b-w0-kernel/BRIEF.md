# EXP-D01b TypeScript W0 reference kernel (P5, P3 dependency rules, golden-scenario domain answers)

**North star:** P5 (release activation over 100k subjects without hurting live traffic) and P3's dependency-through-reference case run the
W0 rules inside Triplex's process, per subject, after reading. This kernel is that code. **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md,
lab/TARGETS.md 1.1 (P5), 6, 6.1; lab/world/W0/SPEC.md (W0-1.1.1, accepted and pinned in contract 0.3.7); RULINGS Q31i, Q36, Q40, Q44; Q53 in
lab/acceptance/RULINGS-PENDING.md (the ten readings A01-A10, listed below).

## Commander's intent
Build the TypeScript reference kernel for W0 from SPEC.md alone, as the second program the SPEC names (the first is the Python oracle
O-DOMAIN, which you must not read). Done means: all 87 golden cases byte-identical, the 100k population fingerprint equal to the accepted
values, and a measured per-subject cost that tells us whether a 100k-subject release sweep fits P5's budget on this host. A kernel that
passes the cases by fitting their outputs instead of following the SPEC is a failure even if every byte matches.

## Point of view
1. **Pure functions first.** `evaluate`, `reconcile`, `affected`, `publish`, `receive` and the release hash as pure TypeScript functions
   over the SPEC 4.3 input objects, returning canonical JSON (SPEC 9). No engine, no Effect runtime inside the arithmetic; wrap with
   Effect v4 only at the package boundary (typed errors as tagged values carrying the SPEC's `W0.E_*` codes).
2. **Numbers.** No floats anywhere. Read fixtures with a token-level scanner (SPEC 14 row 1): `JSON.parse` hides `1650.0` and `3.0`.
   Integers as BigInt where they can pass 2^53 - 1; instants as strings; money as integer cents.
3. **The population generator** from SPEC 12 in TypeScript (the same draws and Zipf weights), streamed one world at a time, so the
   fingerprint runs in bounded memory.
4. **Shape for P5.** Expose a per-subject entry point that takes one subject's current facts and a release and returns its work items and
   outbox records, so the later P5 sweep can call it per subject after a Triplex read. Measure subjects per second per core on the 100k
   population (R1, R2 and R3), single-threaded, and report the distribution of per-subject cost by world-size bucket.
5. **Comments carry the reasoning:** each rule's code cites its SPEC section; any place you had to choose a reading cites the Q53 reading
   or names a new SPEC-AMBIGUITY item.

## The ten readings already chosen (Q53, listed; follow them)
A01 bytes that are not one JSON value (syntax error, not UTF-8, BOM) are W0.E_SHAPE. A02 `-0` is an integer token with value 0, written
`0`. A03 SPEC 3.3 cardinality runs only after every fact of that world passes 3.2, so a later E_UNKNOWN beats an earlier duplicate. A04
`affected` validates world by world (3.1-3.3 per world, array order). A05 activations are checked after the world, one at a time in array
order; within one, E_VALUE before E_BASIS. A06 a picked activation naming an unknown well-formed hash is E_NO_RELEASE, no fall-back. A07
opaque publish/receive payloads: integer tokens as integers, other number tokens as their source text, other strings with
`json.dumps(ensure_ascii=True)`-style escapes (\uXXXX for non-ASCII). A08 input states indexed by id (later wins); output arrays re-sorted;
`pending` keeps input order and appends. A09 a duplicate work-item id in one record is processed in stable id order, the second compared
with the state the first set. A10 "SSN valid" for the `evres` draw means the `valid` option only.

## Predictions (falsifiable)
- 87/87 cases byte-identical; fingerprint basis.tx 4,338,757, facts 44,537,987, worlds sha256:fec1d7ce...c760, R1 c1b2d410...1a79, R2
  551bbbc4...b562, R3 a5950922...ee2f (full values in lab/verify/D01/VERIFY.md).
- Per-subject evaluate cost p50 under 50 µs and p99 under 1 ms on one core, so a 100k sweep is compute-bounded under 10 s of CPU.

## Boundaries
- Worktree branch `exp/D01b-w0-kernel`. Files: a new package `packages/w0` (name `@triplex-build/w0`, workspace member via packages/*),
  its tests (vitest, catalog versions), and `lab/experiments/EXP-D01b-w0-kernel/**`. No edits to lab/world/W0, packages/core or other
  packages, lab/acceptance, oracles.
- **Independence: do not read** lab/oracles/domain, any branch named exp/D01c-*, verify/D01c, lab/verify/D01c, or V-D01's scratch
  folders under /Users/sam/Claude/Projects/triplex-db-2/V-D01 and V-D01c. Reading lab/verify/D01/VERIFY.md is allowed (fingerprint values).
- No engines, no Docker. Run the 100k fingerprint through `node lab/bin/heavy.mjs --label D01b -- ...` (the host is saturated).
- pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Subagents, if any: Opus only, never fork.

## Report (return as text; the orchestrator saves it as REPORT.md)
Cases and fingerprint results with the commands; per-subject cost table by bucket and release; SPEC-AMBIGUITY items you met beyond A01-A10
(each with the reading chosen and a proposed golden case); per-file sha256 of packages/w0; final commit hash.
