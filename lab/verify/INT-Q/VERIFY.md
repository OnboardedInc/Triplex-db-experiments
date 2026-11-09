# INT-Q independent review — CX-VINTQ

**Verdict: ACCEPT — ready for contract 0.3.14, with the broker remaining default off.**

Reviewed `int/P2Q-SQL01` at `3c2e4b833f96e765ca1195810c1173982d54a4f6` (full identity in RUNS.json). Review branch: `verify/INT-Q`. No blocking findings, product edits, acceptance edits, main merge, push, engine lifecycle change or exclusive slot. The additional tests are reviewer tools, not product fixes.

North star: correctness of P1 named snapshots and P2 atomic durable commits, with P4 H1 eligibility. Scope/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. This accepts integration of the already accepted default-off candidates; it closes no production or performance obligation.

## Fresh verification

All completed command receipts bind HEAD `3c2e4b83…`, the tracked source bytes, command, timestamps, tool version, free disk, actual exit/signal and log SHA-256. Every recorded input still matches. The final reviewer-probe receipt additionally inventories the exact review test/config/runner bytes. See [RUNS.json](RUNS.json) for exact commands and durable receipt paths.

| Fresh run | Observed content |
| --- | --- |
| QLever package | 235 passed, 26 expected live skips |
| P2Q applicable offline matrix | 873 passed, 22 skipped: 21 live and the explicitly excluded burned-LSN case |
| P2Q selected storage controls | 5 passed, 3 explicitly filtered infrastructure tests |
| SQL01 independent semantic suite | 11/11; 12 generated histories, 288 commits, 77,616 reads / 38,808 route pairs; zero mismatches; 2,904 H1 serves, 35,904 natural source reads, 38,808 forced source reads |
| Testkit | 93/93 |
| Actual SQLite H1 `/route` driver | 1/1; T and TP refusal witnesses, exact complete snapshot rows, extension and pinned/unpinned purges |
| Additional reviewer probes | 5/5: every repository row route, direct worker/sweep refusal, ACK ordering/group size/no timer, alias writer exclusion, actual SQLite statement failure/recovery |
| Five live broker cases | 5/5 on shared qlever-dev, port 7070, unique graphs |
| SQLite process-stop verifier | 50 stops; 160 parent-observed ACKs, zero lost; 189 feed positions, zero duplicate/missing positions |
| Contract `--verify` | Exit 0, second regeneration byte-identical |

SQL01's final generated expectations are derived from submitted events, not persisted `recent_rows` or H1 output. Exact row canonicalization checks all fields. The route harness explicitly labels its separate fold reference `offline-fold-not-independent`; it is not misrepresented as the independent SQL01 oracle.

Live engine identity retained in `raw/lab/verify/INT-Q/output/qlever-identity.txt`: container `a809fb6cb3ba858da2984c65fcea810bce9833627c930c7070e33e6e39a3f826`, image `sha256:37d5ede193f1bffb6aebf734d15d2a4c2a3228ee102858b0c6c2e65c149a78ec`, `tx2.lane=qlever`, `tx2.slot=dev`, `tx2.holder=EXP-000`. These shared-slot timings are diagnostic.

The builder's 11 indexed receipt/log hash pairs were independently read back and matched. Older G0 QLever receipts differ from today's source inventory only in the later SQL01 oracle adaptation (not a G0 input); no product source drift was found. The first direct package receipt's original false flag is retained rather than upgraded. Full G0 QLever/XTDB and package packing are audited builder evidence, not fresh reviewer reruns.

## 1. Every conflict, against both parents

I reconstructed both merges with `git show --remerge-diff`, then saved a full diff of every resolved file against **each** parent. Durable audit files: `output/p2q-remerge.diff`, `output/sql01-remerge.diff`, `output/6ae38068-parent{1,2}.diff`, `output/8e9b682f-parent{1,2}.diff` under the evidence root's `raw/lab/verify/INT-Q/` directory. The reconstructed conflict inventory agrees with the integration report: five P2Q files, one SQL01 file.

