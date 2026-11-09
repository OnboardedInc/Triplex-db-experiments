# EXP-K01 round 8 — complete stored-column coverage

Builder CX-K01-R2; branch exp/K01-seed-clone; base 776811666a4cf024d17bdffd94523c73927d5a1f.
North star: P1-P5 seed-reuse speed with correct reads and validation as the floor. Authority: lab/SCOPE.md,
lab/NORTH-STAR.md, lab/TARGETS.md, Q93 and the round-8 full-column instruction. Offline only.

## Result

Fixed R6-F1 as a coverage class. `g0-schema.ts` derives tables/columns from the adapter's actual TypeScript schema declarations,
including codecs.assertionColumns and every CREATE TABLE in packages/xtdb/src (storage, maintained queries and native reachability).
Unsupported/dynamic declarations refuse; missing core tables, duplicate columns/tables and unscoped tables refuse. No stored column
is excluded. The current schema has 11 tables / 89 declared columns, including value_identity, creation/retraction and receipt
metadata, IDs, operation attempts, constraint graphs/generations, query generations/members/relations and native relation state.

G0 requires every declared field, hashes its name and value, preserves row multiplicity and includes the declared schema even for
empty tables. Its SQL reader uses SELECT * to cover dynamic stored columns such as maintained-query binding_0. Sparse absent SQL
columns are represented as NULL while every returned column is retained. Additional runtime columns are hashed, not filtered.
Independent COUNT and complete-scan agreement remain mandatory. Core counts still match manifest/generator expectations; auxiliary
counts, which have no N01 closed form, bind their complete source contents into D (or must equal an explicitly supplied expected count).
The source pin and clone comparison use the same complete-table reader, with existing deadlines and scope/position checks.

The shared module remains lab/bench/lib/g0.ts. readG0/admitG0/requireW0Fingerprint argument and result shapes, Reader callbacks,
Expected/Pin object shape and the W0 hook remain unchanged. The schema-derived table/column domain expands; readers must support it.
No new required argument, count key or gate was added. The schema parser is included in xtdb-seed's generator hashes; old pins and
goldens must be regenerated. No product/package source, public export, schema or dependency version was changed.

## Coverage and regression tests

The 73 existing cases are retained, with their sparse fixtures updated for full rows/tables. The old positive random-ID exemption
is removed: a stored ID is read by adapter/validation paths, so it must be covered under this task. Row reordering remains positive.
A parameterized test changes each of the 89 schema columns individually, including value_identity, and requires refusal. Another
changes a dynamic binding column. Guards exercise new assertion columns, side-table columns and new side tables; unsupported schema
expressions refuse. An independent declaration audit extracts column names separately from the production TypeScript parser and
compares every table/column with G0 coverage. A future column neither covered nor explicitly excluded fails that audit; there are
currently no exclusions to refresh or silently inherit.

The reviewer controls were copied from verify/K01 0f0929b. The exact original is preserved at
lab/verify/K01/evidence/round8/review-controls.original.mjs (SHA-256
104147671e7a95b759369a90924fb8b2b6b021d07d5d12c299f097bad2699138).
The executable g0-review.test.mjs keeps all nine desired-refusal mutations, deadlines and six publication sequencing cases.
Its fixtures now supply declared metadata/empty side tables. The positive case preserves stored IDs and only reorders rows;
its fresh-scan count uses the expanded table count. Partial-scan controls also cover each auxiliary table with a nonempty source
fixture. These adaptations are explicit; the old random-ID-positive policy is not claimed to pass unchanged.

## Verification

**167/167 implementation/coverage tests and 30/30 reviewer controls passed; TypeScript passed.**
The 167 cases include the retained 73, 89 individual column mutations, one dynamic-column mutation and four schema guards.
No test failed, skipped, was cancelled or marked TODO. Syntax checks and git diff --check passed.
The final receipt matches current source and log bytes; its HEAD identifies the base before this commit.
Host free space at gate start was 7,902,740,480 bytes, above 5 GiB. supplement.json binds the TypeScript parser/lockfile and syntax checks.
Command: node lab/bin/heavy.mjs --label CX-K01-R8-offline -- node lab/verify/K01/run-round8.mjs.
Final receipt/logs: evidence/round8/run.json, tests.log, reviewer.log and types.log.
Actual reviewer case inputs, returned values/errors and publication events: lab/verify/K01/evidence/round8/reviewer/g0-review-cases.json.
Development-1 retains the earlier 166/166 implementation and 30/30 reviewer run; final schema-audit/format changes require a fresh run.

## PASS audit before commit

| Boundary | Content | Freshness | Binding |
|---|---|---|---|
| admitG0 / measuring driver G0 PASS | Complete declared rows plus dynamic columns, schema, counts, scopes/positions, pre-freeze D; W0 also O-DOMAIN | All counts/scans reread with deadlines; no saved verdict or diagnostics consumed | Expected scope/position/counts/world and source pin; same measured writer endpoint, same process before warm-up |
| golden.json publication (unchanged) | Two starts each reproduce the newly complete D and second L/T matches first | Sequential clone start/read/stop/start/read; exclusive new record | Exact manifest/key/config/volume and qualification endpoint; no diagnostic stop field is read |
| Offline gate receipts / assertions | Real subprocess statuses/logs, every mutation's actual refusal or positive result; publication is explicitly simulated | Newly spawned tests, no-overwrite receipt guard, preserved earlier attempt | Source/schema-input hashes, argv, base HEAD, Node, free disk and log-byte hashes; final source bytes checked against receipt |

readG0 pins an expectation, not admission. Schema derivation and counts cannot grant alone. No additional readiness, lifecycle,
tail or process-evidence grant was added. The measuring driver and two-start publication still reach the same sole admitG0 function.

## Limits and open work

No engine/slot, Docker/daemon request, live seed, golden, clone, volume or resident action occurred. No volumes were created/kept;
no cleanup was needed. No merge or push. Live SQL paging/sparse-column behavior, native uniqueness execution, W0/P5 integration,
two-JVM-start qualification and E1 remain unverified; offline publication controls simulate lifecycle hooks and execute actual G0.

Covering every read/validation column supersedes round 7's random-ID/wall-clock exclusions. D now binds one seed lineage's exact
stored metadata. It still verifies clones of that lineage, but independently reseeded E1 arms generally have different IDs/timestamps.
The existing raw-D-equality E1 comparator will refuse them. A separate normalization ruling or deterministic seed metadata is required
before such fresh-vs-clone qualification; this offline fix does not weaken full-column admission or claim E1 readiness. P5 consumers
keep the same shared API, must provide complete schema-derived rows, and must regenerate old pins.
