# EXP-K01 round 9 — lossless values and Q93c E1 digest

Builder CX-K01-R2; branch exp/K01-seed-clone; base 6f7e11f7379ccff881002639db9b6b43d80bb566.
North star: P1-P5 seed-reuse speed with exact values, cuts and validation as the correctness floor.
Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md and main RULINGS-PENDING Q93c.
Read verify/K01 aba64e0's VERIFY-round7 and column controls read-only. No acceptance files changed.

## Result

Fixed R7-F1 as an encoding class in `g0-values.ts`. G0 hashes versioned typed frames, not JSON: numeric binary64 bits
preserve signed zero and observed NaN payloads; bigint uses exact decimal text with a distinct integer tag; strings use
exact UTF-16 code units; booleans/null, arrays, plain records, dates, buffers, typed views and ArrayBuffers have separate
frames. Nested values use the same encoding. Unsupported prototypes, symbols, undefined, functions, cycles, sparse arrays
and accessors refuse. toJSON is never called. The encoding domain changes, so old pins cannot match accidentally.

The actual XTDB scan also needed repair: the ordinary client can decode different pgwire numeric types to the same JS
number before G0 sees them. `g0-wire.ts` uses the pinned Postgres.js raw-row API, preserving each result column's OID and
field bytes. The raw frame is checked for complete columns, row lengths and buffer/null values. Thus int4/int8, integer/float,
float4/float8 and decimal spellings remain different. The scalar whitelist is refusal-only: text NaN cannot reveal payload
bits, and native structured JSON transport can lose nested representation, so those wire types refuse instead of certifying
an approximation. Generic Reader values with directly observable NaN bits are encoded exactly; actual native NaN-payload
transport is not claimed. No engine service or dependency version was modified.

## Two digests

Full **D** remains the only seed-reuse grant, covering all stored columns including IDs/clocks. Existing
readG0/admitG0/requireW0Fingerprint signatures remain stable for EXP-P5. Pin gains only optional Dprime; full-D callers
have no new required input. Raw clone admission never reads Dprime.

New readE1G0 computes **Dprime (D′)** with the same column inventory, applying only `normalization` entries in the G0 module's
normalization implementation. Every entry has an adjacent rationale naming the actual assigning runtime/adapter source.
An independent test requires the comment and an existing assigning-source file for every entry; adding an uncommented
entry fails. Generated assertion IDs are ranked by recorded commit position and stable logical row content within a
commit; transaction/operation/attempt identities and system clocks use commit positions. Ambiguous rank ties refuse.

Runtime-generated `_Transaction` metadata is handled conditionally: entity IDs and default valid_from, the instant field,
and the documented generated portions of change JSON/derived identities are normalized. JSON edits replace only selected
token spans; unrelated business payload bytes, numeric spelling and business dates are preserved. Engine identity aliases,
storage identity composition, repeated clock values and metadata instant identity are checked, rather than normalizing
inconsistent relationships away. The tests include realistic instant/change metadata from two independent seed lineages.

Dprime uses two streamed complete reads and requires their full D values to agree. It retains compact identity/rank indexes,
not whole source rows. The normalizer refuses nonempty side state without a persisted commit-order anchor rather than
inventing an order from random IDs. Full D remains usable for such state; no fabricated Dprime is emitted. This is a
current E1 availability limit, not permission to skip side tables. All read deadlines remain in place.

The seed writer pins both digests before freeze. Golden records retain that pin. Each measured arm still independently
passes its own full D; the fresh E1 comparator now requires equality with the golden's **Dprime**, never its D. Missing
Dprime refuses. Generator hashes include all three new modules. Old pins/goldens must be regenerated. The shared-module
handoff and E1 plan are updated; no P5 branch was edited.

## Offline verification

Final heavy command: `node lab/bin/heavy.mjs --label CX-K01-R9-offline -- node lab/verify/K01/run-round9.mjs`.
**203/203 implementation tests, 30/30 retained reviewer controls, 98/98 independent SQL-reader controls passed; TypeScript passed.**
No failed/skipped/TODO/cancelled tests, signals or spawn errors. The final [receipt](evidence/round9/run.json) matches current
source bytes and exact log hashes. Syntax and whitespace checks passed. Its HEAD names the pre-commit base; source hashes
bind the tested change. [Supplement](evidence/round9/supplement.json) binds the actual parser/pgwire dependency bytes and authority.