| Resolved file / conflict | Behavior retained from both sides |
| --- | --- |
| `packages/core/src/runtime/index.ts` | Main's FrontierClosure exports and P2Q's read constructors, policy and provenance export coexist. Neither export group is dropped. |
| `packages/qlever/src/QleverQueryExecutor.ts` | Main's read-only recursion and VALUES relations remain; all recursion/materialization/answer SELECTs use P2Q's snapshot-bound `replicaClient`, typed transport errors, before/after gate and private read construction. No scratch update is restored. |
| `packages/qlever/src/QleverStorageAdapter.ts` | Main's compact encoding validation and A0 write encoding remain. The broker is an explicit early dispatch; accepted broker options are forwarded. Default runtime construction stays A0. |
| `packages/qlever/src/index.ts` | Both option sets/export groups remain. Environment broker activation still requires an explicit directory. Broker lifecycle/fresh-connection wiring and `resolveQueryBasis` remain, and user `queryLimits` cannot supply internal `resolveBasis`. Main's encoding selector reaches A0. The removed scratch-update error stays removed. |
| `packages/qlever/src/native/NativeQueries.ts` | Main's read-only resolver/wrapper and relation strategy remain; P2Q's private construction, basis availability, transport classification and incarnation/position after-check remain. Relation SELECTs use `replicaQuery`; cleanup/update paths are absent. |
| `broker/BrokerStorageAdapter.ts`: reference default | Only formatting; no semantic loss. |
| Same file: old per-method future guard | P2Q's common `readBasis` replaces the older duplicated guard. It checks empty reads and immutable transaction pins as well as ordinary reads. |
| Same file: row return | P2Q's complete retirement-tuple mask remains on top of SQL01's async H1/source selection. |
| Same file: dependency state / query basis / read table | P2Q's transaction-aware basis gate, empty-attribute availability check, remaining deadline and private snapshot construction remain. Both overlay lookups use SQL01's async indexed worker queries; no synchronous old overlay was accidentally restored. |

`git diff f0e881c 6ae38068 -- packages/qlever/src/broker packages/core/src/storage/ReadSurface.ts packages/core/src/store/TriplesLive.ts` is empty. SQL01's accepted `log.ts` and `sqlite-worker.ts` are unchanged at the merge itself (`git diff 73fbe45 8e9b682f --` those paths is empty); subsequent functional edits are the reviewed Q89b refusal. The final source changes following the merges are formatting, that refusal and its tests, compact scan exclusions, exact skip additions, and the independently reviewed fixtures/oracle. No conflict-specific regression was found.

## 2. Exclusion audit, including replacement coverage

Exclusion is justified by the protected property and current execution, not by its filename. The applicable tests below actually ran in this review. Reviewer-only coverage added where the integration's run set omitted a direct replacement is committed here.

