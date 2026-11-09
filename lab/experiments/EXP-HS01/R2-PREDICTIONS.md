# EXP-HS01 round 2: predictions, written before any round 2 measurement

Basis: round 1 measured at 10k (REPORT.md): facts+index 107.37, journal+index 213.77, entity dictionary 28.09, txs 1.94, heads/claims/operations
17.55, frames 140.10, other 0.2 = 509.08 B per asserted fact. 12,568,376 ids, all TEXT, in 4,468,284 facts = 2.813 id values per fact.

| Change | Arithmetic | Prediction |
| --- | --- | --- |
| Frame retention by bytes, 64 MiB tail | 67.1 MB / 4.468M facts = 15.0 B per fact, plus a small frame index; replaces 140.10 | -125 B per fact |
| Ids as one SQLite integer (4 bytes at a counter under 2^25, 1 serial-type byte) instead of 27 bytes of TEXT | copies per fact: 2.813 rows x 2 (row key and id index) + about 1.0 journal change reference = 6.63; 22 bytes saved each = 146 B, about 160 B with page-fill overhead | -146 to -160 B per fact |
| Everything else unchanged | | 0 |

Predicted 10k: 509.08 - 125 - (146 to 160) = **224 to 238, stated as 235 B per fact (range 220 to 250), about 1.05 GB logical**.
Predicted 1k (the 64 MiB tail is a fixed 67 MB, so it weighs 152 B per fact at 1k): non-frame 366.5 - (146 to 160) + 152 = **358 to 372 B per fact, stated as 365**.
Bars: 300 B per fact and 1.4 GB at 10k. The prediction clears both with a 20% margin on B per fact.
Not changed: journal format (R47), entity/transaction dictionary encodings (the `ents` dictionary is 28.09 B per fact and is the next lever), value
widths (numeric refs, booleans and datetimes bind as 8-byte REAL in the untyped value column).
