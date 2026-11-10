# DX-H6 verdict audit

North star: P5 activation with P1/P2 preserved. All new measurements are diagnostic. No acceptance contract is changed.

- `record.ts`: immutable `manifest.json` is written only after all 16 pages/1,000 subjects complete; raw actual HTTP requests/responses and H5 comparator golden worlds/outputs are hashed. Runtime source/build hashes are checked again before writing. The sealed clone head must be 42,775. This is a golden capture, not PASS.
- `offline.ts`: verifies every recorded file hash, parses the actual response, compares every world's canonical bytes and every output/record with golden bytes on each round, reports recording hash and CPU costs. No engine, live-ratio or acceptance gate is inferred.
- `world.test.ts`, `seed.test.ts`, `pipeline.test.ts`, package `sweepRows.test.ts`: assertions check actual content/ordering, run fresh in the current process/source, and use isolated temporary files. Passing tests do not certify engine outcomes.
- `w0-driver.ts`: unchanged G0 independent population/count/fingerprint gates bind restored content. A changed seed mapper requires the explicit exact historical mapper hash; the historical receipt stays unchanged. G1 compares every activation world digest to fresh G0 preview world bytes; G2 compares every output with independent O-DOMAIN reconciliation; G5 folds every actual published page against O-DOMAIN. G1/G2/G5 PASS assignments occur only after all post-ACK comparisons finish. G3 mutation witnesses, G7 position/epoch/coverage, and G9 actual stored journal/count fold remain required. Existing incomplete G4/G6/G8 remain incomplete. Each attempt captures source hashes and checks them at completion. No PASS is inferred from ACK alone.
- `sweep.ts`: a checkpoint only follows the callback's publication ACK. Sorted unique list, cursor binding, exact per-page subjects/output basis, eligible position and invariant epoch are checked. At most two page results per worker await publication. Ordered callback invocation plus `w0-outbox.ts` submission tickets pipeline commits in page order. Failure rejects later submission tickets; in-flight outcomes are not promoted to semantic PASS.
- `w0-outbox.ts`: command-id lookup/dedup and TripleLive preconditions are retained. State is fetched for the whole page at one explicit head/valid time. Builds run concurrently; commit submission waits for the preceding submission (not its ACK). The commit result must be `ok` before returning deliveries. Full independent delivery verification follows the timed window.
- `seedW0`: each ACK position must equal its reference command position before its receipt is logged. Scalar replacements wait for returned IDs. Logs/hash are updated in reference ACK-consumption order. Pending ACKs settle on failure. Every real seed must independently pass fresh G0 before qualifying.
- `counts-driver.ts` / `bulk-counts.ts`: copied H5 public batch history enumeration, complete stored journal entity set and stable head/count checks; runtime source binding retained. Sidecar completion is not semantic acceptance.
- `attempt*.sh`: only a fresh G0-PASS controller receipt can seal; stopped PostgreSQL exit must be zero, no overwrite, aggregate volume cap enforced. `attempt.sh` only retains a qualified 10k sealed seed. Inventories must be empty before releasing the lease. Cleanup/deadline records never grant semantic PASS.

The final report lists actual executions, remaining gaps and changed acceptance-pinned hashes. This audit describes code checks, not independent review.

## Retry and seed-probe additions

- `encodePublicationEvidence`: serializes only ACK-returned semantic deliveries/retry. It rejects business floats and retains integer canonical bytes; timing stays in separate metrics. This emits evidence, not PASS. The regression uses the actual fractional-duration failure shape.
- `w0-driver.ts` retry: G2 additionally compares the full normalized actual evaluation record to the independently expected O-DOMAIN output record. G5 receives records derived from those expected outputs, not the worker's actual record. Every comparison still happens after the last ACK and before gate promotion.
- `seed-probe.ts`: each window has a fresh UUID scope and fresh driver volume, exact ACK positions, complete store counts and full stored-world fingerprint versus a freshly run independently source-checked population oracle. Every window must MATCH and source hashes must remain unchanged before aggregate MATCH. It is N=50 calibration, not the required N=1,000/10,000 qualification. Raw command logs remain durable outside git.

