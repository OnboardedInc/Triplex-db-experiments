# EXP-K01 round 5 — codec, C1 and teardown integrity

Builder: CX-K01-R2. Branch: `exp/K01-seed-clone`. Implementation: `5e7b68f8`.
North star: reliable seed reuse and evidence integrity as a correctness floor for P1-P5; goals and targets remain
`lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

Implemented the three gap classes from CX-VK01's [VERIFY-round3.md](evidence/round5/reviewer-input/VERIFY-round3.md),
reviewer head `4815140bdb2ddec70d70f1a39da421acb85bfec3`, read-only. Copied the 36 regressions and review runner into this
branch. Original reviewer inputs, codec source evidence, case observations and hashes are retained under
[evidence/round5/reviewer-input](evidence/round5/reviewer-input/). Main checkout and reviewer branch were not edited.

## Changes

**R3-F1 — validate the accepted bodies.** The stopped-tail decoder now follows the pinned SourceLogMessage schema,
including FlushBlock field 2 presence/wire type, every nested TrieDetails, TrieMetadata and TemporalMetadata message,
UTF-8 strings, scalar wire types, supported enums and int32 encodings. Unknown fields, duplicate singular fields,
unsupported content and invalid nested messages fail closed. FlushBlock's decoded nonnegative safe block index must
match the intended checkpoint index in the actual settle snapshot. That binding is checked both before copy and when
loading a persisted golden. All source application families remain refused throughout (F,M], with independently read T.
The schema table also validates the protobuf envelopes for application families, but does not claim to execute Kotlin's
application semantics (ZoneId/custom Any/transaction-op decoding); those families never qualify as maintenance.

The prior positive binary fixture was wrong: `[03 0a 02 08 00]` used unknown field 1. The corrected positive fixture is
`[03 0a 02 10 00]`, the actual field-2 zero cut. Fresh binary proofs include the decoded index. Historical round-4
artifacts are unchanged and remain historical evidence of the faulty parser. Malformed anchors/metadata are retained
as active negative regressions. The decoder remains conservative: some protobuf encodings the native parser tolerates,
such as duplicate singular fields/unknown fields, are refused rather than silently reinterpreted.

**R3-F2 — C1 compares its actual evidence.** Re-verification now requires present lowercase 64-digit SHA-256 values and
exact agreement among the loaded golden tree, copy tree and C1 expected/observed hashes. Clone kind/key/golden identity
and a nonempty copy identity must match; `c1.pass` is required but cannot establish the verdict by itself. Driver admission
also checks the current copy's internal hash agreement before accepting its bound readiness certificate. The immutable
pre-start receipt is reused; current append-only log bytes are not misrepresented as pre-start bytes.

The tree parser rejects duplicate paths/hashes and invalid size/mode/owner fields before constructing the canonical
sorted path/size/mode/uid/gid/content-hash byte preimage. A successful C1 therefore compares the same explicit byte
encoding on both sides. Copy creation still computes it from actual helper listings before the first start.

**R3-F3 — teardown revokes before destruction.** `down` marks lifecycle REMOVING and current readiness STALE inside the
owner lock before stop/removal or pool-accounting waits. The previous receipt is retained as history. Verify refuses
non-running lifecycle state on entry, revocation, final publication and error publication; the driver does likewise.
New owner generations and lifecycle operation tokens protect restart, stop and release. Release compares the exact
owner generation/holder/creation time/operation token while locked and refuses to delete a later owner's directory.

Stop now marks STOPPING before physical action and STOPPED only for that same operation. Restart/fresh start marks
STARTING before action, invalidates old readiness, and marks RUNNING only after readiness for the same generation/token.
An incomplete operation remains non-admissible. Concurrent starts refuse active lifecycle operations. A failed teardown
retains revoked state; no cleanup success is inferred from failed inspect output. Successful explicit container/volume
list commands now prove absence before release. Ownerless destructive down refuses instead of acting without a generation.
Golden records bind the volume creation UUID too, so deleting/recreating a golden under the same name cannot revive an old
record. Historical PASS files remain forensic records; current admission requires the current owner and its lifecycle.

The broader audit also fixed the engine readiness helper's use of HTTP-looking text from failed/signaled/error processes,
and resource-floor acceptance of invalid numerical observations.

## Required pre-commit PASS audit

Before committing, listed every K01 observation-to-success boundary and checked its content, freshness and binding:
[PASS-AUDIT-round5.md](PASS-AUDIT-round5.md). It covers readiness/tool/disk/admission, stop, provisional settle, stopped
byte qualification, tree/copy equality, golden publication/load, C1-C8, startup/resume, parent publication, driver admission,
lifecycle and cleanup, and diagnostic success fields that do not grant admission. It records the local-producer trust
boundary and does not imply that mock queries prove native semantics. This is the builder's audit, not independent review.

## Gates and provenance

**209/209 tests PASS**, zero skips/TODOs/cancellations. All suite processes exited 0 without signal/spawn error.

| Gate | Result |
| --- | --- |
| Original focused tests | 41/41 |
| Original reviewer regressions | 21/21 |
| Round-3 boundaries | 23/23 |
| Round-2 freshness regressions | 14/14 |
| Round-4 controls | 35/35 |
| Copied round-3 reviewer regressions | 36/36 |
| Round-5 additional audit controls | 39/39 |
| Lab benchmark TypeScript | PASS |
| Authored JavaScript syntax / committed whitespace | PASS |

The full run began before the source commit; its actual receipt head remains `9254ec3b`. Every executed source hash
matches the corresponding committed blob at `5e7b68f85b810fbd5525aab56c99296d2350d2a0` (see the exact commit in
[source-commit-binding.json](evidence/round5/source-commit-binding.json)); no tested source changed afterward.
Host free space at test admission was 13,358,067,712 bytes, above 5 GiB.

Reproduce the offline gate through the required heavy semaphore, with host free space above 5 GiB:

```sh
node lab/bin/heavy.mjs --label CX-K01-R5-offline -- node lab/verify/K01/run-round5.mjs
```

[run.json](evidence/round5/run.json) binds source hashes, head, command arguments, actual exits/signals/errors, Node version,
wall times and host disk. Raw logs and case observations are adjacent. Historical case files are restored after each suite,
and temporary files are removed after child processes finish. Development runs, including the first stricter-C1 run that
correctly rejected an incomplete old positive test fixture and the disk-estimate integer restriction caught by the
baseline, remain separately recorded; they are not substituted for final
execution. Checksums cover the retained round-5 artifacts.

The copied reviewer assertions remain active. Its dummy `good-tree` positive metadata was replaced with a well-formed SHA-256
test value because the new C1 contract correctly refuses labels that are not hashes. The helper extraction marker and injected
randomUUID were adapted for conditional release/lifecycle transitions. Prior positive fixtures were similarly made complete;
stop-only VM adapters now carry the current owner transition. The exact reviewer input and adaptation patch are retained.
No regression assertion was skipped, TODO, weakened into expected-failure, or replaced by a different claim.

## Limits and handoff

Offline only: no Docker execution, container lifecycle action, service request, engine slot, volume creation/removal,
resident change, install, main-checkout write, merge or push. Only the shared heavy-test semaphore was used. No volume was
made or retained. No full monorepo check ran; changes are lab-only and the focused offline/TypeScript gates cover them.

No new live 500-subject golden/clone, T1-T7, live C1-C8, C10/E1/PAIR-0, timing, performance or large-rung result is certified.
Native Kotlin codec execution and actual engine teardown/restart remain unverified. The 16 MiB/same-epoch tail limits still
fail closed and need live/scale qualification. Older incomplete tree receipts, missing volume generations, or proofs without
the cut-index binding require fresh golden creation/re-verification. Independent offline review and the separately admitted
live reference/clone window remain the next actions; no user clarification is needed to review these fixes.
