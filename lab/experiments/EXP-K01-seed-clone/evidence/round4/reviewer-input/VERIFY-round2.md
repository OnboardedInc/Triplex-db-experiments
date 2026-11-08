# K01 round-2 offline review: FIX-FIRST

Reviewer: CX-VK01. Builder reviewed: `a13316c` (implementation `b2b27e5`). Merged into `verify/K01` at
`7a10abfbf6d9739b1453cdf1a82a204cdf291ba6`. The merge's implementation bytes match the builder. Its four conflicts
were generated result files: original reviewer evidence remains in `evidence/`, and the builder versions are preserved
in `evidence/builder-round3/`. The exact mapping and hashes are in
[merge-provenance.json](evidence/review-round2/merge-provenance.json); historical manifests describe their respective
commit trees. No implementation fix was made by this reviewer.

North star: correct seed reuse and dependable evidence for P1-P5. Scope and targets: `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`. Criteria: R26, R30, Q83a-d, the first review, and the builder's
`lab/experiments/EXP-K01-seed-clone/REPORT-round3.md`.

**Verdict: FIX-FIRST.** All three original counterexamples are fixed: the unchanged 21 reviewer tests pass, along with
the original 41 tests and the builder's 23 added tests. The wider freshness audit finds four further defects. Eight
new assertions reproduce them. These are offline counterexamples with injected I/O/interleavings, not observed live
engine failures. The watermark issue also needs a protocol decision before live qualification can succeed reliably.

## New findings

### R2-F1 — HIGH: cleanup can delete a golden from a prior invocation after current admission fails

**Location:** `lab/experiments/EXP-K01-seed-clone/round2-live.mjs:97`, especially lines 98 and 100-102.

The runner's seed directory depends on `TX2_K01_ATTEMPT` (default `round2`), not its unique `attemptTag`. Its `finally`
block discovers `golden.json` or every `golden-attempt-*` in that directory and uses those historical files as proof
that it should remove a volume. That cleanup is not conditional on this invocation creating the golden, or even
acquiring a slot. The new retained-source guard can therefore reject admission while cleanup still selects an older
retained golden for deletion. `golden-rm` checks managed golden identity/mounts, not membership in this invocation.

**Reproduction:** the two `R2-F1` tests reuse a prior attempt directory, inject an unrelated retained s1 source, and
provide either a historical published record or a historical unpublished attempt with `copy`. The actual runner body
refuses before any `up`, then nevertheless invokes `golden-rm` from `finally`. Expected: zero removals. Observed: one
removal request in each case. The no-artifact control makes no removal request. See `cleanup-published-record` and
`cleanup-unpublished-attempt` in [freshness-cases.json](evidence/review-round2/freshness-cases.json).

**Proposed fix:** refuse reused output directories before entering cleanup scope, and track the exact volumes created
by this invocation, including partially created/unpublished goldens. Cleanup must operate only on that current attempt's
creation/ownership receipts, not directory discovery or timestamps alone. An explicit later cleanup command can handle
retained earlier attempts. Slot ownership alone is insufficient proof of golden ownership.

No volume was actually removed: process execution and filesystem responses are injected in this regression.

### R2-F2 — HIGH: the final owner read and publication are not one atomic state transition

**Location:** `lab/bin/engine.mjs:916` through line 921; the analogous error publication reads at line 931 and writes
at line 936. `atomicJson` atomically replaces a file; it does not compare its preimage or lock a read/modify/write sequence.

The new `attemptId` check correctly protects a newer attempt already visible when `readOwner` runs. A different process
can publish a newer ERROR/PENDING after that read and before `atomicJson`. The older attempt then passes its checks
against its cached owner and overwrites the newer state with its own PASS. There is no per-operation mutex around this
transition; the existing slot-holder record does not serialize two calls using the same authorized holder.

**Reproduction:** `R2-F2` captures the final owner read for attempt A, publishes a newer failed attempt B, and lets A's
actual publication code continue. Expected: B remains ERROR. Observed: A returns normally and replaces B with PASS.
`late-newer` records the event order. The adjacent control injects B before the read and confirms that the builder's
existing guard correctly preserves B in that earlier case.

**Proposed fix:** serialize verification revocation/publication and other owner mutations with a shared operation lock,
or use a genuine conditional update of an expected owner generation. Check the attempt and complete clone binding
while holding that protection. Apply it to initial revocation and error publication as well as PASS publication; adding
another unlocked read only moves the race.

