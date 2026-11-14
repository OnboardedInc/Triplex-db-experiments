# Native transaction shape

Source 652984e905814517e19314af5708793f2bc0cb85; 64 exact operation/position-bound small transactions from tx2-dxt1-p5-verdict-c-zero. Census runs after timed work; no transaction data is changed.

Actual log datoms; string UTF-8 and nonstring EDN value bytes. EDN datom bytes are an uncompressed representation, not physical Fressian/storage bytes.

| Attribute | datoms/tx | added/tx | retracted/tx | value UTF-8 bytes/tx | EDN datom bytes/tx |
| --- | ---: | ---: | ---: | ---: | ---: |
| :triplex.entity/row | 39.36 | 38.31 | 1.05 | 16784.14 | 21067.73 |
| :triplex.entity/id | 2.00 | 2.00 | 0.00 | 53.00 | 169.00 |
| :db/txInstant | 1.00 | 1.00 | 0.00 | 37.00 | 88.00 |
| :triplex.tx/operation-id | 1.00 | 1.00 | 0.00 | 36.00 | 100.00 |
| :triplex.claim/tx-id | 1.00 | 1.00 | 0.00 | 30.00 | 90.00 |
| :triplex.tx/id | 1.00 | 1.00 | 0.00 | 30.00 | 84.00 |
| :triplex.claim/command-id | 1.00 | 1.00 | 0.00 | 17.84 | 82.84 |
| :triplex.tx/max-recorded-at | 1.00 | 1.00 | 0.00 | 16.84 | 81.84 |
| :triplex.tx/recorded-at | 1.00 | 1.00 | 0.00 | 16.84 | 77.84 |
| :triplex.claim/tx | 1.00 | 1.00 | 0.00 | 14.00 | 69.00 |
| :triplex.tx/journals | 1.00 | 1.00 | 0.00 | 14.00 | 72.00 |
| :triplex.entity/rev | 4.09 | 3.05 | 1.05 | 12.06 | 246.45 |
| :triplex.journal/position | 1.00 | 1.00 | 0.00 | 3.00 | 66.00 |
| :triplex.tx/position | 1.00 | 1.00 | 0.00 | 3.00 | 61.00 |

Totals: 64 native transactions, 56.45 actual log datoms/transaction, 17067.73 value-representation bytes and 22355.72 EDN datom bytes/transaction. Row texts contribute 98.34% of value bytes. These are exact UTF-8/EDN observations, not the transactor's compressed/Fressian byte count; the earlier roughly 12-KB physical-log observation is not remeasured here.

Only 2.00 identity datoms per transaction reach the applied log; identical existing identity assertions are suppressed by Datomic. This collector did not retain the identity values, so their journal/domain role is not inferred. Removing redundant identity submissions therefore has no demonstrated log-byte saving; avoiding their native unique-index lookups remains a possible CPU change. X3 kept no additional stored-layout or transaction-function read/byte optimization; the server-clock function change is covered by X2.

The current default does not enable transactor JFR/native IO counters, so serial-point read counts/times are not freshly measured. Source inspection implies one history identity-range seek per new row assertion (38.31 new row datoms/transaction in this sample); that is an inference, not a native counter. Revision reads still use EAVT. The RE1 estimates (~0.5 ms mean for fewer serial reads, ~0.3 ms mean and ~0.8 Postgres commits/transaction for a smaller layout) remain unmeasured estimates. Short permanent row IDs or replacing repeated journal row text requires a layout version and rebuilding sealed seeds; neither was implemented. Next trace: actual row-attribute subcategories and per-helper native seek counts/time, before an AEVT-only control/candidate measurement.
