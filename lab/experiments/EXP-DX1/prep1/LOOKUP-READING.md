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
