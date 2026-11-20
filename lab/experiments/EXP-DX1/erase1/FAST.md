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

## Matched scale measurements

These are request-to-durable-acknowledgement times on the Mac, in milliseconds. Publication precedes the reply. The aged column reports the one owner with 416 protected versions and includes the old-pin marker follow-up. The p99 columns use 100 fresh assertions per one-person arm and 100 requests per 100-person arm. Each batch gives every target one new assertion, and earlier rounds leave retained identities.

| Seed facts | One p50 / p99 | 100 p50 / p99 | Aged ACK / old-pin marker | Original key absent within (ms after aged ACK) |
| ---: | ---: | ---: | ---: | ---: |
| 94,848 | 13.4 / 79.7 | 44.7 / 114.2 | 55.0 / 64.6 | 15.7 |
| 993,335 | 12.8 / 38.4 | 48.7 / 124.0 | 52.3 / 58.9 | 119.3 |
| 3,988,500 | 22.3 / 51.8 | 73.6 / 211.1 | 256.8 / 267.2 | 579.2 |

The first two attempts used `856c4c9ae`. The largest used `c2df2e3e1`. The manifests differ only in the Git revision and the prepared Linux launcher, which the local runner never loads. The raw transactor logs show all nonempty excisions after the final publication. Ordinary index activity may run concurrently. The API calls no index function before acknowledging. At 4M, the one aged owner took 257 ms. The one aged observation at each size leaves aged p99 open. [Evidence checksums](P2-FAST-SHA256SUMS)

| Seed facts | Save p99 ratio before / after | Read p99 ratio before / after | Feed p99 ratio before / after | In-index saves / max ms |
| ---: | ---: | ---: | ---: | ---: |
| 94,848 | 1.25 / 2.61 | 0.80 / 1.61 | 0.78 / 1.74 | 71 / 59.9 |
| 993,335 | 1.06 / 1.34 | 0.70 / 0.88 | 0.67 / 1.00 | 359 / 200.0 |
| 3,988,500 | 1.50 / 1.28 | 0.55 / 0.65 | 0.55 / 0.72 | 407 / 388.6 |

Each control, cleanup and protected-save block verified 500 saves on the native feed. Traffic cleanup used 128-body jobs and a 150 ms pause. In-index samples fit wholly inside the transactor's native build interval, with the clock uncertainty trimmed from both ends. All 10,516 bodies were eventually verified absent at each size. Later jobs matched up to 2,000 datoms. At 4M, three live jobs covered 384 bodies and six later jobs removed 10,132. The first 128-body native builds took 0.92, 2.97 and 5.68 s and wrote 181, 457 and 467 leaf segments. Each first build logged 49,125 datoms of index input. The 128-body cleanup limit bounds the matched ciphertext, while those builds also carry ordinary pending index work. At 4M, quiet save p99 was 50.0 and 58.6 ms in the controls and 75.1 ms in the cleanup block. The save ratio exceeded 1.25× against the later control at every size and against both controls at 4M. The different control tails make the magnitude uncertain.

| Seed facts | Plain save p50 / p99 before and after (ms) | Protected save p50 / p99 (ms) | Extra SQL value bytes per save vs later control |
| ---: | --- | ---: | ---: |
| 94,848 | 6.95 / 28.04 and 6.66 / 13.42 | 9.55 / 22.55 | 262 |
| 993,335 | 7.19 / 27.47 and 6.92 / 21.74 | 8.99 / 23.05 | 258 |
| 3,988,500 | 13.00 / 49.97 and 12.97 / 58.63 | 15.90 / 48.87 | 262 |

The protected replacement added five native datoms, about 260 aggregate SQL value bytes, and one separate file with 32 key bytes. The median save cost rose by 1.8–2.9 ms against the bracketing controls. The file adds its filesystem allocation and synchronous persistence cost. Median request bodies stayed within 2 B of 4,921 B. The SQL measurements count aggregate KVS values. Earlier quiet or indexed material can still affect the storage deltas. This is the cost of the file-based prototype.

The full attempts are `p2-fast-700m`, `p2-fast-6250m` and `p2-fast-25000w`. Each used a fresh reserved stack and removed its two anonymous volumes. The admission logs and the independent metric derivation are under `p2-fast-admission` in the durable evidence. The comparison is diagnostic. Run a fresh local attempt with `node lab/bin/heavy.mjs --label DX-ERASE1 -- node lab/bin/engine.mjs erase1 --holder DX-ERASE1 --run fast --people 25000 --out fresh-detached-scale`.

## Evidence checks

- `ciphertext-inventory!` verifies the original value through the real envelope, and checks the exact native assertion and retirement transactions for that identity. `key-state!` uses the current scope sequence and returns independent evidence about the key file and body.
- `ciphertext-cleanup!` verifies the exact identity list against the current ledger, counts its matching body datoms before submitting, and checks their absence from native history at the returned excision barrier. The scan excludes other attributes.
- `fast.ts` compares each publication against assertions from its own acknowledged save, checks the exact marker, and binds working request bytes to the transport callback. Readers compare the full pinned rows. Feed verification matches actual positions to their native transaction IDs for each measured block. The run identity binds source, slot, image, and fresh scope.