| Excluded historical check | Protected property and current coverage |
| --- | --- |
| `check1-durability`: every last-frame cut, ACKed damage refusal | Legacy tail truncation/backup is format-specific and inapplicable to SQLite. `sqlite-broker.test.ts` checks damaged acknowledged frame and ahead/corrupt ACKED refusal; the fresh 50-stop verifier checks recovery at real before/inflight/after-append/after-sidecar/ACK boundaries. This is not a claim of exhaustive SQLite page-fault testing. |
| Same: every bit of middle frame/segment header | The exact segment-header matrix is retired. Package frame tests still check CRC, every truncation and corruption detection; SQLite corruption/sidecar tests exercise the real persisted backend. |
| Same: failure before fsync return | Reviewer `sqlite-ack.test.ts` injects an actual SQLite statement abort, requires rejection/no ACK, refuses later admissions, checks the retained prefix directly in SQL, reopens, and retries. Process-stop `inflight` cases cover uncertain completion. |
| Same: mid-write half frame and burned LSN | SQLite's transaction either commits the whole frame/index group or rolls it back. The fresh process-stop verifier checks all rows/receipt/claim and feed after restart. No segment tail or reserved burned LSN is produced by this backend. |
| Same: exception between fsync and watermark | Package `broker-fixes.test.ts` m1 runs: outcome unknown, no unhandled rejection, later write refusal, restart and original-command resolution. Process-stop after-append/after-sidecar cases also ran. |
| Same: random abrupt stops / acknowledged survival | The fresh SQL01 50-stop verifier checks whole process death, ACKs retained by the parent, exact recovered rows/receipts/claims, and feed resumption. |
| Same: second open, symlink alias, ACK survival | Package same-process takeover and cross-process holder cases ran. Reviewer `sqlite-ack.test.ts` additionally checks an alias to the same directory is refused while the original still commits. |
| `check1-lock-process`: source fixture, graceful group termination, abrupt holder exit, exit without close, helper death, Ctrl-C during drain | SQLite owns the separate lock file; the Perl helper no longer exists. Package C3/Q84a/Q72a tests run real source subprocesses, refuse contenders while the owner lives/drains, recover after its death and retain ACKs. The 50-stop verifier covers unclosed process exit. Helper-specific SIGHUP/death assertions have no corresponding helper to test. |
| `check2-ack`: fsync/publication/ACK trace, group cap and no timer | The old FileHandle hook is gone. Reviewer `sqlite-ack.test.ts` traces actual SQLite append completion, synchronous publication and 160 ACKs, independently reads durable group payloads, requires max 64 members and at least one grouped frame. A lone commit resolves with all parent `setTimeout` callbacks frozen. SQLite pragma configuration is source-inspected; this does not observe a physical full-sync syscall. |
| `check2-ack`: duplicate and CAS controls | Not lost: selected storage run executes both. Package duplicate/CAS tests and SQL01 concurrent/reopened receipt tests also run. |
| `check4-feed`: consumer crash schedule | Not lost: selected storage run executes 100 crashes per each of four consumer variants, requiring zero missing/extras, keyed deduplication and an unkeyed duplicate witness. |
| `check4-feed`: bytes present before published watermark | Unsynced segment-byte injection no longer models the atomic SQLite transaction. Reviewer ACK-order probe, SQL01 complete-row/receipt reopen test, and the 50-stop feed/ACK comparison protect publication of complete durable prefixes. |
| Scratch-only `round10-public-type.test.ts` | Its authored mutation file is absent; it was a historical demonstration of the former symbol defect. Running it would test missing scratch input. Current `round10-construction` checks symbol snapshot policy and native inferred/runtime keys; `round11-surface` checks all four public services, 80 extension routes and private provenance. These all ran. |
| Superseded `round10-types.test.ts` | `round11-types.test.ts` runs the same five resolved TypeScript checker variants with the current private-constructor mutation anchor. Diff confirms the substantive change is that anchor, not a weaker expectation. |
| `check5-q31c`: burned-LSN case | It creates a legacy segment file, which SQLite deliberately refuses. Burn/aborted-feed behavior is not generated by SQLite. The applicable nested ordinal, out-of-range ordinal and future-cut controls ran; exact pinned cuts also run in SQL01 and H1 route tests. No aborted frame is invented merely to preserve the old test. |

**Remaining coverage limits:** no physical power-loss qualification, exhaustive SQLite page corruption matrix, or indefinite pinned-reader/WAL-growth policy qualification. These are not accepted as passed. No applicable logical property above remains supported solely by an excluded segment/flock/FileHandle test after the additional reviewer probes and fresh process-stop run.

## 3. SQL01 transport fixture

The diff against accepted `73fbe45` is retained in `output/sql01-fixture.diff`. Both outage stubs still throw a `TypeError`; they now carry an `ECONNREFUSED` cause. Their initialization exception, row/ID/basis assertions, schedules and complete source fallback checks are preserved. The oracle change is separately assessed below.

This is a stronger fixture identity for the accepted P2Q classifier, not a relaxation of assertions. Fresh package transport/request tests retain negative controls for ordinary prose TypeErrors, decode/query errors, HTTP 4xx and typed basis errors, plus nested known transport identities. In particular ordinary failure prose does not become permission to fall back to the source. No product classifier was edited for this integration.

## 4. Q89i independent oracle

`lab/verify/SQL01/routes-round2.test.ts:32` derives assertion/retirement visibility from the generated event model. Lines 102–106 independently clear **all three** future retirement fields: `retracted_at`, `retracted_position`, `retract_tx_id`, when the retirement lies beyond either requested position or requested record-time cut. It preserves the assertion and every other row field, then compares complete canonical rows.

