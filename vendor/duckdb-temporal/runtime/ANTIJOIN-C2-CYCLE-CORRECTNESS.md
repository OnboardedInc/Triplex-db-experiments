# C2 post-timing cycle closure: proposed correctness gate

Docs-only, unexecuted. Do not change the frozen `8651acc1` harness/configs
or start an engine while another lease is active. This is a bounded
correctness follow-up, not another throughput run or altered 60 s gate.

Preserve the first passing C2 raw `5e90b7c269d36d37813e98cf7402767cc4ca2e05a119e2c34af39e5f40e49580`
and its database unchanged. Use
`evidence/antijoin-config-c2-10m16-raw-20261105.json` to resolve the actual
saved database from `attempts[0].database`, relative to the common runtime.
Do not substitute the canonical 10m pre-Probe source or the earlier rejected
0.32 admission experiment. This C2 database has probe K39095 and 420 ACKs,
ending at K39515; 92 more patches complete the first 512-command cycle.

After an explicit future correctness lease:

1. Require the saved timed database to be closed without a WAL. Record its
   identity/SHA and the raw SHA, make a fresh owned CoW fork with the existing
   clone helper, and operate only on the fork. If prerequisites disagree,
   stop and preserve the evidence; do not open the original to repair it.
2. Open the fork through the same archived B `NativeEntityStore`, native
   binding and bounded settings. Confirm its latest K39515 and 164 exact
   typed targets, plus the recorded initial/historical state. Capture the
   full receipt for the first deletion command before additional writes.
3. Explicitly query valid V0 at `knownAt=probeK+256=39351`. Require `[]`.
   No timed latest sample landed exactly there, so this is new coverage.
   Also query K39352: the first restored target must be only `probe-000`.
   Retain the original 1,680,202 input-cap proof; exact cap succeeds and
   one less rejects, including the empty-result historical query.
4. Recover and validate the original command prefix from the recorded
   eight-digit write ordinals. Through the same public `patchRecord`, issue
   ordinals 420..511 to `probe-164`..`probe-255`, retaining both fields
   `{probe_member=0;i=1;}` over `[0,INT64_MAX)`. Require 92 consecutive ACKs
   at K39516..39607 with the original receipt/ID contract. Do not replay the
   first 420 writes or change the workload's schema or source entities.
5. Require latest K39607 and exactly the independently enumerated 256 typed
   targets `probe-000`..`probe-255`. Recheck pre-Probe K39087 (empty), initial
   K39095 (all 256), all-removed K39351 (empty), first-restore K39352 (one),
   and original timed-final K39515 (164). Preserve exclusive interval ends.
6. Delayed-replay deletion ordinal0 with its exact original request. Require
   its original full receipt, unchanged current K39607 and all 256 targets.
   Replay ordinal511 as well, requiring its identical full receipt and no
   new position or history mutation. These checks must use real native
   commands, not model-only state.
7. Close and reopen the fork, repeat current/selected historical answers
   and receipt lookup/replay, and require clean lease/control queues. Verify
   the untouched timed source database/raw and archived runtime identities
   after the gate. Preserve fork/output evidence; no deletion is authorized.

Record exact source/fork identities, runtime/harness references, every new
ACK, explicit cut/expected rows, full replay receipts, final/reopen checks
and first failure. A completed gate can claim deterministic all-removed and
full-restored coverage. The current 420-ACK timing alone cannot claim it.
