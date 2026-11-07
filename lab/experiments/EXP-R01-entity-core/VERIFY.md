# EXP-R01 verification (independent verifier)

Candidate: branch `verify/R01` = `main` (d007e24) merged with `exp/R01-entity-core` (b3d24a2), in worktree
`.claude/worktrees/agent-afa661eaabee112fc`. Clean merge. Author's branch not modified. Scratch probes were removed
from the tree; nothing was committed. (The harness refused a write to the main checkout path, so this file lives in
the verifier worktree, uncommitted.)

## Verdict: FIX-FIRST

The gates reproduce exactly. The http move preserves behavior (a differential test against the old code found no
difference). Every type-level negative test fails for the reason it states, and every stub fails clearly. Three
exactness rules in the projection spec contradict engine facts, and they must be fixed before the spec id becomes
something lanes depend on:

1. **F1**: the RDF double rule covers storage only, not read-back.
2. **F2**: `date` has no exactness rule, although Triplex accepts dates that are not valid calendar dates.
3. **F3**: the XTDB valid-time grid check rejects every coordinate after about year 2255.

F4 to F8 are recommended but do not block promotion.

## Gate table (measured)

| Gate | Report | Measured |
| --- | --- | --- |
| `pnpm typecheck` | pass, 31 tasks | pass, 31/31. Also re-run uncached (`--force`) for core and http: pass |
| core tests | 799 / 55 files | 799 / 55, 0 skipped. The 4 new files hold 66 tests, so the 733 existing tests are unchanged |
| http tests | 12 / 3 files | 12 / 3, 0 skipped |
| testkit (44 shared cases + 2) | 46 | 46 / 1 file |
| type-level negatives | 16 | 16/16. Each one, removed in turn, gives the intended error on the next line (TS2322, TS2339, TS2353, TS2375, TS2741 or TS2345) |
| `bench:config:typecheck` | pass | pass |
| `pnpm lint` | 0 errors | 0 errors, 76 warnings, none in changed files |

`pnpm format:check` fails repo-wide on main (1159 files), so it is not a gate.

## Behavior preservation (http move)

- **Method:** the old `packages/http/src/{ConfigApi,EntityCodec}.ts` (from main) were run side by side with the new
  ones in a scratch vitest.
- **Compile results:** about 16k random snapshots (DSL-built and raw-node, with malformed metadata, reserved keys,
  bad types, schema/usage disagreement, missing struct fields, unresolved attributes, collection and operation
  overrides). Old and new compile gave identical results each time (tag, code, path, message, or a deep-equal
  descriptor).
- **Codec results:** decodeInput on 17 bodies and encodeEntity on 15 fact sets gave identical results. The fact sets
  covered equal duplicates, card-one conflicts, card-many dedupe and ordering, mixed membership, missing types,
  `0`/`-0` (checked with `Object.is`), int64 and NaN.
- **Textual diff:** `Descriptors.ts` and `EntityCodec.ts` are verbatim moves. The only changes are error classes,
  and the hook call positions match the old check order.
- **Gap in the author's tests:** `descriptor-move.test.ts` compares outputs only to literal expected values, never to
  the old implementation. It is adequate, but weaker than a differential test.

## Findings

**F1, High (FIX-FIRST). The RDF `xsd:double` rule is not conservative for values read back from QLever.**

- **What the rule gets right:** "low 4 mantissa bits zero" matches storage exactly. `ValueId::makeFromDouble`
  shifts the 64-bit pattern right by 4 bits (`references/qlever/src/global/ValueId.h:263-270`). R2's "49
  significant bits" (53 − 4) and the compiler's rule therefore agree.
- **What it misses:** QLever exports non-integral doubles with `%.13g` (`src/index/ExportIds.cpp:244-247`; R2 4.1
  and 4.2 call doubles "display only").
- **Reproduction:** `isExact(rdf.exactness, number(1 + 2**-40))` returns `true`, but QLever returns
  `1.000000000001`. The same holds for `1 + 2**-48`.
- **Fix:** add a condition: the value is integral, or `Number(v.toPrecision(13)) === v`. Alternatively, state in
  the spec that the rule covers comparison and ordering only, and that lanes never read values from the current
  graph.

**F2, Medium (FIX-FIRST). The `date` kind has no exactness rule.**

- **What Triplex accepts:** `TypeSchema` checks dates with the pattern `^\d{4}-\d{2}-\d{2}$` only. `2023-02-30`,
  `2023-13-01` and `0000-01-01` all decode, and the spec marks them exact for XTDB `DATE` and `xsd:date`.
- **What XTDB does:** a `DATE` cast rejects these values, which would reject a valid write for the projection's
  sake (PLAN 3.2.4).
- **What QLever does:** it stores an invalid typed literal as a plain string without telling anyone (R2 4.1).
- **Fix:** add a calendar-validity rule (and a year-range rule).

**F3, Medium (FIX-FIRST). The XTDB valid-time `MicrosecondGrid` check requires `round(v*1000)` to be a safe
integer.**

- **Effect:** every coordinate beyond ±9.007e12 ms (after about 2255, or before about 1684) is marked inexact, even
  integral-ms values. Reproduction: `isExact(xtdb.validTime, 253402300799999)` is `false`, and so is `1e13`.
