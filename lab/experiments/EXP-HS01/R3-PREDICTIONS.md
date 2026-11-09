# EXP-HS01 round 3: predictions, written before any round 3 measurement

Basis (round 2, 10k, REPORT.md section 5, B per asserted fact, 4,468,284 facts): journal+index 97.55, facts+index 56.64, entity dictionary 28.09,
heads/claims/operations 17.55, frames 15.25, transactions 1.94, other 0.04 = 217.06 (W0 ids); 308.09 with ULID-shaped ids.
Inputs read from the round 2 1k store (same seed profile, 187,913 entities, 42,775 transactions): entity names average 21.8 bytes; the `ents`
table plus its unique name index cost 65.5 B per entity (31.0 table, 34.5 index); 145,118 of 442,410 facts and 186,889 journal rows hold a
numeric reference stored as an 8-byte REAL; W0 facts hold no `number` or `datetime` values.

| Change | Arithmetic | Prediction (B per fact, 10k) |
| --- | --- | ---: |
| Entity dictionary: replace the unique name index (34.5 B per entity) by a WITHOUT ROWID `(hash32, eid)` table (about 17.5 B per entity incl. page fill); 1.908M entities / 4.468M facts = 0.427 entities per fact | (34.5 - 17.5) x 0.427 | **-7.3** |
| Numeric refs as INTEGER (3-byte serial type at eids below 2^23 instead of 8-byte REAL): 1.466M fact refs and 1.891M journal changed-entity refs x 5 bytes x 1.15 page overhead | facts 1.9; journal rows 2.4 (only when the journal option is off) | **-1.9 facts, -2.4 journal rows** |
| Journal record (option ON): one record per transaction (table cell about 48 B, id index about 20 B, `txs(tx)` index about 17 B = 85 B per transaction, 10.28 facts per transaction = 8.3) plus an explicit change list for the 0.45% of transactions with a retraction (0.2) | replaces journal+index 97.55 (or 90.9 after the ref change) | **-97.55 + 8.5** |

Predicted 10k totals (range in brackets):

| Ids | Journal option | B per fact | Logical bytes | Reasoning |
| --- | --- | ---: | ---: | --- |
| W0 deterministic | OFF | **205.4** (200 to 211) | 0.918 GB | 217.06 - 7.3 - 1.9 - 2.4 |
| W0 deterministic | ON | **118.7** (110 to 128) | 0.530 GB | 217.06 - 7.3 - 1.9 - 97.55 + 8.5 |
| ULID-shaped (consecutive runs) | OFF | **296.5** (289 to 303) | 1.325 GB | 308.09 - 7.3 - 1.9 - 2.4: borderline against the 300 B bar |
| ULID-shaped (consecutive runs) | ON | **149** (140 to 160) | 0.666 GB | journal id copies (43.5 B) and journal refs (12 B) disappear; the 24 B per fact of 16-byte fact ids stays; record index key grows by 12 B per transaction (+2.4) |

Per-term predictions (W0): entity dictionary 20.8 (from 28.09); facts+index 54.7; journal 97.55 -> 90.9 (OFF) or the record tables 8.5 (ON);
heads/claims/operations 17.55, frames 15.25, transactions 1.94 unchanged. ULID-shaped records assume ids consecutive inside one transaction
(a monotonic ULID factory inside one millisecond); a clock tick inside a transaction's journal ids sends that transaction to verbatim rows
(about 55 B per row) and is reported as a fallback rate, not predicted.
Gates (not predictions): every read answer unchanged against the round 2 worker and against option OFF; zero silent value change.
