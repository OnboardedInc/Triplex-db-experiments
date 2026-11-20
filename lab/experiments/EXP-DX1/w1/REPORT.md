A one-field replacement writes 23 database records. A three-field replacement writes 31.
Most of their bytes are row text, with a large share in the change journal.
The new option stores 21% fewer value bytes for one field and 19% fewer for three.
The matched Mac run reduced native compute by 18–20%. The half-time target remains open.
Every edit keeps its own receipt, historical values, and place in the feed.
Existing seeds can stay. Upgrade the reader before enabling the new writer.
A write already running can still hold up a quiet account. The time-budget study is in progress.
The server studies remain assigned to their existing drivers.

**P2/P6/P3.** Prior work, including rate assumptions and the initial server campaigns, is at `9ce599309`. The contract and frozen benchmark are untouched.
**Small layout.** `TX2_SMALL_ROWS=1` on strict lean scopes packs small single-claim saves. Existing row identity, validity, reference and position prefixes stay intact. The gateway stages literal clock fragments and strips reversible duplicate columns. The serial function inserts the authoritative position and clock. The same reader decodes both old and new rows, including pinned and grouped cuts.
**Census.** The [per-purpose datoms and bytes](small/CENSUS.md) distinguish request JSON, stored values and uncompressed EDN tuples. One/three-field fixture requests were 8,139/16,767 B. Stored values fell 2,907→2,285 B and 5,969→4,847 B with the same datom count.
**Datom/byte experiment.** Nine independent cells, 32 writes each, crossed 4/16/48 indexed string assertions with 2/8/24 KiB of exact value text. Median-cell native compute fit 0.396 ms fixed + 2.26 µs/datom + 0.22 µs/KiB. Durable peer round trip fit 6.45 ms fixed + 4.42 µs/datom + 71.7 µs/KiB. The byte axis is value UTF-8. Physical log bytes and the tail are separate.
**Matched layout.** Native compute medians at one/three facts were 1.250→1.030 and 1.425→1.135 ms. Authored function medians moved 0.635→0.485 and 0.855→0.570 ms. Gateway preparation rose 0.256→0.433 and 0.288→0.609 ms. The four interleaved arms retained 128 saves per width and option. The earlier sequential arms showed warm-up drift.
**Audit.** The layout parity gate crossed existing values, retirement, indexed by-ID reads, signed zero, references, escaping, claims, groups and intermediate feed/pinned cuts. The managed probe compares actual log and operation receipts and records the exact native slot, SQL durability settings, attempt, image and staged input hashes. The analyzer verifies row counts, positions, treatment order and input hashes before writing the summaries.
**Evidence.** See `SHA256SUMS` and `DX-W1/small4/` under the durable evidence root. These Mac measurements carry no performance verdict.
