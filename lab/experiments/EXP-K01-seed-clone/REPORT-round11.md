# EXP-K01 round 11 — align catalog and wire expectations with XTDB 2.2.0

Builder CX-K01-R2, branch exp/K01-seed-clone, parent f75361c1d128ec3a51a1cc815eec3115dc4123dd. North star: exact reusable seed contents supporting P1–P5, with correctness preceding measurement. Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md and Q93a–c. **Offline only. No engine, slot or volume action.**

**Result:** 414/414 tests and TypeScript pass. Fixed the probe's union spelling, corrected unsupported I8/OID-21 and bpchar/OID-1042 assumptions, and added replay fixtures from the exact captured scalar witnesses. G0 still refuses mixed native types; no content requirement was weakened. A live rerun remains pending the orchestrator's window after EXP-P2X2 releases the slot.

## Source-grounded expectations

Read the clean pinned XTDB tree at `/Users/sam/projects/triplex-db-2/references/xtdb`, revision c6c19623d90c658c15400fb46dc056f3735ed57b. [WIRE-TYPES-round11.md](WIRE-TYPES-round11.md) lists every supported native scalar/OID, nullable/decimal/union spelling, and explicit refusal with exact source file/line references. evidence/round11/upstream-source.json retains hashes and numbered excerpts.

* `information_schema.clj:348-358` prints `serde.types/render-type` for xt_type. The ordinary data_type is widened through PgType and does not establish storage width.
* `serde/types.clj:256-288` renders scalar keywords, nullable vectors (`[:? :i64]`), flattened nullable parameterized vectors (`[:? :decimal p s bits]`), and **Poly EDN sets** (`#{:i32 :i64}`), not `[:union ...]`. Set order is unspecified. VectorType.kt:298-306 distinguishes nullable Mono from Poly; nullable mixed columns include `:null` in the set.
* PgType.kt:951-975 and its type declarations define the actual scalar/OID map. I16/I32/I64 use 21/23/20; F32/F64 use 700/701; BOOL/UTF8/Binary/UUID/Decimal use 16/25/17/2950/1700. Native I8 is rejected by its bit-width switch, so the old fabricated I8→21 acceptance is removed. PostgreSQL's Int8 name means I64, not I8.
* PgType.kt defines VarChar 1043, but not bpchar 1042. The generic raw scalar encoder no longer accepts 1042. It can retain VarChar bytes; native UTF8 SELECT * still requires Text 25 at the catalog/OID boundary.
* PgType.kt:1013-1025 widens integer/float unions and removes Null before selecting the column OID. pgwire.clj:1173-1180 serializes each row with that result-column type. The native witness is still required for every non-NULL scalar. All mixed/unknown/structured types continue to refuse; a changed spelling does not make them admissible. Native temporal transports and payload-losing NaN remain explicit refusals, not renamed supported types.

Reason/source comments sit beside each expectation in g0-native.ts and g0-values.ts. The shared `lab/bench/lib/g0.ts` interface and D/Dprime algorithms are unchanged. Source-generator inputs already include both changed modules, so their new hashes invalidate stale seed/golden keys.

## Implementation and fixtures

`nativeUnionLegs` is a small, strict parser for primitive EDN sets used by the probes. It sorts distinct legs, rejects incomplete/duplicate/singleton/non-primitive shapes, and has no admission path. `nativeType` still rejects every Poly declaration. The two reviewer widening fixtures now use the source-defined EDN set spellings; their expected refusals and all 57 controls are retained. Old `[:union ...]` is tested only as an invalid diagnostic spelling.

New `lab/bench/test/fixtures/g0-live-round10.json` is derived from immutable evidence/live-round10/wire.log. Each captured canonical frame reversibly contains the OID, native tag and exact raw scalar payload hex. The fixture reconstructs all four rows and compares the resulting canonical bytes exactly with the logged witness: I32/I64 text `1`, F32/F64 text `1.0`. Its provenance SHA256 is checked against the original log. The captured mixed integer string `#{:i32 :i64}` is retained exactly and now drives the union refusal regression. This is reconstruction from printed typed witnesses, **not** a claim that packets or mixed-union raw frames were captured.

The 17 new checks cover provenance; four exact scalar frame replays; nine supported monotype/nullable/OID mappings; unsupported I8/bpchar/temporal/structured/Null behavior; decimal parameters; and captured/source-derived union/nullable-union refusal. Nullable numeric, decimal, float-union and other-kind cases are explicitly source-derived, not additional live observations. NULL values remain NULL without fabricated payloads.

## Offline verification

```sh
node lab/bin/heavy.mjs --label CX-K01-R11-offline -- node lab/verify/K01/run-round11.mjs
```