- **Dead rule:** the `NumberRange ±8.64e15` rule can never be reached.
- **Fix:** treat integral ms as on the grid, and use exact (BigInt) arithmetic otherwise.

**F4, Low. Non-finite numbers and signed zero.**

- **Non-finite values:** Triplex `number` accepts NaN and ±Infinity (probe), and the spec marks them exact on both
  engines.
  - QLever stores and exports them, so the QLever side is fine.
  - XTDB card-many `DOUBLE` lists travel as JSON (OID 114, R1 Q3), and JSON cannot carry NaN or Infinity.
  - The existing `qlever/src/rdf.ts numericShadowIsExact` treats non-finite values as inexact.
- **Signed zero:** the author's "-0 UNVERIFIED" flag stands.
  - In-repo evidence exists for scalar float8 parameters sent as `-0.0` (`wiki/problems/native-number-parameters.md`).
    It does not cover stored values.
  - For lists, `JSON.stringify(-0)` gives `"0"`.
- **Action:** EXP-F02 should cover card-many lists.

**F5, Low. The handle path accepts what the release path rejects.**

- **What happens:** `ProjectionSpec.compile` accepts one key with different value types on two entity types (one
  RDF predicate with two datatypes). It also accepts a ref whose target type is not among the inputs.
- **Contrast:** `fromRelease` rejects both, through `Descriptors`.
- **Fix:** add the same checks to `compile` so the two paths agree.

**F6, Low. Names the compiler should flag.**

- **SQL-reserved tables:** `Order`, `Group`, `Default`, `From` and `To` compile to tables that cannot be named in
  unquoted SQL (R1 Q3).
- **Overlapping RDF base:** `rdfBase` may overlap the ledger's IRI namespaces (for example
  `urn:triplex:assertion:`), which breaks C7.2's domain-prefix assumption.
- **Fix:** document both, or reject them.

**F7, Low (types).**

- **Widened cardinality:** `Doc<M>` types `Attribute.use(def, computedOptions)` (widened cardinality) as a scalar,
  but at runtime the value may be an array. A tsc probe confirmed `const s: string | undefined = doc.w` compiles.
  The type should be `V | ReadonlyArray<V>`.
- **Ref filters:** `Where` offers `startsWith` on ref (EntityId) attributes.
- **`any`:** none in exported model types.

**F8, Info. Stubs.**

- **Behavior:** every behavior entry point dies or throws `NotImplementedError("EXP-R02: …")`. Only
  `Repository.make` and `at()` succeed, and every read on the stub they return dies.
- **Gap:** `rowSegments` throws but is not exercised in `stubs.test.ts`, although the test name says it is.

Scratch probes (differential test, exactness probes, expect-error checker) are kept at
`/private/tmp/claude-501/-Users-sam--claude-spares-spare-aGUQ31/f6cb21a3-65b3-4dbb-938c-068fe085c763/scratchpad/`
(`zzold/diff.test.ts`, `zz-verify.test.ts`, `expect-errors.mjs`).

## Round 2 (fix commit 4e073a8, verify/R01 = main df2caa7 + branch): PROMOTE

**Gates:** all measured and all pass.

| Gate | Result |
| --- | --- |
| typecheck | 31/31 |
| core tests | 826 / 56 files |
| http tests | 12 / 3 |
| testkit | 46 |
| lint | 0 errors |
| bench:config:typecheck | pass |
| type-level negatives | 18/18 fire |

**F1 to F8, each checked against the original reproduction and against lab/SCOPE.md 2.4:**

- **F1 fixed:** `1+2^-40` is now inexact, and `requireExact` returns a typed `InexactValueError`. The `DoubleRoundTrip`
  rule agrees with an independent reference (truncate the low 4 bits, exact BigInt `%.13g` with round-half-even) on
  200,016 doubles, with 0 mismatches.
- **F2 fixed:** invalid dates, leap-year errors and year 0 are now rejected.
- **F3 fixed:** whole-ms values up to ±8.64e15 are exact, and fractional values need at most 3 decimal places.
- **F4 fixed:** NaN and Infinity are now inexact.
- **F5 fixed:** type conflicts and dangling refs (including refs nested in lists) are now rejected.
- **F6 fixed:** SQL keywords and ledger-overlapping bases are now rejected. The base check is slightly over-broad:
  `urn:triplex:scopes:` is refused.
- **F7 fixed:** widened cardinality is now `V | ReadonlyArray<V>`. The ref-`startsWith` test fires on an incidental
  error (from the brand object type), but it is still a valid regression test.
- **F8 fixed.**

**Follow-ups (Low, not blocking):**

- **R2-1:** `approximateNumbers: "reject"` does not catch binary64 inside List or Struct attributes. Those are the
  json kind, which has empty exactness, so `list(number)` is accepted. CanonicalJson also normalizes `-0` to `0`
  inside json values, without any error.
- **R2-2:** XTDB card-many DOUBLE still treats `-0` as exact, but list parameters go over JSON, where
  `JSON.stringify(-0)` gives `"0"`. Until EXP-F02 proves the round trip, either add `NoNegativeZero` for lists or
  make that experiment a precondition.