There is no import of product `snapshotRows`, `maskSnapshotResult`, `visibleAt` or other product visibility/mask code into the expectation. The accepted fixture still imports the column-name list to construct blank rows and imports product code to submit/query the system under test. The new masking algorithm and visibility expectations do not call product code. This preserves algorithmic independence; it does not claim independent discovery of the wire schema. Same-time events, replacements, card-many/valid-time edits, all basis shapes, forced-source reads, purge and reopen are exercised. Fresh evidence contains 77,616 digest observations plus the generated histories and zero mismatches.

## 5. The five expected live skips

A parsed JSON set comparison with `7a27b149` found **exactly five additions, no removals, no changes to any other lane's skip set**, and qlever count 21 → 26. The larger textual diff is Unicode escaping/reformatting.

All five are in `packages/qlever/test/broker-qlever.test.ts`, gated by `QLEVER_INTEGRATION`, and all five ran fresh:

1. Asynchronous publication, RYOW at each returned position, convergence.
2. Recovery from a backwards replica marker.
3. Unpublished-frame replay, epoch fencing and resend no-op.
4. Zero-downtime reset replayed past B between executor requests is refused.
5. One-request `dependencyState` with the publication marker.

No offline failure was converted into an expected live skip. The independent live result is 5 passed, zero skipped.

## 6. Q89b on all read routes

`sqlite-worker.ts:157` rejects a present `recordedAt` **before** the position-retirement query and availability flag. `log.ts:153` maps the worker sentinel to `H1BasisUnsupported extends ReadError`, with reason `h1-record-time-unsupported`; `HostLog.pull` forwards the field. `HostBroker.pullAt` delegates this basis unchanged. Numeric-only compatibility is retained.

The actual SQLite H1 driver in `packages/qlever/test/h1-route-equivalence.test.ts` runs the public testkit `/route` harness. It forces H1/source routes through historical bases and retention events and requires nonempty T/TP refusal observations. The worker supplies the typed record-time refusal; the harness does not fabricate an empty eligible answer.

Additional reviewer coverage uses independently authored 40 assertions / 10 retirements, exact full-row expectations, and repeats T/TP requests before/after actual purge. It tests all four worker connections, `recordedAt:0`, empty selection and the sweep delegation; every direct record-time H1 request rejects typed. `getByEntity`, `getByEntities`, entity/attribute `query`, scope-wide `query` and empty batch inputs never call H1 for record-time cuts; nonempty calls execute the real persisted-source route and return all 40 snapshot rows with all three later retirement fields set to null. Current position reads return 30, raw history retains 40 with ten retirement tuples, and `getById` current visibility is checked.

`BrokerStorageAdapter.ts:350` explicitly bypasses H1 for raw history or any record-time basis. `dependencyState`, Datalog and native SPARQL read the replica under their own temporal predicates/basis gates; none routes to position-retired H1. Their existing read-surface/basis/error controls ran in the package/P2Q suite. H1 raw future-position `eligible:false` remains the preexisting utility behavior documented by INT-Q; this review does not claim closure of the broader Q89c future-position obligation.

## 7. Pins

Independent recursive scan of all acceptance JSON path/hash records and keyed hash maps found **243 existing pinned paths**, matching the builder's count. Following pinned checksum manifests adds no unenumerated changed path. Every pin was compared at base `7a27b149` and reviewed HEAD; **zero pinned paths move**, so the required old/new SHA-256 change list is empty. `lab/acceptance/` is unchanged. The fresh contract regeneration also passed byte equality. The contract builder retains sole authority to repin/bump 0.3.14.

Full paths, expected pins, base/head SHA-256 and originating acceptance files are in durable `output/pins.json`. Review source `audit.py` retains the enumeration and both-parent diff commands. No acceptance file was edited.

## Evidence, first failures and limits

