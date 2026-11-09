# CX-VDF01 — EXP-DF01 round 4

**Verdict: ACCEPT-OFFLINE.** No blocking finding in the assigned R47-c journal-filter fix. Reviewed
`302a7a63ca3452052bce5576cea5377c481abbb4` (code commit `1959eed4`). The new predicate excludes typed journal
facts using their own assertion transaction ID, while retaining all facts for positions and transaction IDs. Independent
execution confirmed the shared projection on 11 fixtures across broker, P2X and Datomic. This is not live qualification or an
approval of pending ruling Q107c.

## Findings and coverage

No FIX-FIRST/REJECT finding remains. The runtime results below are from **round4/attempt-3**, not the builder's receipts.

| Counterexample | Observed result |
| --- | --- |
| Ordinary user sets `entityType: "_Transaction"` | Real core refuses `assert`, a mixed `assertBatch`, and `transact`, through both KV and SQLite/storage-adapter layers. Failed batches leave neither the forbidden fact nor their ordinary sibling. The same `_tx/...` entity ID succeeds with type `Label`. |
| Mixed application facts and typed journal facts | Only the explicitly listed application IDs survive. `_tx/custom` subjects, `_txNote` attributes, and an ordinary-type row with a journal-looking subject/attribute survive. |
| `_Transaction` row whose subject is a different transaction ID | Retained by all three feeds. Type alone does not classify a journal row. This is an adversarial raw-storage fixture; ordinary core writes cannot create this reserved type. |
| Journal member at an earlier position | A journal-only member at position 3 contributes both position 3 and tx ID 3 inside the commit ending at 4. Its journal row is absent from `changes`; the application fact at 4 remains. Datomic uses the row's explicit assertion ID rather than the physical commit's annotation ID. |
| Missing row type in the current schema | Retained, even if subject and attribute look like journal data. All three feeds agree. |
| Facts predating `:f/entity-type` | Created a real mem database with that schema attribute omitted, committed untyped rows, installed the full schema, then replayed the earlier physical t. No exception; both the untyped header and application row remain changes. This does **not** prove exclusion of historical journals without type metadata. |
| Null assertion transaction ID | A typed row with null `tx_id` remains a change; the current journal header still supplies the commit's tx ID. |
| Journal-only commit | Empty changes with position 4 and tx ID 4 retained. |
| Retract-only application commit | Exactly one application retraction, preserving position/tx ID 4 from the fresh journal header. The old assertion's tx ID is not incorrectly substituted for the current commit's ID. |
| Retraction of an old journal assertion | No application change. The predicate uses the old assertion's transaction ID, not the retraction's transaction ID. |
| Actual v1 and RT01 v2 journal encoders | Loaded and executed both real `metadataInputs` functions. The v1 journal includes `:_tx/instant`; RT01 v2 omits it and produces `v:2` change JSON. Both sets of journal rows are excluded identically while the application change survives. |

Core's premise is enforced at `packages/core/src/store/systemNamespace.ts:55`, with write guards in
`KvTriplesLive.ts:436` and `TriplesLive.ts:290` at the reviewed candidate. `:_tx/` attributes are also reserved at ordinary core
writes. The builder's phrase “user `:_tx/change` on an Order” therefore describes a **raw adapter** input, not an accepted public
write. Our raw fixtures intentionally exercise that input without claiming public reachability.

The reviewed predicate is `packages/datomic/gateway/src/triplex/gateway/feed.clj:31`; filtering occurs at line 51, and positions
and tx IDs are derived from all facts at lines 55–59. The own-transaction checks were exercised on actual persisted peer entities,
not a reimplementation of `journal-fact?`.

## What actually ran

| Run | Result and binding |
| --- | --- |
| Core reservation | 2/2 Vitest tests, zero failures; both real core implementations, all three public write forms and rollback/readback controls. These source bytes equal candidate `302a7a63`. |
| Broker + P2X shared fixture | 1/1 Vitest test covering all 11 scenarios, zero failures. Individual scenario outputs, actual carrier parameters and query traces retained. |
| Datomic shared fixture | Real Datomic 1.0.7745 `datomic:mem://`, actual schema, `storage/commit!`, `d/tx-range` and `feed/log-page`: 1 test / **88 assertions**, zero failures/errors. Exact IDs, change tuples, positions, tx IDs, annotation stamp and repeated-page equality for every scenario. |
| Independent comparison | `index-round4.mjs` rechecks every Datomic common change tuple against the explicit expected fixture and the executed TypeScript projections; verifies complete scenario counts, output hashes and source/input identities. |