Build/submission failures reject waiting publication tickets. An ACK failure can occur after later pages were already submitted; these in-flight outcomes settle during cleanup and are not promoted to a semantic PASS.

## Final candidate and warm-window additions

- The common-layout decoder branch checks all the same fixed columns before skipping dynamic index loops; the full validator remains the fallback, including the original legacy text decoder. A 204-column-mutation comparison and all 1,000 golden worlds/outputs/records pass. The production package is rebuilt before its own source-bound golden run. No gateway change is made.
- `beforeTimedWindow` runs once after every worker's ready handshake, before any page dispatch. The driver uses it to establish the paired live windows. Worker startup and the pre-window hook have separate telemetry. Both live arms exclude the same explicit 15-second generator warmup; measured offers/ACK counts and latency samples exclude that warmup, and matching refuses unequal warmup settings. The full raw warmup trace remains retained; no baseline cold-prefix p99 is substituted.
- `w0-seed-order.ts` wraps the public client method only to chain its existing `onSent` callback for the exact scope database/command claim. It changes no command, callback, cache policy or ACK result. Outside pending reference submissions it is a direct pass-through. A delayed-send/delayed-ACK unit test proves multiple ACKs remain in flight. Real source-bound position/fingerprint probes, not this test, decide seed qualification. This is a submission-order bridge, not the removed cache wrapper.
- `attempt-seed.sh` adds VM free-space observations and reserves active-plus-copy volume space plus 3.5 GB for driver/tools before sealing. Its resource observer stops after the database is cleanly stopped, before the bounded sealed copy. It retains only a fresh G0-qualified 10k seed; no resource or cleanup record creates semantic PASS.
- `gateway-floor.mjs` is a parse-only projection diagnostic bound to recorded bytes; it neither implements a gateway nor grants equivalence/performance acceptance. `analyze.mjs` derives observations only and preserves failed attempts.

## Post-DX-B8 attempt settings

The task-authorized merge imports `exp/DX-B8-head-lookup` at `19f5422d` (including its B7 gateway work); no H6-authored gateway changes or acceptance changes are made. The package is rebuilt and the 1k fingerprint is rerun before 10k.

The new seed calibration may use an explicitly reported 128-command serial prefix, included in command wall/rate, before the requested in-flight window. It changes scheduling only; all ACK positions and the complete independent fingerprint must still match. Gateway scan-stats are captured read-only before/after each own-container probe to expose ordering timeouts/late submissions. A serial fallback remains available; no failed window qualifies.

Publication capacity now defaults to two native frames in flight. FIFO capacity is acquired before staging a frame and released after its ACK/failure, while submission tickets preserve page order. The real publisher unit observes peak two concurrent mock ACKs and ordered state operations. The callback may queue outside capacity, and that queue wall is recorded, never removed from activation wall.

Scope audit: the initial H5-derived capture wrapper's unfiltered read-only `docker stats` included the idle `tx2-qlever-dev` resident. No lifecycle or write action touched that resident. Future wrappers collect stats only for the four exact owned engine containers. Original capture evidence is retained rather than rewritten.

## Evidence-only summaries

`seed-curve.mjs` preserves rounded cumulative progress rates and labels reconstructed interval timing approximate. `seed-journal.mjs` runs only after the attempt exit record exists, streams every logged command/ACK identity/position, records all mismatches, and binds exact input SHA256/bytes and its own source hash. Neither emits a population, fingerprint or acceptance PASS. `manifest.mjs` streams all raw evidence hashes with bounded buffers; its file/pin inventory is an inventory, not semantic acceptance.

`finalize.sh` requires the final attempt's exit record, derives receipts after settlement, inventories only H6-prefixed resources, and refuses remaining owned resources. It hashes evidence after writers have ended and independently runs `shasum -a256 -c`. Its own transient output stays outside the hashed tree to avoid self-reference. Empty inventories and matching hashes verify retention/cleanup only; they do not promote a gate or acceptance.
