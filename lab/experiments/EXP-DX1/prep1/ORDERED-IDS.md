# Ordered assertion IDs without renaming a command

The Datomic SDK's normal runtime allocates assertions and journal facts with a monotonic ULID factory. Its journal entity uses `_tx/` plus a ULID. The storage adapter accepts the IDs already allocated by the caller, and the normal write result contains those same IDs. The benchmark's older command builder hashes assertion and journal identities. [Default SDK allocation](../../../../packages/core/src/utils/id.ts) · [Adapter](../../../../packages/datomic/src/DatomicStorageAdapter.ts) · [Field workload](../w1/group/workload.ts)

I chose client-ordered IDs, option (c). Assigning IDs from a server position would change the IDs that current callers choose, keep in preconditions, and receive in a transaction's result. Preserving those strings as aliases would still require an exact global check for the alias. A future negotiated protocol could allocate all IDs on the server and return the original assigned IDs on replay. It would need to define the handling of preassigned assertion and journal references. This experiment keeps the public identity contract.

`orderedSaveIdentity` allocates a 24-character prefix in the ULID alphabet and reserves the last two characters of each 26-character assertion ID for its ordinal. The journal entity uses `_tx/` plus the prefix and `00`. A caller retains the token and assertion order when it saves or retries the command. It keeps its existing command claim and can read the committed journal through that claim after a lost reply. A process advances the prefix when successive ULIDs share its first 24 characters. Several processes or late resends can arrive out of order, and an idle writer or long-delayed command can still hit storage. Those situations affect locality only.

The gateway recognizes the exact contiguous block and the matching journal entity before it chooses the ordered path. A client cannot provide unchecked bounds. The serialized function seeks the containing interval in historical AVET and compares actual assertion identity prefixes. The result covers earlier and retired rows across every owner. An unrelated value in a lexical gap does not reserve one of the submitted IDs. A bounded scan falls back to the original exact per-ID checks if it finds an unusually crowded interval. The journal still has a serial identity check and ordinary native uniqueness handling. Native transaction and journal rows remain queryable using their original layouts.

Existing IDs, including caller-assigned or nonordered IDs, continue to use the previous logic. A dispersed legacy interval can cost its covering probe plus one historical AVET seek per new ID when other rows occupy the interval. A seek can hit memory or load storage. The earlier diagnostic charged 3.65 SQL reads per save directly to that check, plus 0.63 under the lazy AVET iterator. A retry of an already committed command resolves through the original operation or claim and persists no new IDs. A fresh command attempting to reuse a retired ID still runs the historical check.

## Owner revision at the server cache size

The copied single-gateway server arm had a 2 GiB transactor object cache. All the durably acknowledged S saves in these cells carry their native storage counters. Since the revision CAS uses EAVT, the total EAVT loads across all work in a save give an upper bound on its storage reads. An EAVT load can also come from a different native check.

| Gross offered/s | Prepared acknowledgements | EAVT loads | Saves with any EAVT load | EAVT loads/save |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 7,200 | 313 | 273 | 0.043 |
| 235 | 20,489 | 3,085 | 2,983 | 0.151 |
| 394 | 16,251 | 3,877 | 3,505 | 0.239 |
| 620 | 20,377 | 3,760 | 3,531 | 0.185 |

At 235 and 394, at least 85.4% and 78.4% of saves did their CAS without an EAVT storage fetch. The earlier 32 MiB diagnostic with disjoint owners measured 0.99 CAS fetches/save. I kept the existing owner revision for this round. The server tape revisits people and cannot establish a cache-residency guarantee for a million uniformly touched owners. A new revision entity would also need atomic updates on grouped, legacy and prepared writes. [Bound archive reading](SERVER-READING.md) · [Checksums](SHA256SUMS)

The first native implementation produced 28-character assertion IDs. The protected regression found the raw journal masked them correctly but the SDK dropped the typed change because the core TripleId brand requires 26 characters. The 26-character format above preserves the existing contract. The first diagnostic is retained as failed-format evidence. [Checksums](SHA256SUMS)