Broker used the actual SQL01 `HostLog` SQLite worker, `encodeCommitGroup`, durable watermark and `LogFeed.poll`, pinned to
`8c96ea90e6d51dd727bcaf41d23d8f83e4da8e87`. P2X used the actual `makeXtdbStorageAdapter` subject-stamp writer and
`makeXtdbCommitFeed(...).poll(..., {exact:true})`, pinned to `fb6681a4c5b54bfef63ad5ee670047946a24617c`. Its SQL client was an
offline fake: it records the writer's actual generated `tx_feed` insert and metadata, then supplies those bytes to the actual
feed decoder. It does **not** manufacture an expected filtered carrier. XTDB's execution of the SQL is not claimed.

Comparison is semantic, not byte equality of different public feed formats: op/entity/attribute/valid-time range and logical
position must match exactly after order normalization. Broker and Datomic use fixture positions directly; P2X allocates its
native stamped positions with consecutive ordinals, mapped back by the fixture's declared ordinal-to-logical-position bijection.
All member ordinals must remain present. P2X's public feed does not expose tx IDs; its actual writer-generated carrier's `tx_ids`
are checked instead. Datomic's assertion IDs are separately checked exactly. No claim is made here about subjects or other
nonshared wire fields.

RT01 `7ee171ea294577b3f5d6aca027b311f27465b802` is reachable in Git but its encoder is not in candidate core. The v2 scenario is
a forward-compatibility probe using the real branch encoder, not a claim that candidate ordinary writes emit v2.

## First failures and reproduction

- `attempt-1`: core 2/2 passed; feed suite could not load snapshot core's `ulidx` dependency, so no feed test ran. Fixed only
  reviewer config resolution to the already installed dependency. No installation or production edit.
- `attempt-2`: core and all 11 TypeScript fixtures passed. Datomic's first fixture passed its eight assertions; the probe then
  called `unsubscribe!` despite using `waitMs:0` and never subscribing. Removed only that invalid reviewer cleanup call.
- `attempt-3`: all stages passed. Earlier attempts, their exact probe preimages, input identities and failed outputs remain.
- Initial evidence index: the checksum check found two mismatches because the index script and its live output log changed
  during indexing. Every tested source, fixture and result file matched. `SHA256SUMS-initial`, `checksum-initial.json` and the
  byte-verified `index-initial.mjs` preserve the first failure. The stable index revalidates the complete successful attempt,
  requires an existing summary to match exactly, regenerates the manifest after writes stop, then rereads every indexed byte.
  No semantic test or test output was changed to resolve this indexing failure.

Reproduce from this worktree with a **new** attempt name:

```sh
node lab/bin/heavy.mjs --poll-ms 100 --label CX-VDF01-r4-reproduce -- node lab/verify/DF01/run-round4.mjs attempt-4
```

`round4/sources/` contains immutable Git snapshots; `source-bindings.json` records all 297 paths, Git commits/blobs and SHA256
values, plus 129 reviewed core/SQL/SQLite source hashes. The runner binds these, the probe/config/runner preimages, lockfile,
alias configuration, vendor jars, JVM and native addon before and after execution. Each attempt refuses an existing directory.
`slot:null` and the real parent heavy grant are recorded. Broker's native dependency is an owned, ignored symlink to the existing
worktree installation; the runner recreates it if absent. Source snapshots contain no downloaded dependency tree.

Tests and fingerprint jobs ran through `heavy.mjs`. A period below 5 GiB delayed admission; execution began after space recovered,
and each runner rechecked the floor under its grant. No files were deleted to make room. No Docker command, engine lifecycle
operation, exclusive slot, dependency install, subagent, merge or push occurred.

## PASS / verdict / receipt audit (rule 9a)

