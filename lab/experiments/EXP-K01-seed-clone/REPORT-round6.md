# EXP-K01 round 6 — complete observations before verdicts

Builder CX-K01-R2, branch `exp/K01-seed-clone`. Implementation `d4298c10`. North star: correct seed reuse and dependable evidence supporting
P1-P5, under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`. Offline implementation; independent review and
live qualification remain required.

Read CX-VK01's [VERIFY-round4.md](evidence/round6/reviewer-input/VERIFY-round4.md) at reviewer head
`910ce841dba05a75a6c107151f1885bb0199ac29`, read-only. Copied its 13 controls. Original source, observations and provenance
are under [reviewer-input](evidence/round6/reviewer-input/); main checkout and reviewer files were not edited.

## Structural change

`lab/bin/observation.ts` defines complete and failed observations with kind, exact input binding, unique acquisition
identity and timestamp. `observe`/`observeAsync` combine acquisition and parser validation. `complete` is the only unwrap;
a failed result throws with its original observation attached. Parser exceptions and missing parser values remain failed.
Process observations require exit 0, explicit null signal, no spawn error, and present stdout/stderr strings. Helper
producers additionally require empty stderr, so diagnostics cannot disappear behind successful stdout. The CLI retains
failed observation details rather than converting them to empty values.

The same boundary is used by Docker command acquisition, container/volume inspect, host/VM/volume disk readings, file
and canonical hashes, SQL row acquisition, scalar conversion, readiness/log reads, fingerprint components and stop proof.
Adapters expose validated values by unwrapping complete observations; they cannot expose a failed value as successful
null/empty data. Container/volume absence is a separate, successful empty enumeration; a failed inspect/list never means
absent. The legacy `docker(..., {allowFail:true})` suppression no longer suppresses failure. Operations that legitimately
remove-if-present first obtain complete presence evidence, avoiding an erroneous failed removal of an already absent volume.

This is a local producer/consumer invariant, not a signature scheme. It cannot prove a producer that lies with exit 0
and no diagnostics honest, or establish native database semantics from mocked queries. Read-only stopped mounts, exact
source/config/manifest bindings, current lifecycle tokens and independent live/oracle gates remain necessary.

## Reported failures and adjacent paths

* **R4-F1:** tree enumeration, stat, hash and sorting are separate checked commands. Neither the stat/hash trees nor
  completion markers are emitted until all acquisition succeeds. Nonzero enumeration or correlated stat/hash errors
  cannot produce matching partial C1 trees. `parseListing` requires exactly one ordered stat/sha/end frame and rejects
  missing/duplicated sections, malformed metadata, duplicate entries and trailing bytes. Successful helper stderr is
  checked rather than discarded. The offline log reader and block enumeration likewise use checked intermediate files;
  there are no unchecked producer pipelines. Tool-capability probes use the same checked-command discipline.
* **R4-F2:** single-cut cleanup retains separate removal and absence observations, with absence proven by successful
  explicit volume listing. `snapshotRemoved:true` needs both complete removal and complete absence. Failed or unknown
  cleanup is retained and cannot report removal; if there is no earlier failure it fails the diagnostic. An earlier copy
  failure stays primary, with cleanup recorded alongside it. Cleanup only runs after this invocation created the snapshot.
  Golden/clone failed-copy cleanup also retains cleanup failure rather than replacing the first error. The runner
  aggregates current-resource cleanup failures and cannot exit successfully after failed cleanup.
* **R4-F3:** the shared admission helper validates VM usage, VM/pool capacities, request forecasts, reservation forecasts
  and running caps before arithmetic; missing, nonfinite, negative and unsafe values refuse. The actual `df` and `du`
  parsers validate complete output and consistent byte counts at acquisition. Host filesystem readings are validated too.
  Explicit uncapped external memory is conservatively charged as a whole VM; it is not a default for a failed read.

Additional class fixes: SQL acquisition validates row arrays and required numeric scalars instead of replacing missing
values by null/zero; missing gauges refuse. Fingerprint components retain failed observations and overall fingerprint
failure always prevents child PASS. Missing C6 live-row evidence or C7 polls cannot become empty matching evidence.
Operator-specific absent EXPLAIN statistics are explicit null, distinct from observed zero. Direct diagnostic commands
exit unsuccessfully for ok:false/settled:false/FAIL, and log-only commands check acquisition completion. Stop proof requires
a current boolean OOM observation as well as log/process/identity/time evidence. Present malformed owner files cannot mean
unowned/unverified; absent owner files remain explicit absence. Existing Q83e body/frontier/index checks remain intact.

## Updated PASS audit — performed before implementation commit

The content/freshness/binding inventory below includes admission, diagnostics and cleanup, not just literal PASS fields.
All runtime success paths consume validated complete observations or refuse; retained failures never grant admission.

| Success boundary | Content | Freshness | Binding |
| --- | --- | --- | --- |
| Command/read/hash unwrap | Parser validates bytes/type; process status/signal/error/streams required | Unique acquisition identity/time; actual read in this call | Kind plus exact command, path or SQL/parameters |
| Engine/child health and log reads | HTTP status/log syntax only after complete process acquisition | Current calls; failed reads remain failed | Named container/route/start timestamp |
| Host floor and shared pool admission | Valid capacities, byte usage, forecasts and bounded sums | Live statfs/df plus current reservations/inspects | Host path, pinned image, slot request and ledger |
| Tool capability result | Checked producer commands and explicit expected outputs | New helper invocation | Pinned image and named required tools; diagnostic only |
| Stop proof | Complete log read, lines, exit 143, boolean non-OOM, under 10 s | Same current start before/after; STOPPING revoked first | Container ID/start and owner generation/operation token |
| Provisional settle | Two cuts, coverage/upload progress, F<=M, T unchanged, zero lag/jobs | Three 5 s stable listing/trie/T/M readings from current gauges | Intended new block per phase; remains qualified:false |
| Stopped-tail qualification | Complete LocalLog framing and recursive accepted bodies, exact end M | After current clean stop; checked helper commands | F/M/T, decoded intended cut index, payload/tail hashes |
| Offline listing/tails | Empty .tmp, complete two tails and exact block listing | Stopped pre-copy and stopped reference checks | Current checkpoint snapshot and replay M |
| Tree/C1 pre-start copy | Complete regular-file set/stat/hash acquisition; exact canonical tree bytes | Checked helper over stopped source and just-copied destination | Path/size/mode/uid/gid/content hash; golden/copy UUID |
| Golden publication | Qualified tails, copy equality, complete fingerprint/position, clean reference stop and timer | Reference runs after copy, fresh end snapshot then stopped proof | Source image/config/key/manifest bytes/creation UUID and resume M |
| Golden load | Re-decode both retained tails, snapshot/cut match, key/manifest/UUID checks | Current manifest and successful current volume inspect | Exact record inputs, volume generation and checkpoint |
| C1 re-verification | Golden/copy/expected/observed SHA-256 all present/equal; no saved-bit shortcut | Current owner and current loaded golden | Immutable pre-start copy identity and full certificate |
| C2/start checks | Complete health/inspect/logs, resume M, live rows/lag/jobs/T/M/trie/listing | Three fresh polls; same final start; repeated after fingerprint | Current container/start and expected settled checkpoint |
| C3 | Complete tx catalog SQL rows and required scalars; exact comparison | Current queries | Reference and clone cut/manifest |
| C4/C5 | Required position/count/history observations; exact scope equality | Current queries, no missing-row numeric defaults | Seed scope, manifest position and reference fingerprint |
| C6 | Present catalog digests and live rows; empty fallback removed | Current safely enumerated block/trie/live queries | Exact canonical queried rows and reference snapshot |
| C7 | Present three zero job polls | Current readings 5 s apart | Current node; final start check confirms T/M/layout |
| C8 | Complete pulls/plan; exact hashes, explicit absent optional stats | Current fixed-sample pulls/EXPLAIN; final start check | Manifest basis, deterministic samples and authored probe |
| Fingerprint/child overall verdict | Every required component complete, C1-C8 true and obs.ok true | Current producer call; failures retained per component | Current container, scope, golden and owner; producer is trusted local code |
| Parent owner publication | Complete child process/consistent boolean gates, exact record/receipt hash | Running/start rechecked; pending attempt compared while locked | Holder/generation/lifecycle/attempt ID/full immutable certificate |
| Driver clone admission | Current manifest, C1 internal hashes, certificate and verified start | Current owner; non-running lifecycle refuses | Exact manifest/clone certificate; no standalone historical PASS |
| Seed input/reuse helpers | Required generator/build hashes and manifest position | Current local files/build listing and current position check | Exact executing seed inputs and manifest scope |
| Listing diff/storageImmutable | No removed files or changed non-log metadata/content | Newly acquired stopped listing | Selected golden/reference; diagnostic additions do not imply C1 |
| Single-cut diagnostic copy/clone | Two complete matching tree observations | Before any diagnostic start | Sacrificial snapshot and current source; never a screening golden |
| Single-cut before/write/after/plan flag | Complete before/after fingerprints and write result; plan hashes present | Ordered current diagnostic calls | Same manifest/probe inputs; changed-plan boolean is diagnostic only |
| Single-cut snapshotRemoved | Complete removal and successful empty volume listing | Finally after this creation; both attempts retained | Exact current snapshot volume; first failure retained |
| Down/release | Successful physical commands and complete absence proof | Revoked before physical work; fresh post-removal list | Current owner generation/holder/time/operation token under lock |
| Golden removal | Managed label/current UUID/no mounts, complete removal/absence | Current reads | Exact invocation creation receipt/UUID; recreation invalidates old record |
| Runner stop/cleanup outcomes | Semantic stop plus process completion; cleanup aggregates failed commands | New attempt paths/holder; no directory discovery | Exact invocation, current owner and creation receipt; failure never becomes PASS |

## Catch/default/optional-result audit

Read every searched site with its containing function. [fallback-search.json](evidence/round6/fallback-search.json)
retains the exact line inventory; adjacent `EXP-K01-R6` comments explain retained patterns. Dispositions:

| Sites | Disposition and why they cannot replace failed observations |
| --- | --- |
| `observation.ts` catch/parse/unwrap | Sole complete/failed conversion; catches retain failure, complete throws; parser cannot return undefined |
| `lib.mjs` Docker/stats/inspect/volume/disk/hash | Failed-to-null/empty suppression removed; exact successful absence enumeration is separate; parsers validate fields |
| `lib.mjs` admission | Missing forecast-as-zero removed; invalid cap/usage/sum refuses; explicit uncapped state charges whole VM |
| `lib.mjs` JSON/owner | Only actual ENOENT permits an explicit optional absent file; malformed bytes and other errors fail |
| `lib.mjs` config guards | Parse failures are refusals; required paths exist; standalone read-only boolean is conservative and not used alone to certify config |
| `lib.mjs` locks/pids | EEXIST/ENOENT model atomic concurrency/absence; unknown age stays fresh/locked; EPERM stays alive; unknown process errors throw |
| `lib.mjs` git/source metadata | Canonical head/diff/file reads required; optional stash metadata cannot supply canonical identity; nullable deleted/non-file hashes denote explicit states |
| Engine lifecycle and certificate guards | Optional fields refuse invalid state or describe legitimate legacy metadata; catches reconcile then rethrow, or publish ERROR, never historical PASS |
| Engine offline/tail decoder | Caught decode failure retains ok:false; missing proof/index/frontier/generation refuses; no empty tail can qualify |
| Engine copy/golden/one-cut cleanup | Complete helper required; failures remain failed; cleanup separately recorded; no catch makes success or erases the original failure |
| Engine publication receipt-write fallback | Failure to write an error receipt is error metadata only; current admission still ERROR or revoked, not PASS |
| SQL/fingerprint/start checker | Missing scalars/gauges fail; aggregate caught failures retain failed observations and prevent overall PASS; nullable resume/status only refuse |
| Hash/plan/compare helpers | Missing C6/C7 evidence refuses; nullable operator-specific EXPLAIN stats are explicit schema absence, not fabricated zero; unbounded valid-time endpoints are legitimate nulls |
| Bulk/owner admission helpers | Display capture/history defaults do not qualify a seed; no owner is explicitly unverified; unknown present volume-content type refuses; missing clone certificate refuses |
| Owner state and log codec | Undefined transition means no mutation; missing schema fields/frontiers immediately refuse; no fallback manufactures a proof |
| Runner optional operations | Only explicit admission retry/negative T2/cleanup aggregation permit retained failed command results; cleanup failure cannot leave overall success; config/display defaults are not observations |
| CLI status/config formatting | Labels/history/dashes/env/profile defaults select configuration or presentation only; all underlying current reads still must complete |

## Gates and evidence

**262/262 tests PASS**, zero skips/TODOs/cancellations. All suite processes exited 0 without signal/spawn error.

| Gate | Result |
| --- | --- |
| Original focused suites | 41/41 |
| Original reviewer regressions | 21/21 |
| Round-3 boundaries | 23/23 |
| Round-2 freshness | 14/14 |
| Round-4 controls | 35/35 |
| Prior Q83e reviewer suite | 36/36 |
| Round-5 controls | 39/39 |
| Copied round-4 reviewer controls | 13/13 |
| Round-6 observation boundary controls | 40/40 |
| Lab benchmark TypeScript | PASS |
| Authored JavaScript/TypeScript syntax and committed source whitespace | PASS |

Final execution head: `d4298c103025c6307c08c8df39dca20658a640d4`. Every executed source hash matches its committed blob; the run began after
the implementation commit. Host free disk at admission: 15,996,047,360 bytes, above the 5 GiB floor. The 40 new controls
cover acquisition exceptions/missing values, failed/partial process streams, invalid hashes/scalars/proofs, resource
inputs, df framing, listing framing, real facade failure propagation through local CLI shims and sort failures.

Run with host free space above 5 GiB:

```sh
node lab/bin/heavy.mjs --label CX-K01-R6-offline -- node lab/verify/K01/run-round6.mjs
```

Raw stdout/stderr, case observations, source hashes, commands/exits/signals and disk readings are in
[evidence/round6](evidence/round6/). Development receipts remain separate. The first run's test adapter copied a context
that the real-lock race later mutates; that adapter was corrected to preserve the original context. No race assertion
was removed. Its leftover fixture was retained under development evidence before removing local scratch.

The 13 copied assertions remain active. Its cleanup I/O shim now models the explicit volume-list command instead of the
old failed-inspect protocol. Earlier extraction tests use the actual observation primitives with native-shaped completed
mock signal fields, retaining all explicit failure/signal/error variants. Positive stop fixtures now supply OOMKilled:false.
Real command-facade tests use isolated fake CLI executables and the actual process wrapper, not the extraction adapter.
These are local shims, not Docker daemon or engine activity. Historical case files are restored; checksums cover artifacts.

## Limits

No real Docker/engine command, daemon/service request, engine slot, volume creation/removal, resident change, install,
main-checkout write, merge or push. Only the heavy-test semaphore was shared. No volume was made or retained. No full
monorepo check ran. This round does not certify live 500-subject golden/clone, T1-T7, C1-C8, C10/E1/PAIR-0, timing or scale.
Native image shell/tool behavior and Kotlin/SQL semantics remain to be independently qualified in an admitted live window.
Strict helper diagnostics and numeric/inspect parsers may conservatively refuse previously tolerated unsupported output;
that is explicit failure, not a performance or compatibility claim. No policy question is outstanding; independent review
and the separately admitted live reference/clone run remain necessary.
