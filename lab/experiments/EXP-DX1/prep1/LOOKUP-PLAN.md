# Moving reads out of one database's serialized apply

## Dependencies

| Lookup | Treatment | Why the authoritative result stays exact |
| --- | --- | --- |
| Historical assertion prefixes | Move segment reads to gateway preparation and request native prefetch. Retain the authoritative historical answer in the transaction. | A different person can claim an ID or retire it after preparation. The check still uses the committing db-before, including any delta since the hint, and covers retired IDs. |
| Public operation and command | Keep the tape's short recent key range hot. Move any cold fetches for arbitrary IDs to preparation in a later trial. | Retry by either original ID still resolves to the original receipt. A native unique-value guard could replace an authored duplicate probe only if a definitive refusal re-enters the reference path without changing error precedence or acknowledging a draft. |
| Public journal identity | Move the segment fetch to preparation if cold in a representative profile. Keep the explicit native absence check. | A Datomic unique-identity upsert can attach ordinary journal rows to an existing entity. Native uniqueness alone cannot stand in for this check. |
| Original business owner upsert | Remove the duplicate AVET resolution using the already implemented numeric-owner mode. | The current owner ID in EAVT and the owner's revision CAS must both match. The identity can change at the same revision. |
| Owner revision | Move the known owner's EAVT segment fetch to preparation now. A dedicated revision-only entity could make these leaves resident even where deep row leaves are cold. | The native CAS still compares the committed predecessor revision. Scope, schema and erasure witnesses cover changes the owner revision cannot observe. A revision-only record would have to be updated by K, S and every fallback. |
| Exact row, retirement and cardinality checks | Move cold AEVT redundancy fetches to preparation once exact entity/value keys are known. Retain native checks on materialized rows. | The measured AEVT reads include new journal rows whose final entity numbers get assigned by Datomic. Ordinary rows remain native, and Datomic decides the identity and cardinality semantics. |
| Scope, function, erasure and latest clock | Keep on hot current records. The latest position and clock usually reside on the previous transaction. | They order every receipt and protect schema, erasure generation and feed transitions. A metadata transaction can require the reverse AEVT predecessor search. |
| Native uniqueness and redundancy batch | Keep native guards. Only request hints for segments the diagnostic can trace to preparation. | Asserting a unique value or a cardinality-one fact has native semantics. A batch fetch can satisfy several probes, and the segment should only be priced once. |

The first build will issue a lookup-only native hint for historical prefixes and the known owner's EAVT revision. It will execute no business command during hint generation. Those two checks account for 445 of 674 reads directly and as many as 505 if the lazy AVET iteration belongs to history. The candidate adds hints to numeric S so the numeric-only arm isolates the additional effect. A hint supplies a storage location and cannot waive a check. The serialized result still owns revisions, retirement checks, claim, receipt, clock, ordered journal and erasure. [Lookup reading](LOOKUP-READING.md)

## Identifiers and the SDK

The server field tape uses deliberately dispersed hashes for new assertions and journals. The default SDK generates the operation UUID, callers can supply command IDs and assertion IDs, and raw clients may also supply the operation ID. A timestamp prefix alone proves nothing about whether an ID was ever used. A future generated-ID lane could reserve a disjoint namespace and derive journal/assertion IDs from position and an ordinal, after proving that every issuer and the legacy path respect the namespace. The SDK would need to distinguish generated from caller-supplied IDs, retain the stable logical command ID on retry, and resolve that ID before creating a new command. Current callers can keep their IDs with the prefetch experiment.

## Apply budget

Use the measured server figures, with the same logical denominators. The `read-early.py` calculation takes the reported SQL and decode counters off each acknowledged native apply before aggregation. At 235 offered, the mean residual is 1.19 ms and median 0.75 ms. At 394, the mean is 2.64 ms and median 1.88 ms. This arithmetic retains stalls, CPU, uninstrumented work and any overlap between timers. It is a bound on the observed accounting improvement under a simple fixed-cost model.

| Removed share of the observed SQL plus decode time | Apply at 235 / 394 (ms per save) | Apply-only ceiling at 235 / 394 (saves/s) |
| --- | ---: | ---: |
| 0%, observed original S | 6.91 / 8.62 | 145 / 116 |
| 50% | 4.05 / 5.63 | 247 / 178 |
| 75% | 2.62 / 4.13 | 382 / 242 |
| 90% | 1.76 / 3.24 | 568 / 309 |
| 100% | 1.19 / 2.64 | 839 / 379 |

The 0.5 ms apply target also needs the remaining wall cost to fall. It would give an apply-only ceiling of 2,000/s. At 394 offered, apply and append together need a mean under 2.54 ms/save. One durable append per save can still be the limit even if every fetch moves off the apply worker.

Forecast for the first build, conditional on moving 60–75% of SQL and decode wall time, is 2.62–3.48 ms at 235 and 4.13–5.03 ms at 394, or apply-only ceilings of 287–382 and 199–242 saves/s. Numeric owner alone can save up to roughly 0.5 ms. These are alternatives to price with the same taped demand. If a 16 GiB cache removes 80–90% of the SQL and decoding, its conditional apply estimate is 1.76–2.34 ms at 235 and 3.24–3.83 ms at 394. The same-campaign 2 GiB control gets the same heap and CPU.
