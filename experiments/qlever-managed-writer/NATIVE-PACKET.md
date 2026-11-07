# Private native fault packet

This packet is prepared offline. It has not provisioned a worker or proved native
failure atomicity. The current public query qualification slot has priority.
The existing 27 lifecycle tests and three packet tests are offline evidence.

The future native trial uses three new datasets copied from the **closed** owned
original index. Each container is retained after stopping. Only one trial runs
at a time: 2 GiB memory/swap, two CPUs, native 512M allocation, four threads, 64M
cache, 32M single cache entry and planning budget 100. All other QLever owners
must be stopped. XTDB may remain under its declared profile. Three copies,
temporary snapshots, images, writable layers, logs and all prior owners remain
charged against the existing budgets; the packet reserves an additional 1 GiB.

Each native process runs as UID/GID 1000, without capabilities, using the pinned
QLever 0.6.0 image. Updates require a private native access token. Missing-token
and wrong-token INSERT probes must actually fail before any baseline commit.
The token is stored in a mode-0600 file and passed by environment to Compose.
It appears in Docker's native process arguments; resource/inspect evidence must
redact it. Docker administrators remain trusted. No unrestricted update route,
scratch writer or maintenance process may bypass the one global broker lock.

Prepare a new immutable packet, without Docker calls:

```sh
python3 experiments/qlever-managed-writer/native_faults.py \
  --prepare .qlever/managed/native-packet-20261106-01
```

This creates `packet.json`, the exact single-MODIFY requests, independent full
proofs, private tokens and three Compose files. It creates no database copies.
The packet declares concrete owner names/binds and freezes harness/input hashes.
Register those names with the common resource admission inspector before the
native window. That inspector must redact `--access-token` values. Do not use a
generic existing owner to hide the copies or their reserved logs.

Only after root assigns the exclusive native-fault slot and the declared profile
passes admission, run:

```sh
python3 scripts/triplex-lease.py --backend qlever \
  --purpose managed-writer-native-faults --wait-seconds 30 -- \
  python3 experiments/qlever-managed-writer/native_faults.py \
  --execute .qlever/managed/native-packet-20261106-01/packet.json \
  --admission-profile qlever-managed-native-faults
```

Execution first rejects active QLever owners and an undeclared resource profile,
then verifies a closed source and exact checksums before each fresh copy. Existing
destinations are never reset. Unique request evidence, compact coordinator
journals, native logs, closed/reloaded epochs and native snapshot files remain.

Every case first receives an acknowledged old operation, including full immutable
assertion payloads, an operation marker, a command claim and a receipt. Independent
operation-scoped queries check every expected RDF row by count and digest. A
marker alone is insufficient. The coordinator stores bounded selectors and
digests; facts remain in QLever. A successful next commit and the complete old
payload must be demonstrated after recovery.

| Case                         | Actual condition created                                                                                                                                                  | Required observations                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cancellation                 | Register a native single-MODIFY query with a costly bounded WHERE, observe its query ID, then send a real websocket cancellation.                                         | Keep HTTP response, cancellation send, closed/reloaded proof if unknown, complete operation proof, prior ACK and next commit. Query disappearance/client timeout alone proves no stop or rollback. Mutation-phase interruption remains unqualified unless the native trace identifies that phase.                                                                    |
| Snapshot publication failure | Actual UID-1000 server, copied directory mode 0555, and a real UID-1000 write attempt returning permission denied. Submit the single-MODIFY request under that condition. | Keep native HTTP error body and logs identifying persistence/publication failure. Close the native epoch before restoring only that fixture's directory mode. Fsync/reload the old snapshot; prove absence of marker **and** attempted-row footprint, complete prior ACK and correct next commit. A successful submit means the intended fault was not demonstrated. |
| Broker loss after rename     | Real broker child exits with `os._exit(77)` after successful native HTTP apply and changed native snapshot hash, before broker fsync/outcome/ACK.                         | Preserve the phase witness and durable compact intent. A different broker process closes the epoch, fsyncs file/directory, reloads and resolves complete marker/payload proof, then accepts a correct next commit. No MODIFY body is replayed from the journal.                                                                                                      |

The direct-mode multi-operation partial-request counterexample remains a retained
control (`qualification/evidence/qlever-native-capabilities-1793974911301.json`).
Pinned-source inference about single-MODIFY failure publication is recorded in
`qualification/evidence/qlever-single-modify-source-audit-20261106/`. Neither is
relabelled as an empirical result of this unrun managed packet.

The native requests here are append-only controls with independent marker/claim/
receipt rows. They do not qualify the public Triplex callback/CAS mapping,
arbitrary callbacks, full temporal semantics, multi-host fences, or power-loss
durability. The final result deliberately says review required; an independent
review must confirm the actual fault and complete proofs before promoting a
narrow native claim. Goal 7 remains open.
