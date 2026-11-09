# EXP-DA01: Datomic storage adapter and Datalog executor

**Result: PROGRESSED — all requested builder gates passed. Independent adversarial review is pending.**
Branch: `exp/DA01-datomic-adapter`. Implementation head:
`034563a4a0408efce2230bf77271790fd02c3ae3` (implementation `13a57c3`, shared-scope fixes `3c738b2`, claims-only annotations `1f09771`, atomic bootstrap `034563a`).
A subsequent report/evidence-only commit contains this report; its hash is in the final builder message.

North star: goal 7's correctness floor and P2's atomic/idempotent commit preconditions. Goals and targets come from
`lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`; procedure from `lab/PROTOCOL.md`; mapping from R29 section 4 and Q78a-e.
No performance priority, workload target, acceptance contract, core or testkit source was changed.

The initial blocked report at `ff7854e` is superseded. The follow-up dispatch explicitly authorized rebuilding and recreating
only lane D's dev resident while retaining its volume. That authorization resolved the previous deployment conflict.

## Fresh gates and evidence

All final gate receipts below bind implementation head `034563a`, the same locally built image and the same gateway source.
Each gate rebuilt the public dist exports before using them. The original receipts remain under `lab/runs/`; exact copies,
raw G1 reports, cleanup responses and build manifests are in `receipts/continued/final/gates/` under the sibling
`EXP-DA01-datomic-adapter` directory. [Evidence summary](../EXP-DA01-datomic-adapter/receipts/continued/final/SUMMARY.json).

| Gate | Run | Result |
| --- | --- | --- |
| G0 | `G0-datomic-20261108T231043Z-594b80` | **PASS: 1,024 executed/pass, zero failures; 56 reviewed skips, zero unexpected skips.** |
| G1 | `G1-datomic-20261108T231116Z-acb0cb` | **PASS: 88/88, complete unchanged suite PASS; zero skips.** |
| G1 repeat | `G1-datomic-20261108T231255Z-141399` | **PASS: 88/88, complete unchanged suite PASS; `previous` is the first passing run above.** |

Both G1 runs have 44 current and 44 reopen case executions, plus their separate complete-suite execution. The unchanged
runner's reopen phase uses new scopes and a second runtime opening; it does not reopen each first-phase database.
Each final G1 run created and deleted **89 databases**, with all 89 actual delete responses returning HTTP 200 and `deleted:true`.
These are builder results, not independent promotion or ten-goal acceptance.

Additional fresh checks, under `receipts/continued/`:

- `live-image7.log`: **41/41** across three files: codec/transport/kernel tests and **10 live adapter cases**. The cases cover
  staged inserts/retractions, nested rollback, immutable assertion IDs, lost ACK resolution, identifiable bounded unknown outcomes,
  original command receipts, signed zero/int64 bounds, concurrent CAS replay, native staged Datalog, and intermediate logical cuts.
- `live-image7.log` also retains ten actual create events and ten successful delete events with their scope/database identities.
- `selftest-9.log`: current-image Peer selftest **3 tests, 46 assertions, zero failures/errors**, through engine.mjs, offline
  in a pool-admitted mem container. It proves that `d/with` accepts a held unfiltered db and that speculation does not publish.
- `lint-final.log`: **zero warnings/errors** for the Datomic implementation/tests. G0 includes builds and TypeScript checks for
  core, testkit, Datomic and qualification. No root-wide backend/service integration acceptance is claimed.
- `consumer-3.log`, `consumer-3/inputs.json` and `consumer-3/smoke-image7.json`: **PASS** for an isolated installation of the actual
  Datomic and current-core tarballs, followed by a public Triples assertion, read and Datalog query against the resident and deletion.
  The smoke was rechecked against the final image; the paired TS artifacts are unchanged by the final gateway-only fixes.
  Installation invokes pinned pnpm **10.11.0**, uses the owned store and task-local caches, and forces all core dependency edges to the local
  core tarball so there is one core/Effect instance. This validates the paired local artifacts, not a registry-only release.

## What was implemented

`makeDatomicRuntime({ url })` is exported from the private package's generated public entrypoint. Storage and queries share one
scoped keepalive HTTP client. The adapter stages rows/claims/retractions in a fiber-local context, preserves callback savepoints
and sibling-conflict detection, and retries only callbacks explicitly marked replay-safe. A single Datomic transaction includes
one scope CAS, unique/value assertion/command/operation identities, commit annotations and the staged writes. Claims-only commits
derive their tx ID and timestamp from the claim; position-only commits receive explicit metadata too. Scope bootstrap publishes a
unique/value singleton marker and the initial header atomically, so a stale initializer cannot reset an advanced position. Subject/attribute/ref
entities are created with tempid upserts, including same-transaction references.

Commit submission resolves an operation ID through a synced lookup after transport loss, returning the original outcome or
`TransactionOutcomeUnknown` with operation/attempt identity at its deadline. A stale source cut is classified before preparing
retractions against a newer db, while the actual Datomic CAS still protects the subsequent submit race.

