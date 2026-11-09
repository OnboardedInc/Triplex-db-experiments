# CX-VP2B: EXP-P2B rounds 1–3 offline adversarial review

**Verdict: FIX-FIRST.** Reviewed candidate `ba10ebb9a119a89e9bdd532ccaa2439f268b1211`
(`exp/P2B-xtdb-behind-broker`). No implementation or acceptance-contract edits.

North star: correctness of P1 exact cuts, P2 idempotent durable receipts and P3
ordered resume, including bounded resources. Goals/targets: `lab/SCOPE.md`,
`lab/NORTH-STAR.md`, `lab/TARGETS.md`. Read the three experiment reports,
`EVIDENCE-round3.md` and main-checkout R42. This is an offline Mac review; no
engine, slot or VM claim is made.

## Findings

### F1 — High: duplicate command resolves before its original receipt is readable

**Locations:** `packages/broker/src/log.ts:439` (`claimAsync` reads on an
independent SQLite reader), `packages/broker/src/StorageAdapter.ts:834`
(`claimCommand` immediately adopts that claim). The writer callback advances the
broker read basis only later, at `packages/broker/src/broker.ts:609`.

**Reproduction:** the last test in `review.test.ts`, “duplicate claim becomes
visible before the broker can serve the original transaction receipt.” Run a
real public `Triples.transact` with `commandId: same-command`. Let the actual
SQLite append finish, but hold delivery of its return to the broker's decision
loop. Submit the same command ID again through the public API. The retry gets
`CommandAlreadyCommittedError` naming the original transaction, while
`Triples.transaction(error.transactionId)` returns `null`; broker head and
the shared publication watermark are still zero. Release the first append
return: the original transaction completes and the same receipt becomes readable.

This is a deterministic delay at an asynchronous completion boundary, not a
fake SQLite result. The original durable command is retained, and it is not
executed twice. The defect is the **premature resolution of a duplicate to an
unreadable original receipt**. The public error's documented recovery instruction
is to return/inspect that original transaction. The independent claim lookup
bypasses the publication/read-basis gate needed to make that instruction work.
The physical pre-fsync window was not injected; no measured data-loss claim is
made. Merely seeing a durable write before its ACK is not the finding.

**Proposed fix:** do not return a claim to public duplicate resolution until the
original claim position is covered by the broker's published/readable prefix.
Wait asynchronously within a bounded deadline or return a typed pending/repairing
outcome. Keep the decision loop's internal staged-claim checks separate so it
cannot deadlock on its own pending publication. Add this schedule as a regression,
including an original writer whose completion callback is delayed and a retry
that immediately reads the original transaction.

### F2 — Medium: long-lived worker snapshots have no WAL resource bound

**Locations:** `packages/broker/src/reader-service.ts:94` (unbounded snapshot
lifetime), `packages/broker/src/sqlite-worker.ts:24` (auto-checkpoint disabled;
16 MiB `journal_size_limit`), `packages/broker/src/sqlite-worker.ts:115`
(64 MiB alarm), `packages/broker/src/sqlite-worker.ts:127` (incomplete checkpoint
returns without a resource-limit policy). The new reader service does not join
the internal SQLite-reader gate used by the checkpointer.

**Reproduction:** “WAL crosses its alarm…” in `review.test.ts`. Pause the actual
`BrokerReadService` worker immediately after its marker SELECT has established a
snapshot. Keep the broker running; commit 48 commands with one 512 KiB string
fact each (24 MiB input total), then request checkpointing. WAL bytes sampled
every eight commands are:

`13,076,912; 26,203,232; 39,354,272; 52,530,032; 65,705,792; 78,889,792`.

All 48 writes succeed. The checkpoint reports `incomplete`, with 19,148 WAL
frames and only 12 checkpointed. After releasing the reader, its original cut
still returns exactly `seed`, and checkpointing completes. Both independent
successful attempts produced the same WAL-size series. The test is deliberately
bounded; it does not fill a disk or manufacture a SQLite I/O failure.

**At the limit:** there is no enforced 64 MiB (or 16 MiB) live-WAL limit. The
threshold requests maintenance and records an incomplete outcome; it does not
cancel the reader, reject further writes or reserve bounded additional space.
The free-space check is at open, not each append. By code inspection growth can
continue until a reader ends or storage/SQLite fails; append errors then fail-stop
the broker with outcome-unknown. Exhaustion itself was not exercised.