| Place interpreting observations | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `prepare-round4.mjs` source bindings | Copies bytes directly from the named Git blobs; candidate core/SQL/SQLite bytes must equal local inputs | Newly created snapshot directory; refuses an existing source directory | Exact commit, source path, blob and SHA256; no semantic PASS |
| `round4-core.test.ts` assertions | Error reason, six rejected writes, empty rollback/readback and allowed-type positive controls | New KV/SQLite layers in each fresh Vitest process | Candidate-equivalent core source and actual public write methods |
| `round4-feeds.test.ts` assertions and fixture | Explicit application ID lists; real encoded journals; actual broker and P2X projections, preserved positions and carrier tx IDs checked | New process, exclusively written fixture file and new owned SQLite directory per attempt | Pinned source snapshots, generated shared rows, actual writer carrier, actual decoder and recorded query trace; fake XTDB execution disclosed |
| `round4_verify.clj` assertions and exit | Eight content assertions per scenario; exact ID sets/tuples, positions, tx IDs, stamp, repeat read; all failures/errors cause nonzero exit | New process and freshly created mem scopes; no prior attempt's database/page is reused | Same freshly serialized fixture, actual peer schema/commit/log route and saved physical t, real legacy as-of cut; scope deletion invoked in finally; no server resources allocated |
| `run-round4.mjs` status/result | Actual stage codes/errors/output digests; delegates content to test assertions; hashes must remain unchanged | Exclusive attempt directory; copies probe preimages before execution; all first failures retained | Named revisions and input bytes, reviewer head, vendor/runtime identity, actual heavy grant, disk floor and explicit null slot |
| `index-round4.mjs` summary/checksums | Requires complete 2/2 + 1/1 + 88-assertion zero-failure run; independently compares all 11 outputs to fixture, IDs/positions/tx IDs/stamp and cross-feed tuples; rereads Git blobs and output digests | Named attempt-3 timestamps and fresh complete outputs; existing summary must match exactly | Exact source/core/runtime/probe/input hashes and copied outputs; never adopts builder G0 as fresh evidence |
| `seal-round4.mjs` first-index failure record | Requires exactly the script/log checksum mismatches and verifies the retained initial indexer's bytes against the original manifest | New refused-existing retention files, original manifest checked before any further edits | Exact old/new SHA256 values; no source/result mismatch and no semantic PASS inferred from this failed check |
| This report's verdict | Limited to the stored-type/own-assertion-ID predicate and shared projection actually exercised | Independent round-4 execution | Candidate/code commits explicitly named; legacy, v2 and offline limits explicit |

## Pins, limits and open questions

Only new `lab/verify/DF01/` tools/results are changed on the reviewer branch. No production file or `lab/acceptance/` file was
edited and no existing pinned path's hash moved. Candidate source changes, for the contract builder's reference:

| Path | Before (`dcc8322d`) SHA256 | Reviewed (`302a7a63`) SHA256 |
| --- | --- | --- |
| `packages/datomic/gateway/src/triplex/gateway/feed.clj` | `e3a6b9effe6524aeb679399f368d5f3da16a74135e96b11b4fa4c0cf91d974df` | `43ca48e7ac854f7d360a59353d9922b4a37b37a675b0baebd248c6e08fab3bc1` |
| `packages/datomic/gateway/src/triplex/gateway/feed_test.clj` | `d2bcbbf2a991169bfc38da43643b6606bfd46daf1a4bc0a1fb73e19f13298b4b` | `174e33e4d54e3fe6a16efb189a8fc43d6ae986aee44252517c6a4ea5384b1a9d` |

Neither changed candidate path is directly named in acceptance pins; the contract remains unchanged. The builder's 1,279-pass
G0 and 16/16 TypeScript regression results remain builder evidence; neither broad suite was independently rerun in this scoped
review. Earlier deadline, restart and excision cases were not rerun this round.

Open policy question: Q107c remains an orchestrator ruling; exclusion or migration of historical journal rows lacking stored
type metadata needs an explicit policy if required. All three feeds retain those rows today. No live Datomic/XTDB/QLever server,
HTTP route, core-to-Datomic end-to-end transaction, load, or production acceptance was verified. The real core refusal tests and
real encoder-to-adapter fixtures are separate checks, not a claimed integrated deployment.

Evidence: `round4/summary.json`, `round4/SHA256SUMS`, `round4/source-bindings.json`, and `round4/attempt-{1,2,3}/`.
Every new file is below 1 MB and this round's evidence is below 5 MB; no bulky raw evidence is committed.