The gateway keeps unfiltered db values under database-bound handles with a two-minute TTL. Both adapter and native Datalog reads
extend the held value with **real `d/with`**, rather than a TS overlay. Current bases use the current db; past positions use `as-of`.
The P-to-t map is reconstructed from AVET on first access to each opened database and cached at its peer basis, then refreshed when
that basis changes. Position zero maps to the initialized schema/scope, and intermediate positions in one physical commit are
further filtered using per-fact overrides. Deleted databases clear their mapping cache.

The executor emits closed Datomic Datalog over fact entities for patterns, scalar predicates, anti/semi joins and materialized
binary-rule relations. Fact-ID witnesses preserve support multiplicity until aggregation. The gateway rejects query functions
outside its allowlist. Native evaluation uses a timeout; recursive rule evaluation follows the existing XTDB/QLever bounded binary
frontier mechanism with row/depth/deadline budgets, rather than recursive native rules. Exact compute/aggregation, HAVING,
DISTINCT, optional projection, ordering and cursor filtering run in TypeScript. Shared core preflight and cursor binding remain intact.

Integers are canonical int64 text in TS and longs in Datomic. Numbers and instants use finite doubles; blobs use their content hash
plus canonical metadata, and JSON uses canonical text. Unrepresentable/noncanonical values fail before publication. Query work is
bounded by a 30-second deadline, 100k returned/intermediate rule rows and a 64 MiB transport response cap; handle release has a separate
250 ms HTTP budget so it does not extend an unknown-outcome wait by the runtime client's longer deadline. These are implementation
budgets, not a production latency SLA or full goal-6 qualification.

## R29 adaptations and the tests that required them

1. **Scope generation is numeric.** DA00's gateway required every tuple element to be a string. The first live run failed all eight
   original adapter cases at creation. Validation now matches the actual public `DatabaseScope` tuple, including a nonnegative safe
   integer generation. Existing DA00 proof databases remain readable and were preserved.
2. **Transaction annotations with explicit overrides.** Uniform assertions read their timestamp, position and tx ID from the asserting
   transaction. An explicit `:f/asserted-in` ref connects that metadata. General SPI callbacks can allocate multiple logical positions,
   timestamps and transaction IDs before one physical submit. The dedicated live mixed-cut case writes positions 1/2 at 1.25/2.5 ms,
   and verifies exact reads at position 1 and recorded time 2. Such facts retain only the needed assertion overrides; retractions retain
   explicit per-fact metadata alongside `:f/retracted-in` to preserve the same general callback contract. G1's ordinary Triples path
   uses one timestamp per transact; no G1 case required changing core's contract.
3. **Negative zero needs a lossless channel.** `live-2.log` records durable signed-zero loss despite the initial speculative probe
   preserving it. `:f/negative-zero` stores the affected numeric/time field names and restores their sign in row and scalar query reads.
   The final live case verifies `Object.is(value,-0)` for both direct reads and native Datalog projection. No silent +0 conversion remains
   on these tested paths; the typed double channel is retained.
