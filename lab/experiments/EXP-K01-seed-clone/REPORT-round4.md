# EXP-K01 round 4 — offline fixes and Q83e

Builder: CX-K01-R2. Branch: `exp/K01-seed-clone`. Implementation: `2c0e5867`.
Scope: K01 seed reuse correctness and evidence integrity under `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.
This is an offline implementation result, pending independent review and a separately admitted live run.

Read the round-2 reviewer report and evidence on `verify/K01` at `07273099f65200be69dbe6626aa9819be8c504cb`.
The exact reviewer test input, report, watermark source evidence and SHA-256 provenance are retained in
[evidence/round4/reviewer-input](evidence/round4/reviewer-input/). The reviewer worktree and main checkout were read-only.

## Fixes

| Finding | Change and proof |
| --- | --- |
| R2-F1: earlier golden deleted after current admission refusal | Each runner invocation uses unique holder/output paths. Cleanup reads only its exact creation receipt after invoking golden, verifies its invocation token, and passes the creation UUID to golden-rm. Golden creates the receipt exclusively before Docker creation and labels the volume with that UUID; removal refuses a different UUID. A partial creation remains identifiable without scanning historical records. Slot cleanup also requires the current holder. Both historical-artifact refusals and matching/mismatched current-receipt controls pass. |
| R2-F2: late newer ERROR overwritten by older PASS | All engine owner mutations share the sibling per-slot directory lock, including acquisition/release, restart invalidation, clone publication, stop invalidation, verification revocation, final publication and error publication. Final owner read, attempt/certificate comparison and atomic replacement execute synchronously inside that lock. Two actual Node processes test both ordering cases: the newer ERROR survives. No extra unlocked reread is treated as a concurrency fix. |
| R2-F3: changed current copy/golden still admitted | The immutable certificate hash includes golden volume, record path/hash, manifest/freeze hashes, container/key, clone time and the complete copy receipt (including UUID and all C1 fields). Verification compares it under the publication lock. Driver admission recomputes it, requires C1 PASS, and binds the verified container/start identity. Changed golden, C1 verdict/expected/observed, tree, copy UUID and start refuse. Old PASS records without this binding require re-verification. |
| R2-F4: failed inspect/log acquisition accepted | Startup requires successful unsignaled inspect/log reads without spawn errors, valid start identity and a matching final inspect. Stop refuses missing/changed inspect identity and makes failed log acquisition semantically unsuccessful even with matching partial text. Raw acquisition status/signal/error/stdout/stderr are retained for startup and stop logs. Health probes, block discovery, clone-check invocation and the live runner also reject failed process acquisitions. |

The publication lock protects cooperating engine operations; manually editing owner.json outside that protocol is not serialized.
A crashed process leaves a recoverable stale directory lock, using the existing lock implementation. Failed owner-file writes
propagate failure; the operation does not report success when revocation/publication cannot be persisted.

## Q83e: three frontiers and actual stopped bytes

Settle now records F (immutable block cut), M (stable processed/submitted source head), and T (application transaction)
separately. Three readings 5 seconds apart require unchanged listing, trie digest, T and M, with lag/jobs zero and existing
block adoption/coverage/upload checks. T must remain equal to the pre-cut transaction. The two cuts remain.
F may trail M at this live stage; this returns `qualified:false` and `AWAITING_STOPPED_TAIL`, never a qualified golden.

After the clean stop and before any copy, the offline helper checks both LocalLog tail framing and empty .tmp, then reads
source LOG bytes starting at F through EOF. The Node decoder validates every complete frame, its absolute offset trailer,
the FlushBlock anchor at F, and the exact final message position M. Every message in (F,M] must decode as TriesAdded,
the pinned source encoding used by block publication and compactor output. Tx (including legacy Tx), unknown message types,
other source operations, malformed/truncated bytes, an extra message after M, or a changed epoch refuse. Raw tail bytes
(base64), whole-tail hash, individual payload hashes, frame positions, F/M/T and maintenance count remain in the record.
The parser has a 16 MiB bound and fails closed on unsupported data; this bound has not been validated at larger rungs.
Pinned codec/LocalLog/protobuf/message-id source hashes are in [decoder-source.json](evidence/round4/decoder-source.json).

Only this stopped-tail proof sets `qualified:true`. The reference start and clone start require resume at M and matching
current gauges; exact fingerprint/C1-C8 comparisons remain. The reference is stopped and its tail is checked again at M.
Loading a golden redecodes both retained stopped tails and checks their bindings against the recorded snapshot/frontiers;
a persisted qualified flag alone is insufficient. The existing replica-tail structural proof is retained alongside the
source-head proof, and copy equality still covers every file, including both complete logs.

The reviewer's maintenance-only watermark shape now passes provisional settle and actual framed stopped-tail qualification.
The same shape with an application transaction in (F,M] refuses even when its observed T is unchanged. Additional controls
cover F=M, an application transaction hidden between two maintenance messages, corrupt trailers, truncated/unknown payloads,
wrong M, changed reference evidence and changed persisted snapshot gauges. These are binary fixtures, not a live XTDB trace.

## Fresh offline gates

Final source-bound run: **134/134 tests PASS**, zero skips/TODOs/cancellations, all process exits 0.

| Suite | Result |
| --- | --- |
| Original focused suites | 41/41 |
| Original reviewer regressions | 21/21 |
| Round-3 boundary tests | 23/23 |
| Round-2 reviewer freshness variations | 14/14 |
| Round-4 stopped-tail, certificate, acquisition and real process-lock controls | 35/35 |
| Lab benchmark TypeScript (`tsc --noEmit`) | PASS |
| Authored JavaScript syntax checks | PASS |

[run.json](evidence/round4/run.json) records implementation head `2c0e5867c8d4df727e8c0a1555650a55da44bdd6`
and 15,139,807,232 bytes host free at admission (above 5 GiB).

Reproduction (disk must remain above 5 GiB):

```sh
node lab/bin/heavy.mjs --label CX-K01-R4-offline -- node lab/verify/K01/run-round4.mjs
```

The receipt binds commands, exits/signals/errors, Node version, executed source hashes, source commit and host disk readings.
Raw output, case observations and checksums are in [evidence/round4](evidence/round4/).
Development receipts remain in `initial/` and `pre-final/`; these are historical attempts, not substitutes for the final run.
The runner restores historical case files after each suite and removes its temporary fixtures after child processes exit.

The copied reviewer regressions require I/O adapter changes for the new conditional owner-update API and completed process
receipts. Their defect assertions remain active. The obsolete Q83d blanket-watermark-refusal expectation in the original
21 and new 14 suites is explicitly replaced by Q83e provisional settle plus stopped-byte qualification; the original reviewer
freshness source remains unmodified under `reviewer-input/`. Baseline clone fixtures now supply the certificate/start binding
required by the consumer. Earlier round-3 mock update adapters preserve their injected write failures and supersession cases.
No case is skipped, TODO or marked expected-failure.

## Limits and handoff

No Docker command, engine lifecycle action, service request, slot reservation, volume creation/removal, resident change,
installation, main-checkout write, merge or push occurred. Only the shared heavy-test semaphore was used. No volume was
made or retained by this round. Temporary test files were local and removed. Historical engine evidence was preserved.

No new live 500-subject golden/clone, T1-T7, C1-C8, timing, E1/C10/PAIR-0, large-rung or performance result is certified.
No full monorepo check ran; the focused offline suites, lab TypeScript check and syntax checks cover these lab-only changes.
E1's plan now uses Q83e F/M/T but live readiness remains unqualified. The next steps are independent offline review and a
separately admitted live run to validate the actual stopped-tail encoding, reference/clone resume and exact catalog equality.
