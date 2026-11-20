# Detached protected assertions

With sealing enabled, a protected string gets a random AES-256-GCM key and nonce. The ordinary row and both assertion and retraction journals carry an opaque assertion reference. Datomic stores the encrypted body on a separate entity, with five datoms for its identity, owner, field, validity and body. The owner and assertion identity have value indexes. The body has no value index. The validity coordinate preserves the original floating-point bits. Encryption authenticates scope, assertion, owner, field and validity.

`storage/tx-data` prepares both representations before one Datomic transaction. It retains the scope sequence check from the ledger milestone. The file key is persisted with a synchronous write and atomic rename outside the Datomic data. `privacy/masked` decides whether to return a marker or decrypt an envelope. `erase/matches` finds whole-entity targets through the small protected-owner index. The ordinary row and full business history fall outside this lookup.

`POST /erase` publishes an identity journal and the current sequence. It calls neither `request-index` nor `sync-excise`. Background Datomic indexing can still affect the latency of the native append. The key-removal worker follows the durable published sequence and can retry it on restart. The measurement fixture requests immediate file deletion for the local proof. The default worker uses the R38 five-minute grace. [R38 design](../../../research/R38-erasure-design.md)

Native cleanup targets only the detached ciphertext body. The runner verifies the erasure sequence, exact identities and matched datom count before each job. Each job may match at most 2,000 datoms. Timed cleanup uses smaller batches with a pause between jobs. History and notice surfaces retain stable identities and typed markers.

## Measurement

The same deep seeds as the native study surround an edited subject with 415 replacements. Each size also runs 100 one-person requests and 100 requests for 100 people at one fresh protected assertion per target. Every round binds the identities to that round's verified save. The repeated targets retain the earlier erased assertions and can expose discovery cost as that history grows.

The probe reads a plaintext positive control from both current and held history before erasure. It scans decoded native assertion and retirement log transactions for the exact opaque references and the absence of the planted string. It requires the original marker after publication and requires independently absent key bytes while the native body still exists. The native cleanup verifies exact ciphertext absence afterwards.

Quiet traffic runs in a second account scope on the same physical stack. Two 500-save control blocks bracket the 500-save cleanup block. Four readers check the complete result at their original pin, and one feed reader checks replay offsets and value-free changes. A separate 500-save block replaces protected strings. The raw clocks distinguish operations wholly inside the cleanup request-to-sync window from the block totals. The transactor log supplies native index start and finish for a narrower comparison. The clock interval is bound before comparing host requests with guest timestamps.

The filesystem proof covers fresh reads from the lab key authority. Key wrapping, rotation and retirement of older authority snapshots remain open under the approved 15-minute rotation window. The prototype seals new protected strings in the lean gateway. R38 calls for sealing in the TypeScript kernel before the gateway. Client memory, separate work projections, and branch-specific retained staging data require further inventory work.

## Native smoke

The corrected `p2-fast-smoke-d` used 15,032 current facts. It recovered the planted clear value through the ordinary read route before publishing. The assertion and retirement were witnessed separately at native t 4319 and 4323. Their stored rows and journals had the opaque references. The clear value was absent from the inspected log strings. The 416-identity erase took 77.8 ms to acknowledgement and 89.5 ms to the first verified marker on the held handle. By 351 ms after acknowledgement, the key file was absent while the encrypted body still existed.

Two later jobs each matched and removed the exact bodies they were given, 128 and 490 datoms. Their native index builds took 806 and 155 ms. The first overlapped an eight-save traffic smoke. Its largest save exceeded both control maxima by more than 2.7×. The publication and quiet-account p99 comparisons require the full sample counts.

Earlier attempts are retained. The first hit a reserved Clojure symbol. The second was stopped while still waiting for admission. The third exposed a Datomic Iterable counting error. Its two log witnesses also resolved to the same native t. The final smoke checks distinct, acknowledged assertion and retirement positions. [Evidence checksums](P2-FAST-SHA256SUMS)

## Evidence checks

- `ciphertext-inventory!` verifies the original value through the real envelope, and checks the exact native assertion and retirement transactions for that identity. `key-state!` uses the current scope sequence and returns independent evidence about the key file and body.
- `ciphertext-cleanup!` verifies the exact identity list against the current ledger, counts its matching body datoms before submitting, and checks their absence from native history at the returned excision barrier. The scan excludes other attributes.
- `fast.ts` compares each publication against assertions from its own acknowledged save, checks the exact marker, and binds working request bytes to the transport callback. Readers compare the full pinned rows. Feed verification matches actual positions to their native transaction IDs for each measured block. The run identity binds source, slot, image, and fresh scope.
