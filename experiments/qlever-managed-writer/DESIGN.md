# Experimental managed writer checkpoint

Private feasibility work. No backend or service is wired to this design. Goal 7
remains open; direct native HTTP writes remain failure-atomicity incompatible.

## Boundaries and contracts

Triplex prepares one native SPARQL MODIFY containing its operation marker,
assertions, claims, journal and metadata. A globally owned broker admits every
native modification, including recursive scratch, rebuild and maintenance.
QLever owns all facts and persisted snapshots. The broker's append-only intent
journal records operation lifecycle, not a replacement fact database.

`PreparedModify` ephemerally carries operation ID, attempt ID, immutable logical
payload digest, one trusted adapter-generated MODIFY, and separate native marker,
footprint and complete-proof queries. `RecoveryIntent` retains only identities,
digests, expected count and bounded selectors. The request also has a native-attempt digest. Reusing one attempt
with different bytes is an identity error. An explicit new attempt is allowed
only after a previous attempt was proved not committed in a closed/reloaded
epoch; the logical digest must match.

`NativeWorker` provides fence verification, bounded MODIFY submission, complete
marker/fact verification, process termination with closed-epoch proof, snapshot
fsync, and restart/reload with a new epoch. The eventual owned container must
require a broker-only access token and omit `--no-access-check`; client
applications cannot receive the native update token. Every modifying route must
use this broker. A process-local queue or per-scope lock cannot establish this.

## Data flow and failure states

1. Acquire `fcntl.flock(LOCK_EX)` on a persistent global lock file. Never unlink
   the lock file: different inode locks would break cross-process ownership.
2. Read and validate the complete append-only journal. Torn, corrupt or
   contradictory records hold the broker closed. Resolve any prior unfinished
   operation before admitting another modification.
3. Verify native ownership/token fencing, basename and port. Append the bounded recovery intent and
   fsync the journal before network submission. Fsync the directory when
   creating journal/lock files. Enforce bounded intent/journal sizes.
4. Submit the single MODIFY. On any error, cancellation or uncertain response,
   quarantine all writes while still holding the global lock. Do not inspect a
   marker in the potentially poisoned mutable worker as proof of completion.
5. Terminate the owned worker and verify its epoch is closed. Fsync the native
   `.update-triples` file and containing directory, then restart from that file.
   Never issue a following modification before this reload. Failure to stop,
   sync, start or verify the reloaded state remains outcome unknown and closed.
6. Resolve the complete marker and payload proof in the reloaded snapshot.
   Present-and-complete means committed. Absent means not committed only with
   this closed-epoch/reload proof. Partial or inconsistent state remains closed.
7. On ordinary success, verify complete native proof, fsync the native snapshot
   and its directory, then append/fsync the committed resolution before ACK.
   A lost ACK can be resolved from the durable intent identity. Preserve all
   journal records, snapshots, temporary files and native datasets.

Queries may continue to read an old published QLever snapshot during normal
modification. Quarantine/restart can make reads unavailable. The broker must not
advertise zero downtime, distributed ownership, physical power-loss durability
or transactional integration until those behaviors are separately demonstrated.

## Model and fault-test packet to implement

Use a file-backed model worker with distinct mutable, published and durable
states. Model native failures before apply, after partial mutation, before
writeback, after atomic rename before ACK, and after broker intent/commit fsync.
Use actual child-process death (`os._exit`) to show a second broker recovers an
unfinished intent before a next modification. Exercise two independent broker
processes against the same kernel lock and prove their apply intervals never
overlap. Include refusal to stop, snapshot fsync failure, torn journal, marker
without complete payload, changed logical digest and direct-token bypass.

After the isolated query-layout wave releases its containers, run native trials
only on another copied owned QLever dataset, with token fencing and unchanged
aggregate resource/disk admission. Native cancellation during mutation,
unwritable snapshot publication and process death after rename before ACK are
separate experiments. Verify whole marker/facts/claims/journal state, prior
acknowledged state and post-reload source cuts. No model result qualifies these
native fault cases or the full Triplex runtime integration.