4. **Native clause order matters.** The first committed runtime passed every isolated case, but its accumulated-scope suite timed out
   in the constants/negation/disjunction case. Selective identity/ref clauses now precede global fact scans and entity functions, as
   recommended by [Datomic's clause-order guidance](https://docs.datomic.com/query/query-executing.html). The native 30-second timeout
   uses the [Peer query API](https://docs.datomic.com/query/query-executing.html#timeout). Transport is aligned with that budget.
5. **The bring-up response limit was too small.** After clause ordering, the suite reached journal tests and exceeded DA00's 1 MiB
   health-client cap. The new bounded 64 MiB cap supports that shared-scope read and still fails overflow with a typed transport error.
   `suite-after-cap.json` records all 44 unchanged cases passing before the final gates.

6. **Empty-row commits still need annotations.** The final Peer regression commits only a command claim and verifies its actual
   transaction entity carries `claim-tx` and fractional recorded time 7.25. This closes a code-review finding that ordinary G1 journals
   did not expose.
7. **First-open initialization must be atomic.** A code review found the check-then-initialize path could replay after a writer moved
   the position. The real Peer test now replays that initializer after position 7 and verifies position 7 survives; it also checks refusal
   of a different scope. A unique/value bootstrap marker aborts the complete late initialization transaction. This is a fixed internal
   schema attribute, not a public world-schema change.

No per-subject transaction function, new schema DSL, new public native query API, decimal kind, erasure mechanism or backend rewrite
was introduced. Native Datalog/pull is DA02; performance and per-subject CAS work is DA03.

## Datom measurements

`datoms-image7.json` records actual `tx-data` counts from the transactor, exact readback checks and successful cleanup. Each fresh
scope commits N minimal string facts on one subject/attribute with one timestamp and one logical position, without a command claim.

| Facts | Transaction datoms | Datoms / fact including fixed overhead |
| --- | ---: | ---: |
| 5 | 54 | 10.8 |
| 10 | 99 | 9.9 |
| 50 | 459 | 9.18 |

For this fixture the observed count is **9N + 9**. Optional metadata, retractions, claims and Triplex's journal facts add cost.
These are gateway/adapter measurements, not bare-query performance promoted into complete-application P2 results. No latency or scale
acceptance was attempted. Earlier `datoms.json` retains the redundant-metadata draft's 69/129/609 counts; it was not overwritten.

## Image, deployment and preservation

Final image: `sha256:e98987248eb56e57986d2f860734dadcd342ba72bfc28d711ba79bc839e6693c` (**371,256,402 bytes**).
Final gateway source: `9c845dd87268d94daa14f16f72c97a5d8f9100b1f1ce62ec46ae717a264f8002`.
Final effective config: `73f9985b3add02fb3a9c098ee0f1eee180caac60ea40298b61245dd236d0c9bd`.
All source/build/gateway hashes and copied original build receipts are in `final/SUMMARY.json` and `final/image-builds/`.

| Build attempt | Image ID prefix | Gateway source prefix | Deployment |
| --- | --- | --- | --- |
| 1 | `535de9c352a1` | `ff4a22eb47a6` | built, not deployed (pool refusal) |
| 2 | `26a29b852ec0` | `7cf9f6e3289a` | deployed by `up-2.log` |
| 3 | `812198b90dd5` | `89173b053a6a` | deployed by `up-3.log` |
| 4 | `36a38b9e01ec` | `58bc8d3d1548` | deployed by `up-4.log` |
| 5 | `e17aa3fc258b` | `964c58ead145` | deployed by `up-5.log` |
| 6 | `d1c005582492` | `17a3caad845f` | deployed by `up-6.log` |
| 7 | `e98987248eb5` | `9c845dd87268` | deployed by `up-7.log` |

There were **seven local image builds and six successful recreations**. Every recreation used `engine.mjs down` with the volume
retained, followed by `up` without `--fresh`; no volume-removal flag was used. The initial restart and two early mem selftests were
refused by the pool when an unrelated exclusive slot was active. Another selftest admission was refused while a 1.5 GiB job occupied
remaining capacity; the final current-image selftest subsequently passed. No other resident or unrelated job was stopped.

`final-evidence-final.log` and `final/SUMMARY.json` bind fresh health to the final source hash and read back both retained DA00 databases.
The final DA00 persistence proof's t/position/schema are unchanged (t 1001, position 0, original schema hash). The resident is left
**running READY**, holder **EXP-DA01**, same `tx2-datomic-dev-data` volume, 2.75 GiB/2 CPUs with transactor CPU 0 and gateway CPU 1.
The original ZIP, build contexts, failed attempts, raw runs and source/object preimages are retained.

## First failures, gate changes and limits

First failures remain in canonical FAIL receipts and raw logs: G0's obsolete registry cardinality assertion; G1's 71/88 initial
semantics result; the later 88/88 result whose complete suite timed out; the shared-scope response-cap failure; early scope creation,
signed zero and resource-admission failures. The queued G1 attempt `G1-datomic-20261108T222718Z-b4f74f` was cancelled before build and has
no semantic receipt; it remains unqualified. No old diagnostic was adopted as a PASS.

Datomic G0/G1 now verify and reuse a canonical heavy permit held by their immediate parent wrapper, recording the owner's bytes in
step receipts. This fixes nested-permit starvation without increasing four-job admission or changing X/Q scheduling. The worktree gate
lock still serializes its builds. Some dirty-report runs emitted an optional `git stash create` sandbox/index warning; executable inputs were committed and the
receipts still bind their source/build manifests. No original Git proof was invented. Gate policy adds exactly **ten named Datomic live-test skips**; independent review of this policy
change remains required. No existing X/Q/qualification skip was removed or weakened.

Three necessary adjacent changes extend the original file list: the private package's lockfile importer (workspace core and already
pinned Effect only); the registry test's expected sixth surface/fourth foundation; and the generated Datomic image pins in slots.json.
No external root dependency version changed. Offline installation's unrelated lockfile sorting was restored. No Changeset is needed
for this private package.

The repository-wide `pnpm pack:check` **failed** on the unrelated unbuilt CLI tarball (`package/dist/index.js` missing); its checker
also does not include Datomic. Datomic's own tarball packs and the paired isolated consumer passes. Earlier consumer attempts are
retained: offline metadata was unavailable; the next attempt selected a registry core with a different API and inadvertently used the
outside-workspace pnpm default. Final consumer attempt 3 explicitly invokes pinned pnpm 10.11.0, uses task-local metadata/state caches,
and overrides all core edges to the exact local tarball. No global config was changed. This is not registry-only release verification.

Independent review, production provisioning/authentication, Q78e storage/tenancy calls, erasure, full cancellation/resource acceptance,
P1-P5 tuning, large-scale loads and golden scenarios remain open. The implementation has bounded reads and a general history scan in
`dependencyState`; its scale cost is unqualified. No main merge, push, deployment outside this explicitly authorized resident, package
publication, subagent launch, homebase checkout/port access or unrelated cleanup occurred.

Delivered artifact checksums are in `receipts/continued/final/FILES-final.json`. The first checksum draft included its still-active
stdout log; it is retained and marked unqualified by `manifest-validation.json`. The final index excludes generation logs.


## Round 2 — Q85a–d and the DA00 review

This round addresses `verify/DA00` at `d393484`, specifically F1–F4, under Q85a–d in the main checkout's
`lab/acceptance/RULINGS-PENDING.md`. Executable source is committed at `e622b3b3ab5412f612794c5685b6b18051dff991` (full identity in the round-2 summary).
The previous round's results above remain historical; round-2 raw evidence is kept separately in `round2/`.

Q85a: retained the atomic, unique-value bootstrap guard added in round 1. The new synchronized regression pauses initializer A's
actual position-zero transaction, completes B, writes position 7, then resumes A. Both creators return the same database and position
7 survives. This uses the actual Peer API and transactions, with a promise-based interleaving adapted from the reviewer's reproduction.
All scratch databases are deleted. No mock database result or sleep-based race assertion is used.

Q85b: all canonical scopes from public `DatabaseScope.make` and `.test` are accepted, including environments other than `test`.
The name is `s2-` plus unpadded URL-safe Base64 of the canonical scope text's UTF-8 bytes; the JVM inverse verifies a canonical
round trip. The canonical serializer matches JavaScript string escaping, including lone UTF-16 surrogates, and JavaScript trim's
whitespace set. Blank identities, alternate tuple versions, string/negative/unsafe generations and noncanonical JSON spellings are
refused. Adapter and executor share the same TypeScript address helper. Live regressions use the actual public constructor, Unicode,
quotes, slash/backslash, a lone surrogate, trim-sensitive strings, negative-zero generation and the maximum safe generation.
Legacy hash names remain readable to preserve DA00's proof databases; provisioning uses the reversible names. This is identity
compatibility, not production authentication, tenancy or provisioning qualification.

Q85c: builds exclusively create a new context per attempt, refuse existing directories, reject symlinks (including source roots), special paths and empty directories, and
compare every staged file's path, length and SHA-256 against verified distribution/config/gateway/codec inputs before Docker runs.
No copy merges into an old context. The input hash includes the shared codec specification and the duplicated Dockerfile is checked
against the verified config copy. The documented bin-file executable-bit restoration remains the only post-copy mode transform.
The regression pre-seeds the reviewer's `datomic/UNVERIFIED-CX-VDA00` file, checks refusal, then injects an extra file and symlink into
a clean staged context and checks final verification refuses both. Additional regressions reject symlink roots and empty directories;
the verified ZIP contains no empty directories. The real build uses that same staging/verification helper.

Q85d: `packages/datomic/src/codec-spec.json` is the single grammar/range/representation definition consumed by both runtimes.
The builder stages that exact file into the JVM image and includes its hash in image inputs. Shared acceptance vectors retain the
reviewer's 62 cases, with `-0` integer text updated to the already-established canonical-integer contract, plus seven boundary cases.
TypeScript uses exact BigInt exponent and fractional-digit arithmetic. Both reject `1E-2147483648`, `1.0E-2147483647` and the huge
exponent while accepting `1E+2147483648` (scale -2147483648). Whole-string grammar checks also reject trailing newlines consistently.
Keyword whitespace is an explicit shared character set to avoid Java/JavaScript regex differences. JVM decimal re-encoding preserves
coefficient and scale, while spelling can normalize (for example decimal negative zero); no binary64 coercion is used for decimals.

The rebuilt image is `sha256:1af4d8bcf83ca61459ea9f3beec576d50565da91fbde935ea977e8e217190312`.
Its build input hash is `1b536858f5f4b1a0a27539fe27a0312318f2c040192272ef941ffc18a2b80ccd`, source input hash
`19e7db07386b9f5a19d41b44f59759034c8d2978c5fb27ba0a83e9b07c0d1356`, and gateway source hash
`d1a6b21cca7171d4a1377cfa634f17f00185140ff17ee9b0929f39ae8649bd98`. It is locally built and pinned by image ID.
The authorized `engine.mjs down`/`up` retained `tx2-datomic-dev-data`; both DA00 proof databases still return their original basis
`t=1001`, position 0 and original schema hash. The dev resident is READY and remains owned by EXP-DA01.

The first live attempt is retained in `round2/live-1.log`: the new scope test exceeded Vitest's default five seconds, and ten adapter
cases exposed remaining old hash-based addresses. The first G1 at source `f709873a` therefore failed 86/88 executions (2 passed);
its terminal receipt and cleanup are retained. The address helper correction and a bounded 30-second budget for the three-database
identity test are committed separately. The next G1 at `339b2058` failed 62/88 executions because the client basis-name guard still
accepted only legacy hashes; its full-suite failure and cleanup are retained too. The final correction admits encoded names at that
guard and adds basis readback to the public-constructor regression. All assertions and runtime request budgets remain intact. The initial lab-test invocation
used a directory path unsupported by this Node runner; `lab-tests-first.log` retains that harness invocation failure and the explicit
`*.test.mjs` rerun passes 23/23. Earlier results are not substituted for final-source acceptance.

The G0 live-test skip policy adds exactly one named Datomic test (11 Datomic live skips total); independent verifier review of that
policy change remains required. Existing X/Q/qualification skip entries are unchanged.

Validation: JVM selftest 6 tests/135 assertions; TypeScript codec/query 100/100; lab helper/control tests 23/23 (including the final
context hardening); Datomic TypeScript typecheck passed; live package tests 111/111 with 13/13 databases deleted. Gate results follow.


No external dependency or lockfile pin changed in round 2. The image build, resident lifecycle, live suite and every engine-backed
gate run use the lab heavy wrapper. The resident was never started with `--fresh`; no volume was removed. No X/Q lifecycle action,
exclusive-slot acquisition, main-checkout edit, merge, push or publication occurred. Final gate receipts report zero executed-source
diff bytes; dirty paths are reports/receipts only. Optional `git stash create` cannot write the index from the gate's sandbox, so its
warning remains visible rather than being represented as a successful stash; actual source/build manifests still bind the executed bytes.

Independent adversarial review, including the added skip-policy entry, remains required. This round does not rerun large-scale or
P1–P5 performance qualification, production/authentication/tenancy certification, erasure, full resource/cancellation acceptance,
package consumer qualification or root `pnpm pack:check`. The earlier root pack failure remains as described above; no fresh tarball
or consumer PASS is claimed for the round-2 source. DA02 native/pull and later storage qualification remain out of scope.


A second fresh-context build exercises the final empty-directory/root-symlink guard. It reproduces the identical immutable image ID
and input hashes, so the already-recreated resident is running the exact final image. The Datomic package tree is identical at live-test
source `9a7c837238855fe132b177f5248aba197846efd1` and final builder source `e622b3b3ab5412f612794c5685b6b18051dff991`:
Git tree `9a636a7ad19d6033e96060c90deabca3474b69a7`. Final G0/G1 are rerun against the latter commit; the 111-test live result binds
that unchanged package tree. No extra resident restart is needed for the byte-identical image.


Final-source acceptance (all three receipts bind `e622b3b3ab5412f612794c5685b6b18051dff991`, with no executed-source changes):

| Gate | Run | Result | Cleanup |
| --- | --- | --- | --- |
| G0 | `G0-datomic-20261108T234411Z-39ad84` | PASS: 1093/1093, 57 expected skips, zero unexpected skips | No live Datomic tests in G0 |
| G1 | `G1-datomic-20261108T234745Z-c6de65` | PASS: 88/88 (44 current + 44 reopened), complete suite PASS | 89/89 deleted |
| G1 `--previous` | `G1-datomic-20261108T234916Z-200550` | PASS: 88/88, complete suite PASS; previous `c6de65` | 89/89 deleted |

The final evidence collector verifies the linked same-source G1 passes, zero source diff bytes, complete-suite results, every gate
cleanup response, the live package tree, actual running container image ID, owner EXP-DA01, gateway health/source hash and unchanged
DA00 proofs. Both fresh builds contain exactly 811 verified regular-file inputs and produce the same image. Final host free space was
14,133,837,824 bytes. The resident remains READY, capped at 2.75 GiB, with its existing volume retained.

Evidence: [round-2 summary](round2/SUMMARY.json), [file checksums](round2/FILES.json), [final resident status](round2/engine-status-final.txt),
[actual resident image](round2/resident-image.json), [first build receipt](round2/build-1-receipt.json),
[final fresh build receipt](round2/build-2-receipt.json), [live tests](round2/live-final.log), [JVM selftest](round2/selftest-1.log),
and copied terminal gate receipts/raw artifacts under `round2/gates/`. Canonical original receipts remain in `lab/runs/G0/` and
`lab/runs/G1/`; original raw runs, contexts, images and object preimages are retained. No failed attempt was deleted or adopted as a PASS.

Open: independent DA00/DA01 review and the skip-policy review; later storage/provisioning/tenancy and performance acceptance listed above.


## Round 3 — coherent read pins and indexed basis/subject lookup (Q89)

North star: P1's exact named cuts, with P4/P5 access-path correctness. This round addresses R31 D-D1, D-D3, D-D4 and the
`getByEntities` part of D-D5, plus Q89b/c/d and the Q89f route gate. Authority: the main checkout's Q89 rulings and R31 sections
2, 3 and 5.2–5.5; their hashes and the Q89 text are in `round3/authority.json`. Final executable source:
`6f70eb46dea8ecae3d3448a2d1ceaa05e3844de0`. Independent review remains required.

### Read behavior

- Every Datalog execution acquires one held immutable Peer database and releases it on success or failure. Every rule round,
  the final native query and optional projection pull carries that handle and one resolved position. A query inside a staged
  transaction borrows the parent's handle and freezes its staged input once; it does not release the parent's handle.
  Held requests bypass `d/sync` and never replace the held value with a newer database.
- Future positions are checked against the available head of the exact database being read. Unheld reads poll publication;
  held reads preserve their pin and refuse rather than advance. The default wait is 500 ms, bounded by the gateway's 1–2000 ms
  `basisWaitMs` range and a monotonic deadline. The gateway returns HTTP 409/code `BasisNotAvailable`; the SDK maps it to
  exported `DatomicBasisNotAvailable`, a `ReadError` subtype with that matchable code and reason. The SPI error tag stays compatible.
  Empty batches and dependency reads also validate their basis, so neither can silently accept a future position.
- Position selection uses the first `d/index-range` entry at or above P on `:triplex.tx/position`, preserving sparse interior
  ordinals in a multi-position physical transaction. P=0 uses the initial scope-key datom; P=head uses the held/current db.
  The old per-basis full-scan map/cache and its invalidation calls are removed.
- Batch reads resolve each distinct subject by its unique identity and enumerate `:f/subject` via VAET. Missing subjects and
  empty selections remain empty after basis validation; unrelated facts are not enumerated.
- Default reads retain full subject history and can answer T/TP. A qualification-only gateway `route: "live"` allows the
  position-retired `:f/live` primitive to be forced. Its eligibility refuses every record-time basis, history enumeration and
  interior logical positions that are not physical transaction ends. Native EDN selecting `:f/live` has the same T/interior
  guard. The TypeScript runtime does not select this path by default; this is correctness qualification, not P4 promotion.
- Returned row retirement metadata is masked when that retirement is unknown at the requested P/T. This makes complete row
  versions agree across ordinary, held, staged and historical routes and with O-REPLAY's as-of snapshot, including interior cuts.

### Regressions and shared route gate

Deterministic live schedules commit after the first `/q` response. The optional-pull schedule retracts both type T and status a,
then asserts status b: the result remains the old T/a cut, never the impossible T/b mix. The rule schedule replaces a→b with b→c
between rounds: the pinned query keeps a→b and never fabricates a→c. The tests check common handles/bases and release after both
success and injected query failure; the existing staged-query test also proves the parent handle remains usable.

Future-cut tests cover pulls, populated/empty batches, dependency state, Datalog and held transaction reads, assert the SDK error
type and nonzero wait, and verify catch-up can succeed. The JVM schedule waits for the reader's first refresh before committing
its requested position. JVM instrumentation rejects any full `:triplex.tx/position` or `:f/id` scan while the seek/batch tests run,
checks native range-seek arguments, and verifies a selected subject with 97 unrelated facts present. It also tests the live-index
refusal, including native EDN. The 40-assert/10-retract case returns all 40 at T/TP through the full-history route; forced live
pulls and native queries refuse those bases with the typed availability error.

`packages/testkit` now exports a shared seeded history generator and `makeRouteEquivalenceCases`. The bounded DA01 profile has
six subjects, 40 logical positions in 39 physical commit groups, group retirement, replacements, cardinality-many support,
assert-then-pattern-retract, validity bounds, a position-only command, tied stamps and an interior ordinal. Eleven P/T/TP/V bases
are read through source/as-of, held, staged and guarded live routes, repeated after 11 history advances. The runner checks independent
oracle equality, cross-route/repeat equality, declared refusals, coverage, route provenance, basis echoes and fail-open flags.
Adversarial runner tests reject incorrect rows (including a signed-zero change), false route/basis echoes, fail-open flags,
undeclared refusals, missing coverage and repeat drift.

The independent O-REPLAY CLI evaluates the driver-recorded commands/receipts before and after the advances. Each fixture retains
both complete case/expected files, actual row/refusal observations and route traces: 88 observations, 82 answers and 6 declared
refusals; head advances from 40 to 51 and pinned answers stay equal. This is a bounded profile, not every proposed R31 operation,
basis cross-product, route or large profile. Datalog's between-request schedules are additional focused regressions.

Datomic G1 now requires this fixture as an extra step after the unchanged 44-case current/reopen/full-suite run. It requires its
one live test to execute and pass, stores the six evidence files and fixture/oracle preimages, checks the built packages stayed
unchanged and rechecks the resident identity. Its main conformance denominator remains 88. This strengthened G1 policy and exactly
five added G0 live-test skips (16 Datomic live skips total) need independent gate-policy review. Existing X/Q skip entries and
44-case conformance names are unchanged. The testkit export has a Changeset; the only lockfile change is the workspace testkit
dev-dependency link. Frozen offline installation completed with pnpm 10.11.0 and the owned store; no external version pin changed.

### Deployment and acceptance

Both gateway images were built locally in fresh verified contexts and pinned by immutable ID. The final image is
`sha256:9619fb07157511efa7c22e8e86041cb9179ffd473c28bb761344ca57bcc59a30`; gateway source hash
`92c14a52764a4933376e8efbf4b7164a4d8f0318fe7996d6ac3ac8242e62386f`; source inputs
`92984ee3875d609aace2c1fd368a61eaaa979c06e99b4b6afe45d6f5b79f9604`; build inputs
`2e8f170abdbea1e926bf313d41ae77edceadd90a39f49929824f29b789b37634`.

The pool first refused an extra 1.5 GiB selftest JVM alongside the resident. Each authorized restart window therefore ran
`engine.mjs down`, the pool-admitted selftest, then `up`, with the same EXP-DA01 holder and the volume retained. Two successful
windows are recorded command-by-command. The final JVM result is 7 tests/157 assertions, zero failures/errors. Both DA00 proof
databases still read `t=1001`, position 0 and their original schema hash. No `--fresh` or volume deletion was used.

| Check | Evidence | Result |
| --- | --- | --- |
| Offline codec/kernel/shared-runner | `round3/offline-1.log` | 102/102 |
| Final live package/shared-runner tests | `round3/live-final.log` | 118/118; 18/18 databases deleted |
| JVM final image | `round3/selftest-window-2.log` | 157/157 assertions |
| Lab helper/control tests | `round3/lab-tests.log` | 23/23 |
| Datomic + testkit typechecks | `round3/*typecheck*.log` and committed-source check | PASS |
| G0 | `G0-datomic-20261109T001802Z-f61e8a` | 1095/1095; 62 expected skips; zero unexpected |
| G1 | `G1-datomic-20261109T001828Z-85abad` | 88/88 + complete suite + route gate PASS |
| G1 `--previous` | `G1-datomic-20261109T002002Z-e3adf2` | 88/88 + complete suite + route gate PASS; previous `85abad` |

Both G1 attempts delete 89/89 conformance databases and their additional route-fixture database. All three terminal receipts bind
`6f70eb46` with no modified/untracked executed-source files. Raw runs and first failures are retained; final packet collection
checks source, image, cleanup, oracle artifacts and the linked rerun before producing `round3/SUMMARY.json` and `round3/FILES.json`.

The first live diagnostic retained a missing newly added workspace dependency link and an overbroad test trace that counted the
injected writer's reads; both test setup defects were fixed. The first O-REPLAY diagnostic correctly rejected a driver that used
plain retract on a not-yet-committed symbolic assertion. The driver now uses the supported staged `retract-pattern` form; the failed
case and FAIL oracle output remain. No oracle expectation was changed. The first intermediate JVM/image result (156 assertions)
also remains; the final image adds the native EDN guard and its assertion. No failed diagnostic is adopted as final acceptance.

The required root `pnpm pack:check` was rerun and failed on the already-unbuilt unrelated CLI tarball missing `dist/index.js`;
`round3/pack-check.log`, receipt and all produced tarballs are retained. A targeted paired core/testkit tarball export/type smoke
passed both types and runtime checks using existing pinned dependency links (`round3/packed-exports/receipt.json`); it is not a
fresh dependency installation or registry consumer qualification.

Open: independent adversarial and gate-policy review; Q89a/R33 decision-time record stamps and watermark, Q89g public position
API, exhaustive/large R31 profiles, D-D6's remaining initial sync cost, attribute/dependency-state scan cost, production storage,
authentication/tenant certification, erasure, full cancellation/resource and P1–P5 performance qualification. No new record-time
watermark or public TemporalBasis contract was introduced. No performance bar, promotion, main merge, push, publication, subagent
launch, unrelated engine lifecycle or forbidden checkout/port access is claimed or was performed.


Final packet: [summary](round3/SUMMARY.json), [checksums](round3/FILES.json), [resident status](round3/engine-status-final.txt),
[resident image](round3/resident-image.json), [final image build receipt](round3/build-2-receipt.json),
[packed testkit export receipt](round3/packed-exports/receipt.json), and terminal receipt/raw directories under `round3/gates/`.
The resident is READY on the exact pinned image, holder EXP-DA01, with its volume retained. Final collection observed
12,981,252,096 bytes host free. Both oracle runs and complete row/refusal journals for each G1 route fixture are retained.
The checksum index excludes dependency/cache directories and its own generation logs; all other retained packet files are indexed.
Canonical `lab/runs/` receipts, original raw runs and engine build contexts remain in place. Nothing was merged or pushed.

## Round 4 — close indirect live-index selection (CX-DA01)

Joint review `807c46e` returned FIX-FIRST for F1. The original reviewer script and
semantic test source are copied unchanged under `round4/reviewer/`; the local
script changes only relative imports to run at this deeper location. Its fresh
pre-deploy characterization reproduces 40 to 30 IDs for `ground` and `:db/ident`
at T/TP while history returns 40. This is a defect characterization, not a PASS.
The script captures dirty candidate source bytes as well as the distinct old
resident identity; it does not claim the edited gateway was already deployed.

The native route classifier now proves history eligibility over all database
patterns and nested conjunction, negation and disjunction clauses. Any literal
`:f/live`, variable, numeric, lookup-ref or omitted attribute selects the shared
`storage/assert-subject-route!` guard before execution. Only literal other keyword
attributes prove history safety. This deliberately refuses even a variable bound
to `:f/subject` for unsupported cuts; using a literal history attribute is the
supported alternative. Fixed `$ $rules` input order prevents disguising the
Datomic database as the in-memory relation. Allowlisted scalar functions do not
issue queries or pulls. Compiled queries, rule rounds and optional pulls continue
to use history attributes and their existing immutable query handle.

The required G1 O-REPLAY fixture now also runs `query-route-matrix.ts`: latest,
validity boundaries, zero/old/physical/interior/future P, T and TP cuts through
adapter pattern/batch reads, compiled queries, rules, optional projections,
literal/ground/ident/numeric/omitted/nested/map native forms and live pull shapes.
Every native form also executes with held and speculative database values.
Before/after checks compare complete sorted assertion IDs against the history
route, require typed refusal for ineligible routes, and repeat named cuts after
ten retirements. Existing O-REPLAY full-row comparisons remain unchanged. All
matrix observations share the six existing oracle/route evidence files, and G1
binds the new helper source without changing its expected executed test count or
G0 skips.

The first expanded live run retained `live-first.*`: 117/118 pass, with an actual
`attribute-not-indexed` error on the previously untested live attribute-only pull.
Whole live enumeration now uses AEVT; per-subject VAET remains unchanged. Both
rebuild/deploy windows and the first failure are retained. The second image's
selftest passes 8 tests / 171 assertions; the resident is restored READY with its
volume retained. Final gates and source-bound live validation are recorded below
once complete.

### Round 4 PASS / verdict / receipt audit (preamble 9a)

This list was written before committing the changed verdict-producing code.

1. **`query-route-matrix.ts` assertions.** Content: actual IDs equal the explicit
   history control, latest has 40/30, named historical cuts retain 40, optional
   values agree, and every ineligible outcome has `BasisNotAvailable`; arbitrary
   exceptions cannot count as refusal. Freshness: the enclosing fixture creates a
   new UUID database and writes this attempt's assertions, logical cuts and ten
   retirements. Binding: every journal entry names phase, path, requested basis,
   eligibility, expected IDs and observed IDs/error; G1 hashes this helper with the
   fixture and binds the actual endpoint, stable resident and built exports.
2. **`route-equivalence.test.ts` / required G1 step.** Content: existing independent
   O-REPLAY row-byte equality and declared refusals still run, followed by the full
   matrix; any assertion fails the one required live fixture. G1 still requires
   exit zero, one actual pass, no failures/pending, all six evidence files, stable
   dist and resident. Freshness: new UUID oracle directory and test database in
   each gate attempt. Binding: exact helper/fixture/oracle preimages are included
   in the gate receipt; route journals and expected bytes are hashed. No old PASS
   is adopted as a fresh run and no skip/denominator is weakened.
3. **JVM `native-route-classification` / engine selftest.** Content: actual parser
   forms select the expected route, including both review reproductions, explicit
   sources, numeric/lookup-ref/omitted attributes and nested/map grammar. Existing
   engine-backed guard tests run too. Freshness: a new selftest invocation in each
   authorized restart window. Binding: engine verifies the locally built pinned
   image against the fresh verified context/source/config hash, then runs its
   actual JVM; retained selftest/build/deploy logs identify these invocations.
4. **`round4/live.mjs` validation receipt.** Content: JSON report must contain 118
   executed passes, no failures or pending, and every one of 18 created databases
   must have one matching successful actual delete. Source and built bytes, owner,
   image, health, container ID and start time must be unchanged. Freshness: output
   must not exist and log creation is exclusive; unique scope events and this
   invocation's start/end/output SHA are retained. Binding: exact source/dist
   fingerprints, command, slot owner and pinned image are in the receipt. Its raw
   observation receipt is saved before assertions to preserve failures; only the
   final `validated:true` output means all checks passed.
5. **Copied reviewer characterization.** Content: actual before 40 / after 30 and
   literal refusal/history 40 controls, plus actual successful delete. Freshness:
   new UUID database and new sequential writes. Binding: original script identity,
   local import-only adaptation, complete request/response bytes, observed old
   gateway/owner and source snapshots. `findingReproduced` characterizes the old
   defect and is never an acceptance verdict.
6. **Round 4 collector / final evidence index.** Content: final-source G0, linked
   G1 runs, actual outcome denominators, oracle and matrix bytes/refusals, live
   validation/cleanup and resident/proof preservation must all match. Freshness:
   select this round's exact implementation head and current attempts, not prior
   rounds; copied raw files preserve their run IDs and times. Binding: rehash gate
   evidence, helper/oracle sources, image/build context and retained proof bodies;
   `FILES.json` checks every retained artifact's path, length and SHA. These checks
   qualify the exercised regression slice only, not production or durability.
