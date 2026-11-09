# CX-VDI01: EXP-DI01 round 2

**Verdict: FIX-FIRST.** The four originally reported helper guards are fixed. One remaining untyped reference-basis refusal exists in the consumer's final row validator, covered by the requested search for remaining plain basis errors. No checkpoint advance or index corruption was observed on refusal.

Scope: F1 and the merge only, for P3 correctness under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Reviewed `c4aeb4cb` (main merge `13949e3a`, fix `80b6477e`) after merging it into `verify/DI01` in **`b040f16b16b1b40b2b54c607bcaa22d477339d0b`**. No implementation fix was made, no subagent was spawned, and no acceptance file was edited.

## Remaining finding R2-F1 — Medium: final pinned-row refusal is still plain Error

Location: **`packages/host/src/feed/DependencyIndex.ts:176-186`**, specifically the throw at line 186.

`DependencyIndex.prepare` validates reference rows after the shipped helper returns. A memory response may correctly report the requested basis while its row has a later recorded position. `memoryReferenceReader` then returns the row, and `prepare` detects the actual basis violation but throws `Error("Pinned reference reader returned invalid basis")`. It has no `_tag`, reason, requested basis or observed row coordinates. This is the same row-outside-basis condition for which the storage helper now produces the tagged refusal. Error classification therefore still depends on which reader/guard detects the violation.

Reproduction: `round2/probes.test.ts`, test **GAP: consumer prepare still emits plain Error for a future reference row, with unchanged durable state and same-page recovery**. Deliver a position-1 `pl:a/location` page; use the shipped `memoryReferenceReader` with `reportedBasis` equal to the request, but return its location row at position 2. The actual result is:

```json
{"name":"Error","message":"Pinned reference reader returned invalid basis","tag":null,"reason":null,"requested":null}
```

The test checks that checkpoint, all five dependency tables, effects and affected rows remain unchanged, including after close/reopen. Returning the row at position 1 lets the **identical page** succeed, with checkpoint 1 and the expected reach answer. Its GAP assertion deliberately passes when this defect exists. Raw content: `probes/remaining-basis-guard.json`.

Proposed fix: make this final reference-basis validator produce a stable tagged refusal with requested/observed coordinates, consistent with the helpers. Place any shared error contract at a permitted public package boundary; the host must not import a lab helper. Keep the rejection before the transaction and preserve backend error identity. Extend the regression to require the tagged error through the consumer when response metadata matches but actual row bytes violate the cut. No silent continuation at a newer position should be introduced.

## What the fix does establish

All four former plain-error paths in `lab/bench/lib/di01-refs.ts` now construct `BasisNotAvailable` using `Data.TaggedError`: memory reported-basis mismatch, storage pre-read head guard, storage post-read head guard and storage row guard. Fresh independent probes assert the actual class, `_tag`, `reason`, requested `(position, validAt)`, and known `availableHead` or `reportedBasis` for each path. All four passed. `detail` records the rejected row's coordinates. `retentionFloor` is absent because these interfaces report no floor; no floor was invented.

Both the shipped memory and storage readers preserve the exact object identity of a backend-provided typed expiration error. There is no catch in either reader or `DependencyIndex.consume` that retries from a later position. `consume` awaits preparation before entering `applyDerived`; the existing abort boundary is unchanged.

The five added `di01-refusal.test.ts` tests pass. Their snapshots include checkpoint, dependency tables, effects and affected rows. The storage fixture starts with non-empty state and exercises guard refusal and backend expiration, reopen, then identical-page retry. The memory fixture similarly refuses, reopens unchanged and retries its page. These are controlled source seams, not actual backend retention compaction.

The **unchanged original reviewer GAP test now fails as expected**, running only that test. Its sole failure is the old message assertion at `runtime.test.ts:53`: actual `BasisNotAvailable: head-moved (requested position 1)` versus old `BasisNotAvailable`. It does not fail from setup, import, process or database errors. Separate probes confirm that both original helper paths now return the tagged class and correct fields, so this is a positive control for the helper fix rather than a regression. See `original-gap.log` and `probes/four-guards.json`.

Static search also found ordinary input/unsupported-profile errors (invalid configured basis/release, fixed-valid-time restriction, oversized coordinates and invalid obligation input). Those are distinct from the reproduced response-basis refusal above. Oracle/protocol assertion errors were not treated as backend availability refusals.

## Merge verification

The two conflict files have identical actual Git blob SHA256 at `aa34513a`, builder merge `13949e3a`, and reviewer merged HEAD `b040f16b`:

| Path | SHA256 at all three commits |
| --- | --- |
| `packages/host/src/feed/ConsumerStore.ts` | `22ef8081a975b3be504b694bf1b86ee2979c003c40436f48250d87483c7dc118` |
| `packages/host/src/feed/index.ts` | `944a7073f9da7a0016a038bd4c49577dfd2ae34a82754b31555d02f8fe4e85fd` |