### R2-F3 — MEDIUM: the current copy proof/golden binding can change without invalidating PASS

**Location:** `lab/bin/engine.mjs:898` (`identity`), line 918 (comparison), and line 919 (publication).
Consumer: `lab/bench/lib/bulk.ts:48`.

The current-owner identity check compares container id, key, manifest hash, record path/hash and copy tree hash. It omits
`goldenVolume` and the C1 verdict/expected/observed proof. If either changes after the child used the earlier owner,
the final owner still passes this comparison. The old C1 result can then authorize a current record whose C1 is false,
or whose golden volume differs from the one checked. The driver checks the manifest and readiness verdict and accepts
both contradictory records.

**Reproduction:** the two `R2-F3` tests modify current `copy.c1.pass` to false, or change current `goldenVolume`, after
the earlier C1 read. All included identity fields remain unchanged. Expected: current readiness is non-PASS. Observed:
PASS is published, and actual `seedPathOf` returns `seededBy: clone` for each record (`driverAccepted:true`). See
`current-copy-failed` and `current-golden-changed` in the case file. This demonstrates contradictory evidence admission;
it does not claim an actual physical copy changed in this offline run.

**Proposed fix:** bind the full immutable clone certificate, including golden volume, complete C1 proof and the copy
attempt identity, and compare it with the final owner and verified golden record under R2-F2's update protection.
Historical C1 is legitimate for an unchanged clone; it must not authorize a changed current certificate. Rehashing a
live replica log as though it were still pre-start bytes would be the wrong replacement.

### R2-F4 — MEDIUM: failed current inspect/log reads can still produce successful startup/stop proof

**Location:** `lab/bench/clone-check.ts:152-158`; `lab/bin/engine.mjs:636-637`.

`startCheck` consumes inspect stdout and log text without checking either process status/error/signal. `stopSlot` also
feeds log text into `stopVerdict` without checking whether the current log retrieval succeeded. Success-looking partial
text therefore certifies a proof even when the fresh evidence command reports failure. A failed fresh read must not be
replaced by whatever matching bytes happened to arrive.

**Reproduction:** three `R2-F4` cases return exit 1 plus matching text for startup inspect, startup logs, or stop logs.
Expected: refused/error proof. Observed: startup `ok:true` or stop `verdict.ok:true`. The stop case executes actual
`stopSlot` and actual `stopVerdict` with a running-to-stopped transition. Matching exit-zero controls pass. The fixtures
do not establish how often Docker produces partial output; they establish that an explicit process failure is ignored.

**Proposed fix:** require successful, unsignaled completion without spawn error before parsing proof bytes; require a
valid nonempty start identity and bind log bounds to it. Retain current process status/error/signal and raw bytes in
failure evidence. A failed proof acquisition must propagate to the semantic stage result.

## View on the watermark question

The concern is **structural in the pinned source**, not just whether a fast compactor happened to outrun a poll. This is
a source-grounded inference, not a fresh live observation. The upstream checkout is clean at
`c6c19623d90c658c15400fb46dc056f3735ed57b`; file hashes and numbered excerpts are saved in
[watermark-source.json](evidence/review-round2/watermark-source.json).

1. A `FlushBlock` source message at position F invokes `blockCutter.cut(F, ...)`
   (`references/xtdb/core/src/main/kotlin/xtdb/indexer/SourceLogProcessor.kt:142`). The immutable block stores F as
   `latest_processed_msg_id` (`indexer/BlockCutter.kt:235`, `catalog/TableCatalog.kt:328`).
2. After adoption, `BlockCutter.closeBlock` **unconditionally appends another source `TriesAdded` message**, then signals
   compaction (`indexer/BlockCutter.kt:280-295`). This is the L0 publication, before any compactor output. There is no
   nonempty-tries guard, and the codec still encodes an empty tries message (`api/log/SourceMessage.kt:139-147`). Thus
   even an empty catalog-checkpoint block has a later control message to account for.
3. Compactor output appends still more source messages (`compactor/Compactor.kt:150-152`). The source processor forwards
   those messages, and the leader advances the processed watcher when they are applied
   (`indexer/SourceLogProcessor.kt:199-211`, `indexer/LeaderLogProcessor.kt:196-203`). The node gauges report the source
   head and that watcher, not the immutable block's boundary (`database/Database.kt:375-387`).