One attempt; all five commands exit zero: **229 builder tests, 30 earlier reviewer controls, 98 column/schema controls, 57 representation controls**, plus TypeScript. No skipped/cancelled/TODO tests. The runner waited for the shared heavy token and checked the 5 GiB disk floor before running; it did not acquire an engine slot. evidence/round11/run.json binds 47 runtime/test/fixture/handoff sources and log hashes. All recorded source hashes were rechecked after completion. git diff --check passes.

An additional offline check evaluates the **actual assertion extracted from LIVE-round11.md** with the captured integer set, reversed integer set, source-derived float set and reversed float set. All four assertions succeed. Evaluating the old LIVE-round10.md assertion with the captured set reproduces its original failure. The complete new inline probe passes Node syntax checking; it was not executed against an endpoint. evidence/round11/probe-offline.json records these inputs and the exact new probe hash.

Raw reviewer outputs remain outside git under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round11/attempt-1/`, verified by evidence/round11/RAW-SHA256SUMS. The committed INDEX.md identifies the source-bound logs, upstream excerpts, fixture provenance and hash records. No committed evidence file exceeds 1 MB and raw case directories are not committed. Round-10 handoff, first-failure report and evidence remain unchanged.

## PASS / verdict / receipt audit

| Transition | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Source pin `readContent` / `readG0` (unchanged) | Complete schema-derived exact typed rows, independent counts and required W0 oracle comparison | Bounded current reads; scope before/after; native catalog before/after each production page | Expected scope/position/counts/world in D; native tag + OID + bytes for supported non-NULL scalars |
| E1 source pin `readE1G0` (unchanged) | Documented generated-value relations and exact remaining contents | Two complete reads must have identical full D; verified instant relations | Dprime/2 and full D tied to the same expected inputs/normalization list; no clone admission via Dprime |
| `admitG0` / `checkXtdb` sole admission PASS (unchanged) | Current full D equals the pre-freeze pin, plus required W0 binding | Always reads the measured endpoint again before warm-up | Validated pin format and expected scope/position/counts/world; endpoint named in receipt |
| Golden Q93b publication / E1 equality refusal (unchanged, not executed) | Two clone starts must reproduce D/L; E1 compares Dprime while each arm passes its full D | Separate bounded reads per start/measurement | Exact source manifest/key and holder's slot; no diagnostic/parser result grants publication |
| Revised future native probe | Exact complete expected leg set and specific production refusal; scalar type/count/frame assertions | Fresh guarded slot writes/reads with deadlines in the future attempt | Acquired s1 endpoint and exact holder, native catalog + wire fields; no standalone G0 PASS |
| Offline test/probe receipts | Expected replays/refusals, original live log hash, suite exits and source/log hashes | Single new attempt directory; actual extracted new assertion evaluated now | Tested parent/head, 47 source hashes, fixture provenance, explicit cases and probe source hash |

`nativeType`, `wireValue`, `nativeCatalog` and `nativeUnionLegs` return values or throw; none emits PASS. The set parser is diagnostic only and no admission decision calls it. All supported-data checks still fail closed. No historical PASS is adopted. No new runtime granting check exists.

## Contract boundary and live handoff

lab/acceptance was not edited. Scanning the current main acceptance tree found no textual references to the changed paths, so no explicitly pinned changed path was identified. The complete old/new path hashes are in evidence/round11/changed-paths.json. For the contract builder, the changed runtime sources are:

| Path | Parent SHA256 | New SHA256 |
| --- | --- | --- |
| lab/bench/lib/g0-native.ts | 9c507ef4c5e9bb9d0e9c5096a5e0bd6a6dcfddc1f4d94c60cf4c6c63fea33b7f | a7531ec11c58a37a865198eb0c45d1c469d8b70917bb8c3ea7d38e5c5854e86a |
| lab/bench/lib/g0-values.ts | 3e8a6c85c94f854556634fa46c68a9e747ea13cf1e61ac78f26a3f7d845c3ffb | 31737e6296bbca788ea4946b719d920d41ae86a0d56f250d7cbf332697a56b5c |

[LIVE-round11.md](LIVE-round11.md) uses a new run path/holder, complete unordered union-leg comparisons, current source citations and the existing first-failure rule. It waits for the orchestrator's scheduled window after EXP-P2X2; it retains a successfully published golden with the Q93b record/name/size and cleans owned scratch state. No live command from that document was run now. The previous live failure is preserved, not reclassified as success.

Remaining: the actual mixed-type production refusal, remaining native value kinds, source seed/D pin, freeze, two-start D/L qualification, E1 fresh-seed Dprime comparison and P5 integration are unverified live. The new handoff explicitly distinguishes its numeric smoke probes from complete native-kind/E1 acceptance. No slot or volume was created or retained by this offline round.