Controls cover both zero-sign directions and a dynamic binding, NaN payloads, bigint versus float and precision,
OID/decimal distinctions, Unicode, bytes and typed views, dates, nested values and sentinel strings. The actual raw-row
frame decoder is exercised separately. The E1 tests require equal Dprime but unequal D for independent engine assignments;
full clone admission refuses that changed D. Business values/identities/valid times/actors/attributes remain different.
Realistic transaction metadata, inconsistent aliases/clocks/identity, source change between reads, unranked side state and
normalization-source comments are checked. All prior 89 column mutations and schema tests remain applicable and passing.

The reviewer's extracted-reader harness now supplies a test-owned raw transport hook in addition to its decoded metadata
client. Its SQL projection/pagination and actual G0 still execute; it is not native pgwire/engine execution. All three
original desired-refusal signed-zero controls now pass. No desired-refusal assertion was weakened.

Development-1 (197/30/98) and development-2 (200/30/98) are retained for the subsequent normalization/frame controls.
The final source hashes were checked after all execution. A queued permit was admitted only after the last edits; current
and captured sources match. The first retained reviewer run used its old output destination; that file was copied to durable
attempt-1 and the historical tracked file restored byte-for-byte from HEAD. Later runs use separate durable destinations.

## PASS audit before commit

| Boundary | Content | Freshness | Binding |
|---|---|---|---|
| admitG0 / measuring driver PASS | Complete schema, counts, scopes/positions, typed exact D; W0 also independent oracle | Newly counted/scanned endpoint with deadlines; no prior PASS or diagnostic read | Expected manifest/pin and the same writer endpoint/process before warm-up |
| Dprime source pin and E1 equality | Same full column inventory; only source-commented generated cells normalized; business bytes retained; raw reads agree | Two complete reads, with source-change refusal and bounded reads | Same expected scope/position/counts/world and normalization rule identity; comparator uses this fresh arm's source pin and reference golden Dprime |
| Golden publication (unchanged) | Two clone starts reproduce full D and second layout/T agrees | Sequential actual G0 calls; exclusive new record | Exact manifest/key/config/volume and qualification endpoint; Dprime cannot replace either D |
| Offline test/case receipts | Actual assertions, statuses and raw log-byte hashes; lifecycle explicitly simulated | Fresh subprocesses and no-overwrite receipts; earlier attempts retained | Exact argv, source/schema hashes, Node, disk reading, raw evidence checksum/index and dependency hashes |

readG0 pins an expectation, not admission. The new typed codec, raw-frame checks and normalization helpers grant nothing
alone. Health/layout/copy/resource observations remain refusal-only; stop diagnostics remain unread by decisions.

## Contract pins and evidence retention

lab/acceptance is unchanged. No modified implementation path has an explicit file-hash entry in the inspected main
load-contract or acceptance directory. For contract-builder repinning, [changed-paths.json](evidence/round9/changed-paths.json)
lists each changed/new source path with exact old and new SHA-256 (null old means new file); no contract/pin was rewritten.
Authority file hashes are in supplement.json.

Raw reviewer case output is durable at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round9/`.
[SHA256SUMS](evidence/round9/SHA256SUMS) lists every retained external file and [RAW-INDEX](evidence/round9/RAW-INDEX.md) identifies
final attempt-3. Only small receipts/logs/manifests are committed; no new evidence file over 1 MB or raw-output directory over
5 MB is in git. The external cases retain Object.is signed-zero witnesses because JSON itself cannot display the sign.

## Limits / open verification

No Docker/daemon request, engine slot, volume, resident action, real seed/golden/clone, E1 or P5 integration was run.
No volumes created or kept; no cleanup needed. No main edit, merge or push. Actual wire types/byte fidelity, native
NaN/structured representation transport, cancellation, 500/10k seed/clone timings and two JVM starts remain unverified.
The native scalar reader refuses unsupported representations; E1 refuses unrankable auxiliary state and ambiguous ordering.
These availability limits must be addressed or demonstrated absent on the live seed before E1 qualification. Offline tests
do not qualify performance or a live golden, and full D must not be weakened to make Dprime or an unsupported wire type pass.