`git diff aa34513a 13949e3a -- packages lab/bench lab/scenarios` is empty. Across round 2, the only changed code paths in those trees are `lab/bench/lib/di01-refs.ts` and new `lab/bench/di01-refusal.test.ts`; lockfile unchanged. The helper diff adds tagged errors and captures the existing second head read; remaining changes are formatting. No affected-set, index-update, checkpoint, boundary or replay algorithm changed. `merge-proof.json` and the reproducible `merge-proof-recipe.json` record these checks.

## Fresh gates on committed merged tree

All gates name committed HEAD `b040f16b`, use Node 22.23.2, run through `heavy.mjs`, and use no engine slot. Each stage checks the 5 GiB disk floor; source hashes and HEAD are checked before/after the serial gate pipeline.

| Gate | Observed result |
| --- | --- |
| Contract `--verify`, separate process and log | Exit 0, byte-identical regeneration |
| DI01 suites | **16/16 passed**, including all five new refusal tests |
| Accepted lab PACK gate | **PASS**, 12 packages, 25 isolated imports, fresh offline clean consumer; attempt `pack/triplex-pack-8hlTHS/` |
| Original unchanged GAP test, selected alone | Expected exit 1; exactly one assertion failure caused by the fixed error message/type behavior |
| Independent reviewer probes | Two tests' assertions passed: four-guard/identity control plus positive reproduction of remaining R2-F1 |
| Evaluator | **108/108 passed**, 0 failures, 0 skips; fresh process on committed merged HEAD; `evaluator.log` |

The DI01 suite preserves the original oracle-control assertions in a reviewer-local copy solely to redirect its hard-coded raw evidence destination; GS output is likewise directed to reviewer evidence. It does not write into the builder's evidence tree. PACK seeds only registry cache bytes from the accepted `CX-VA01-040/npm-cache`, forces offline npm, deletes/rebuilds dist and creates a new consumer. No old installed consumer was reused. Raw commands, timestamps, exits and log hashes are in `steps.json`; source preimages and their hashes are in `source/` and `binding.json`.

## Rule 9a audit

| Observation or verdict site in this round | Content | Freshness and binding |
| --- | --- | --- |
| `round2/probes.test.ts` guard/identity test | Actual refusal class, tag, reason, coordinates and backend object identity checked against explicit input | New fixture calls against shipped helper bytes; no source mutation; committed HEAD and source preimages in pipeline binding |
| Remaining-guard GAP test | Actual untyped error fields, complete before/reopened snapshots and same-page retry/reach checked | New owned SQLite file; fresh request/row fixture; exact source/build identity. Its success means the defect was reproduced, not conformance |
| Existing new refusal suite | Full snapshot equality and explicit checkpoint/reach results; backend error identity | New temp DBs, same-page retry, unchanged committed test/helper bytes; raw TAP log |
| Original GAP negative control | Exact failing assertion, actual/expected message, error location and exit inspected | Original test blob unchanged; only the named test selected; unique reviewer output/log; fixed behavior corroborated by typed probes |
| `round2/run.mjs` stage records | Actual commands, exits and SHA256 of raw logs; not an aggregate semantic PASS | Exclusive new log files, source/HEAD before/after checks, copied source preimages; committed merged tree, offline slot null |
| PACK PASS | Actual builds, fresh tarballs, clean install, strict declarations, isolated evaluated imports and CLI behavior | Its own current input snapshots and tarball/command hashes; new attempt/consumer; no engine qualification claimed |
| Merge proof | Equality of three independently read Git blobs; exact path deltas and unchanged acceptance | Actual commit IDs and current HEAD; recipe hash and fresh observation timestamp; no manually asserted merge identity |
| Inventory | Each retained non-cache file hashed, size/mtime stability and denominator checked | Runs after all writers exit; bounded round-2 root; source hash/time; self outputs excluded to avoid recursion. Byte inventory only |
| This FIX-FIRST verdict | Depends on reproduced remaining guard error; closes the four fixed sites separately | Exact reviewed/merged revisions and retained raw outputs; no inference from exit-zero alone |

`lab/acceptance/` remains byte-identical to accepted main `e09c2ff4`. Neither changed DI01 path occurs in its pin inventory, so no pinned hash moved and no re-pin was made. Review changes are confined to the requested merge and reviewer files.

## Evidence and limits

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round2-review/`. `SHA256SUMS-round2` uses paths relative to that root; dependency installations, npm caches and bin symlinks are excluded. Bulk evidence remains outside Git. Completed inventory: 132 files / 2239195 bytes; manifest SHA256 `9deaca31a2579e12f54f26a8ec397e7284a94933fd85ba036def3ee23e718de7`. Inventory JSON SHA256 `4e30645c1440ec3c704060f396a357ec267ffb7e81b51e213c9b2611e9c8a4b4`.

Not rerun: full original trace, 900-trial crash matrix, 100k lag probe, root pack (known out-of-scope DuckDB failure), G0, live X/Q/D reads or actual retention compaction. Those are not promoted by the scoped helper fix or these tests. Backend expiration was injected to test identity and abort behavior. No implementation fix, package/lockfile change, engine lifecycle action, publish, push or merge into main was performed.