**Proposed fix:** define and enforce a bounded policy for slow/descheduled reader
snapshots and WAL admission. Include worker-local readers in maintenance
coordination, bound/cancel individual scans with a typed refusal and retry at the
same logical pin, and reserve/enforce WAL headroom before append. Test the actual
limit and recovery without making the writer wait indefinitely for a reader.
The builder already discloses this gap honestly; the finding does not dispute
its diagnostic measurements.

## Results against the requested checks

| Check | Offline observation and limit |
| --- | --- |
| P1 exact cuts across writer/checkpoint/purge | A worker holds cut P=2048 while the writer retires its row at 3072. A real checkpoint and purge overlap the live SQLite snapshot. With the logical lease held, horizon stays 2048 and removes zero rows; both the in-flight and subsequent pinned reads match the hand-derived original bytes after the existing snapshot mask. After release, purge removes one retired row, H1 declares the old cut ineligible, and persisted-source fallback still reconstructs it exactly. |
| Shared watermark | Forty commits with 120 concurrent watermark observations: LSN, position and decision stamp never regress. An intentionally held publication leaves the worker at the old prefix, rejects the new basis and keeps the feed from delivering it. Closing and reopening refuses the old buffer and advances the epoch. This is scoped evidence, not an exhaustive scheduler proof. |
| Durability defaults/refusal | Source review confirms default-on in `HostLog.open`/`connect`, propagation through `HostBroker.open`, and explicit true in both engine environment factories. Writer/checkpointer/lock/calibration writable connections set FULL/fullfsync/checkpoint_fullfsync; explicit diagnostic false disables the capability requirement, not those pragmas. Fresh default-open native file-bound proofs succeeded. Upstream tests exercise `/dev/null`, injected unsupported startup, invalid opt-out values and a wrong-file probe response, with typed `FullFsyncUnavailable`. No real unsupported filesystem was mounted; no power-loss test. |
| Async pin/purge order | Pin-before-purge, issued without awaiting either call, preserves the pin; release-before-purge permits retirement. The overlapping read/commit/checkpoint/purge schedule above passes. All use the one serialized writer connection. |
| Original receipts/feed | Ordinary same-operation lost-ACK replay preserves positions/stamp before and after reopening. A changed duplicate command cannot replace the original claim. Tiny feed pages give exactly positions 2048/3072; restart resumes with the epoch transition, without redelivering those commits. Upstream atomic-consumer persistence/replay tests pass. F1 exposes the uncovered concurrent duplicate schedule. |
| WAL bound | Not supplied. F2 measures growth past the alarm with successful writers and incomplete maintenance, then recovery after releasing the read. |

A separate held-publication test observes primary `HostBroker` reads advance
after SQLite durability while the shared worker watermark/feed still lag. I do
**not** count that alone as a defect: the source's durable readable decision can
precede ACK, and the worker remains conservative. F1 instead holds the earlier
append-return boundary, where the public original receipt is demonstrably absent.

## Latency claim audit

The reports distinguish offline memory/H1 routes from real XTDB, explicitly name
the shared Mac host, retain failed attempts, disclose the changed balanced
40-offers/s diagnostic trace and sequential comparison windows, and state that
P2's small-band bars are not consistently met. R42's Mac-only reasoning does not
supply VM acceptance. No mislabeling requiring a separate finding was found.

`audit-latency.py` independently hashes/decompresses the original raw commit logs
for the three final 256-reader cells, verifies their report/matrix bindings and
3,000 distinct offered sequences per cell, and recomputes nearest-rank quantiles
from `ackNs - scheduledNs`. All nine bands match exactly. Ten-fact p50/p99 ms:
`13.804125/92.875041`, `11.344416/100.518583`,
`8.920084/81.616084` (1,000 samples per band per repeat). These support the
report's diagnostic numbers, not acceptance. This audit covers those three raw
cells; it does not revalidate every byte in the full 4.31 GB archive or rerun the
81-cell benchmark.

## Execution, evidence and changes

- Fresh upstream broker suite: **24/24**, eight files. Log: `baseline-attempt2.log`.
- Fresh own broker JS build plus scoped backend suites: **129/129**, eleven
  files (48 XTDB + 81 QLever), against this worktree's broker build. Durable gate
  `gates-58ae2302-c2be-43cb-82d4-1be18e713e42` has before/after source, runner,
  reused core/testkit public build and native-binary hashes, all unchanged.