[SHA256SUMS](SHA256SUMS), [EVIDENCE.json](EVIDENCE.json) and [RUNS.json](RUNS.json) index **1,275 files / 807,532,111 bytes** at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VINTQ/`. This includes raw logs, oversized source-bound receipts, pin/parent/fixture audits, generated SQL01 histories/observations, and this worktree's test databases. Every copied file was independently rehashed at the destination and its original reread; originals remain. Symlink aliases are not copied as evidence files. No bulky raw evidence or downloaded package implementation is committed.

First attempts remain: a pnpm build command parsed `--store-dir` as a script argument and exited without building (not counted as validation); corrected `--config.store-dir=…` built all three required packages. An initial reviewer probe could not resolve the qlever-local `better-sqlite3` dependency from the root; resolution was corrected through that package's manifest, then all final probes passed. Neither is a product failure. Concurrent SQL01 reads emitted MaxListeners warnings; exact results, cleanup completion and semantic checks passed, without suppressing the warnings.

Pinned pnpm 10.11.0 was installed into reviewer-local tools and used frozen/offline with the required owned store. Its downloaded archive/hash and install log are retained. All gates, builds and process-stop trials used `lab/bin/heavy.mjs`, with fresh admission disk checks above 5 GiB. No other engine or forbidden port was used. Test-created database originals and deliberately untracked `lab/verify/SQL01/evidence/` remain preserved.

Not done: fresh full root `pnpm check`, fresh full G0 lanes or packing rerun, performance/target-scale qualification, physical power loss, erasure, tenant isolation, PostgreSQL/FoundationDB qualification, deployment or release. Builder G0/packing receipts were checked as historical integration evidence, not relabeled as reviewer execution. This verdict does not enable the broker by default or resolve the preexisting WAL-retention policy gap.

## PASS / verdict audit (preamble 9a)

Every place this review turns observations into a result is listed here:

| Place | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `run.mjs` | Records actual command output hash and exit/signal; emits no semantic PASS. | UUID create-only run/log, current start/end; before/after equality. | Reviewed HEAD and file hashes, runner hash, command, Node, disk and endpoint; final probes also hash their own exact sources/config. Earlier runner bytes remain identified by each receipt's runner hash; no past receipt was rewritten. |
| `audit.py` | Reads actual Git blobs for both parents/pins; compares builder receipt/log bytes to their recorded SHA-256; does not equate exit zero with acceptance. | Recomputed in this review from specified immutable commits and present files. | Saved parent diffs, exact pin paths/base/head hashes, receipt paths and source-difference lists. |
| `h1-read-routes.test.ts` | Full exact row equality, explicit route invocation counts, typed H1 refusal, history/current witnesses. | Fresh UUID database, actual writes and purge, repeated same basis. | Final probe receipt hashes test/config/current product; exact authored rows and returned commit positions. |
| `sqlite-ack.test.ts` | Real append/publication/ACK order, raw SQLite group member counts, timer-free lone commit, alias refusal, actual SQLite abort/fail-stop/recovery. | Fresh UUID streams and real worker writes; no reused result files. | Final probe receipt plus test source; on-disk SQL reads and exact operation/row witnesses. No physical-sync verdict. |
| Existing package/P2Q/testkit/SQL01 assertions and `kill.mjs` | Exact expected rows, types, errors, route coverage, duplicate/CAS/feed behavior, independent event-derived expectations; process-stop checker compares parent-observed ACKs against actual recovered rows/receipts/claims/feed. | Fresh executions and UUID fixtures/attempt prefix; first failures retained. | Current tracked test/product bytes in every run, exact commands, raw logs, generated event/observation artifacts and source identity. |
| Existing contract `--verify` | Checks regenerated content against committed artifacts and performs a second byte-identical regeneration. | Fresh read-only verification. | Current contract source and every pinned file, all in the run's input hashes. |
| `seal.py`, SHA256SUMS, RUNS/EVIDENCE indexes | Rehashes destination and rereads original, verifies every log digest and current input bytes; emits byte-preservation/execution observations only. | Current copies of completed runs, preserved originals. | Durable relative paths, per-file SHA-256 and size, receipt/log identities; no engine verdict inferred. |
| This `VERIFY.md` ACCEPT | Seven requested checks assessed above; all applicable fresh results and exclusions reconciled; no blocking defect found. | Based on the fresh reviewer runs, with historical evidence explicitly separated. | Exact reviewed integration HEAD, source/diff/pin audits, sealed evidence, retained limitations. Scope is default-off integration readiness only. |