Once a later maintenance message M is processed, the steady idle state can have `block.watermark = F < M`, with submitted
and processed both M, lag zero, stable completed transaction T, stable tries and jobs zero. The immutable block cannot
catch up. A second block records a later catalog but emits its own later publication message. Waiting longer or issuing
an unbounded sequence of extra cuts does not remove this distinction. The new watermark control uses this exact
maintenance-only shape and confirms that the current settle code explicitly refuses it, as unchanged Q83d requires.

**Recommendation to the orchestrator/planner:** revise the protocol/ruling to distinguish (a) the durable block-cut
frontier, (b) the post-maintenance settled/replay frontier and (c) the stable application transaction. Capture them
separately. Prove block adoption/coverage and unchanged T, drain maintenance to a stable head with lag/jobs zero, checkpoint
the settled catalog, and bind the final stopped log tails and reference/clone resume to the final replay frontier. A later
maintenance frontier may exceed the block's cut frontier; its intervening messages need appropriate evidence. Preserve
exact reference/clone equality and the two-start catalog checks. Do not reinterpret Q83d silently or equate source
messages with application transactions.

The exact replacement acceptance rule and a real stopped/restarted control remain to be qualified. This review does
not authorize changing the gate or declare that the suggested replacement already works.

## Fresh gates and evidence

| Suite | Fresh result |
| --- | --- |
| Original focused suites | 41/41 PASS, zero skips |
| Unchanged first-review regressions | 21/21 PASS, zero skips |
| Builder round-3 boundary tests | 23/23 PASS, zero skips |
| New independent freshness variations | 14 tests: 6 PASS, 8 FAIL, zero skips |

All new failures are desired-behavior assertions reproducing R2-F1 through R2-F4; none is marked TODO or expected-failure.
Controls cover ordinary successful/current proof, exception revocation, a newer failure visible before the final read,
no-artifact cleanup and the explicit Q83d maintenance-watermark refusal.

Fresh receipts and raw TAP are in [evidence/review-round2](evidence/review-round2/): `baseline-run.json`, `baseline.tap`,
`original-21.tap`, `original-21-cases.json`, `builder-23.tap`, `freshness-run.json`, `freshness.tap`,
`freshness-cases.json`, and `watermark-source.json`. The receipts bind actual commands, exits/signals, Node version,
merged head and executed-source SHA-256 values. A development run with the broader stubbed stop helper is retained in
`development-14/` with its exact source and an explicit superseded note; the final run uses actual `stopVerdict`.

[freshness.test.mjs](freshness.test.mjs) extracts the reviewed functions and executes controlled filesystem/process
responses. [run-review-round2.mjs](run-review-round2.mjs) restores the original case file after the unchanged reviewer
suite writes it, so this round does not overwrite the original failure evidence. Reproduce with:

```sh
node lab/bin/heavy.mjs --label CX-VK01-round2 -- node lab/verify/K01/run-review-round2.mjs
node lab/bin/heavy.mjs --label CX-VK01-round2-freshness -- node lab/verify/K01/run-review-round2.mjs --freshness
```

The first command exits 0. The second exits 1 while these eight assertions fail. Syntax checks and authored-file
whitespace checks passed. Raw TAP retains Node's intentional indentation whitespace. Artifact hashes are listed in
`evidence/review-round2/SHA256SUMS`.

## Limits and handoff

No Docker execution, engine lifecycle action, volume creation/removal, engine slot, resident change, service request,
installation, implementation fix, main-checkout edit or push occurred. Only the shared heavy-test semaphore was used.
The explicitly requested merge was into the reviewer branch only. Host disk was above the 5 GiB floor at admission;
the fresh test receipts retain filesystem readings. Test scratch was confined to this review's ignored `tmp/` paths.

No live golden/clone, T1-T7, C1-C8, C10/E1/PAIR-0, large-rung or performance result is certified here. No new TypeScript
build or full monorepo check ran. Original source-bound builder tests were rerun, rather than adopting their historical
receipts. The remaining actions are the four fixes plus a separately approved/qualified watermark rule, followed by a new
independent offline pass and the separately admitted live window. Source ownership/capacity remains the orchestrator's
responsibility.