- Independent five-schedule probes completed twice before the duplicate-window
  extension. Their assertion success includes confirming the observed WAL gap;
  it does not mean the implementation passed a correctness acceptance gate.
- Final six-schedule probe: **6/6 completed**, gate
  `gates-db2f599d-c313-46ec-8f81-ae13cf00d533`, observation attempt
  `review-d2817c3e-d322-48a6-b55c-cf6720a2ee39`; before/after inputs unchanged.
  See `EVIDENCE.md` and `bound-probes-attempt4.log`. The duplicate-window extension
  first used the wrong error-property name (`txId` instead of `transactionId`),
  then expected `undefined` instead of the API's `null` for a missing transaction;
  both verifier fixture failures and the corrected attempt are retained.
- Initial baseline startup hit a sandbox refusal when Vite tried writing through
  a reused dependency-directory symlink. Replaced only this worktree's symlink
  with a local directory of read-only dependency links; the bounded retry passed.
  No package install, dependency version change or global cache write.
- `run.mjs` takes a lab heavy grant (via its caller) and checks the 5 GiB free
  floor before each command. All expensive commands used `lab/bin/heavy.mjs`.
  Dependencies were reused from the reviewed P2B environment; product source
  came from this worktree. Own broker output was generated by its build tool.
- Bulky databases/raw execution inputs stay under
  `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2B/`.
  `EVIDENCE.md` and `SHA256SUMS` index them. No worker/engine remains intentionally
  running; each probe closes the services, broker and worker it owns.
- Changes are confined to `lab/verify/P2B/`. No `lab/acceptance/` edits, version
  change or pinned-path hash moves; old/new pinned-hash list is empty. No merge,
  push, release or deployment.

Reproduce from this worktree with the installed lab dependency links and adequate
free space:

```sh
node lab/bin/heavy.mjs --label CX-VP2B-baseline -- node node_modules/vitest/vitest.mjs run --config lab/verify/P2B/vitest.config.mjs
node lab/bin/heavy.mjs --label CX-VP2B-gates -- node lab/verify/P2B/run.mjs
node lab/bin/heavy.mjs --label CX-VP2B-latency -- python3 lab/verify/P2B/audit-latency.py
```

## Rule 9a: observations to results audit

| Place | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `review.test.ts` assertions / Vitest result | Actual SQLite rows, masked old-cut byte equality, horizon/removal counts, worker refusal, original receipt/claim identity, feed positions/cursors and measured WAL sizes. Defect-witness tests assert the defect exists; they confer no acceptance. | UUID output directory and fresh broker/worker instances for each run; controlled gates prove overlap, not elapsed-time guesses. | Exact source file, shared buffer, named cut, operation/command/transaction IDs and fixture rows. Offline: no engine slot. |
| `review.test.ts` `note` | Writes the actual observed values only after associated assertions; later assertions can still fail the test. A partial observations file is never adopted as a completed test verdict. | New UUID attempt, no reused output file. | Attempt ID, reviewed candidate, test name, relevant positions and controls. |
| `run.mjs` execution status / `unchanged` | Actual build/test exits plus equality of complete before/after input-hash maps. Semantic conclusions additionally require inspected test assertions/logs; status zero alone is insufficient. | New UUID gate directory and fresh subprocesses. | Source/runner/lock bytes, actual dependency realpaths/public core-testkit builds, native binary, Node and reviewed HEAD. No slot. |
| `audit-latency.py` positive comparisons | Original decompressed raw hashes, 3,000 unique sequences/cell, 1,000 samples/band, monotonic elapsed pairs and exact quantile equality. | A fresh audit of immutable historical observations; explicitly not new measurements. | Committed summary's matrix hash, exact attempts/report hashes, compressed and original raw SHA256s. |
| `VERIFY.md` verdict / evidence index / SHA256 manifest | Finding schedules and actual observations, test logs and independently recomputed quantiles; manifest hashes retained bytes. | This review's completed attempts; failures kept and named separately. | Candidate HEAD, worktree/branch, source-bound gate attempts and durable evidence paths. No claim about an unobserved engine/VM. |

Not performed: code fixes; live XTDB/replica SQL acceptance; engine lifecycle or
exclusive slot; VM/R44 qualification; year-one scale or full target trace;
physical power loss; filesystem exhaustion; full root `pnpm check` or
`pack:check`; full archive audit or promotion. Open follow-up: close F1's duplicate
publication gate and specify/enforce F2's WAL limit, then rerun these schedules
before live qualification.
