# Where the writer fetches storage

The earlier server run establishes the scale of the problem. At 235 offered saves/s, S averaged 11 SQL reads and 5.71 ms of SQL plus decoding per save. Busy K averaged 0.04 SQL reads and 0.19 ms of total apply per save. Both arms use a single database. [Server reading](SERVER-READING.md)

## Lookup inventory

An SQL read is a persisted segment fetch reported by Datomic. An EAVT or AVET counter alone records an index operation, including memory hits. K here means a real materialized group through `triplex.group/apply-v1`. K singletons call the normal commit function and have different reads.

| Lookup | Index and key | Key scope | Where K does it |
| --- | --- | --- | --- |
| Operation already committed | AVET `:triplex.tx/operation-id`, request operation string | Newly presented or a retry, database-wide | Gateway checks during speculative apply. Native unique-value validation still runs. |
| Command already claimed | AVET `:triplex.claim/command-id`, command string | Client-chosen or SDK-generated, database-wide | Gateway checks during speculative apply. Native unique-value validation still runs. |
| Journal absent | AVET `:triplex.entity/id`, public transaction entity ID | New per command, database-wide | Gateway checks during speculative apply. Native resolution and unique identity handling still run. |
| Assertion IDs never used | Historical AVET `:triplex.entity/row` ordered by the row text's length and assertion ID prefix | New IDs, globally reserved across owners and retired rows | Gateway checks during speculative apply. |
| Scope policy and erasure generation or ledger | EAVT, scope entity number plus each witness attribute; AEVT for any `:db/excise` | One scope and the database-wide excision flag | Gateway checks during speculative apply. |
| Function identity and install transaction | Schema dictionary, then EAVT function entity and `:db/fn` | Global, rarely changed | Gateway runs the reference function. Native dispatch still resolves the basis-fence function. |
| Prior write position and maximum clock | EAVT at the latest native transaction number, reverse AEVT `:triplex.tx/position` after metadata writes | Global, usually just written | Gateway stamps every group member in order. |
| Expected owner revision | Built-in CAS, EAVT owner entity number and `:triplex.entity/rev` | Per person | Gateway checks and stamps it during speculative apply. |
| Owner identity for incoming business datoms | Native identity AVET lookup under `:triplex.entity/id` in original S. Numeric mode uses EAVT at the known owner and checks its public ID. | Per person | Materialized datoms use the existing owner number. |
| Exact retired row and retirement marker | EAVT owner, attribute, previous row text or prefix | Per person | Gateway proves predecessor and returns concrete datoms. S also resolves predecessor bytes during planning. Native redundancy checks still see the concrete retraction. |
| Native identity-upsert prefetch and resolution | AVET unique identity values, then remap tempids. Includes the original S owner and the new journal. | Per person and globally new | New journal IDs still require native handling. Existing owners arrive numeric. |
| Native uniqueness, redundancy and constraints | Shared fetch of AVET leaves for unique identifiers and position, EAVT exact-value or cardinality checks for adds and retracts. Includes position and the same operation, command and journal keys independently of authored checks. | One batch, both newly presented keys and existing rows | Native in both arms. Several keys can share a fetched segment. |
| Native key and function dispatch | Lookup refs go through AVET. Internal schema lookups and EAVT hook resolution load only when needed. | Depends on transaction data and installed functions | Native in both arms. |

The tape hashes journal entity and assertion IDs. Its operation ID and claim are the same fixture string with a window label and ordinal, so the hypothesis about widely scattered values applies most directly to historical assertion IDs and journals on this tape. The standard adapter generates a random operation UUID and accepts explicitly supplied command and assertion IDs. [Field tape](../w1/group/workload.ts) · [Prepared guard](../../../../packages/datomic/gateway/src/triplex/gateway/subject_save.clj) · [Grouped writer](../../../../packages/datomic/gateway/src/triplex/gateway/group.clj)

## SQL diagnostic

The pinned build accepts at least 32 MiB of object cache and 8 MiB of memory-index threshold. Two fresh 184,320-row seeds, at 160 rows per person, produced 95 saves in 12 K groups and 96 prepared S saves in 96 native transactions. The K singleton is outside the table. Every worker sample joins to the exact durable database and native t by the apply interval. The producer checked journal changes and stored times, operation receipts and business rows at adjoining pins. Both native read counters reconcile with the HTTP readbacks.

Each cell is **SQL reads / logical save · percent of instrumented apply wall**. A dash denotes an absent check. CPU PSI avg10 ranged from 9.56% to 15.93% in K and 9.67% to 23.85% in S. Total instrumented apply averaged 2.97 and 38.55 ms/save, respectively. These wall shares include instrumentation and descheduling. The 28.7% K share of storage-free native AVET checks illustrates their timing noise. Counts are the durable mechanism evidence here.

| Lookup | Index | K | S |
| --- | --- | ---: | ---: |
| Historical assertion prefixes, measured API call | Historical AVET, row text prefix | — | 3.646 · 20.23% |
| Owner revision CAS | EAVT, owner number and revision attribute | — | 0.990 · 7.59% |
| Authored operation and claim checks | AVET, one application string each | — | 0 · 0.08% |
| Authored journal absence | AVET, journal public entity ID | — | 0.021 · 0.31% |
| Scope flags and function revision | EAVT and schema dictionary | — | 0 · 0.45% |
| Excision witness | AEVT, excision attribute | — | 0.115 · 2.54% |
| Logical position and clock | EAVT, native transaction and scope clock | — | 0.052 · 0.24% |
| Native row/retirement redundancy | AEVT, attribute and entity/value | 1.116 · 51.86% | 1.135 · 13.77% |
| Native revision and ID redundancy | AEVT, attribute and entity/value | 0 · 0.47% | 0.229 · 0.25% |
| Native identity lookup | AVET, owner/journal public IDs | 0 · 0.87% | 0.146 · 2.63% |
| Other native unique/redundancy point probes | AVET and EAVT, operation, command, position, txInstant | 0 · 28.80% | 0.031 · 0.30% |
| Native validator, prefetch dispatch, and hook resolution | Native batch above, schema and AVET validation | 0 · 3.91% | 0 · 10.52% |
| Unscoped AVET iterator under native injection | AVET, lazy iterator after API return | 0 · see remainder | 0.625 · see remainder |
| Unscoped EAVT loading under native injection | EAVT dir, datoms and entity access | 0 · see remainder | 0.031 · see remainder |
| **Total** | **Native reads / save** | **1.116** | **7.021** |

All 106 K reads are attributed to AEVT row redundancy, including two retirement-marker reads. The S trace assigns 611 of 674 SQL reads to timed checks, 60 to an AVET iterator under transaction injection, and three to native EAVT stacks whose entity keys were unavailable. The remaining wall shares, 14.1% for K and 41.1% for S, include those unscoped calls, core apply and observer overhead. The unqualified physical counter callbacks are excluded because they can count the same reads again.

History alone accounts for 350 of 674 S reads (52%) within its named API span. The additional 60 lazy AVET iterator reads are consistent with that range continuing after the API returns. In the earlier trace, history accounted for 418 of 735 (57%) within its named API span. Identity lookup, including native resolution of the person and journal, is a much smaller contributor here. This identifies scattered new assertion IDs as the largest cold-read source in the fixture. It leaves the precise bare-metal distribution open.

The first runs exposed two unsupported cache settings, a bulk frame cap and a missing join between apply workers and append threads. The next attempt hit Datomic's primitive counter arity and was corrected. The failed runs and first complete trace remain in `evidence/DX-PREP1/p8-lookup-sql-01` through `p8-lookup-sql-08`. [Checksums](SHA256SUMS)
