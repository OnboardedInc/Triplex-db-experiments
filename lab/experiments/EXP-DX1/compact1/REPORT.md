The packed edit can be found by its owner, command or position.
Searching by a field across people needs an extra index.
The 11-record write leaves out the stored journal rows that raw queries use.
Putting those rows back takes 18 records for a one-field replacement.
An eight-save batch can share the cost of publishing a search index.
Deep accounts need isolation at the storage layer.
The earlier speed measurements compared two paths that do different work.
Build the incremental writer first and make whole accounts movable between databases.

**North star.** P2 durable field saves, with P1/P3/P4 exact historical and current reads and P5 atomic publication. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
**Review.** The 11-datom primitive drops required raw facts. The matched-speed claim needs stronger comparable paths. Checkpoints address the measured replay slope. [Finding-by-finding response](REVIEW-RESPONSE.md)
**Query contract.** The ledger lists direct reads, the targeted W0 projection, general queries it cannot answer, and the Q107-S stored journal variant. [Query surfaces](QUERY-SURFACES.md)
**Floor.** 1,440 factorial and 3,840 burst transactions matched the requested bytes and durable log. Fixed native apply was 0.160 ms, plus 1.74 µs/datom, 2.49 µs/KiB and 0.70 µs/warm index seek. Durable peer coefficients were 2.136 ms, 4.80 µs, 67.82 µs and 1.33 µs. [Floor and settings](FLOOR.md)
**Ceiling.** The first baseline reached 1,696–2,790 minimal tx/s at depth 64. Native apply occupied 22–25% of the one-member deep bursts and up to 80% in a larger group. Across three settings the highest bare rate was 68,471 simple members/s with 128 per native transaction. Two indexing threads led the eight-member blocks and the larger threshold deferred index adoption. The baseline repeat drift limits attribution. [Floor and settings](FLOOR.md)
**Layout.** Event, claim, server clock, owner and account position are durable together. The subject chain reconstructs exact validity, receipt, retirement, history and both read paths. Grouping saves account-head replacements and one native instant. [Obligations](LAYOUT.md) · [Native size census](CENSUS.md)
**SQL gate.** Both readers matched independent W0 on 71 cases and 213 checked responses. The fresh peer recovered the exact receipt after the dropped group result. The SDK checked 11 requests. [Methods and evidence](MEASUREMENTS.md)
**Matched timing.** At 64 outstanding, compact finished 4.4× and 6.2× as many saves/s within the two matched Mac blocks. Native apply used 222–252 µs/save and WAL used 230–236 B/fact. At 1, 8 and 32 outstanding, the paired rate gains were 1.21–1.41×, 3.69–4.83× and 2.59–4.19×. [Write and read tables](MEASUREMENTS.md)
**Cost.** The Mac loaded 16M facts in 6m 25s plus 3s of final indexing, with 866 MB of WAL. Cold current reads for one-event subjects took 4.18 ms p50 and 194.44 ms p99, with one outlier across 88 reads. The heap sample added 99.5 KiB per touched subject. [Read, import and migration](COST.md)
**Retained history.** A predecessor snapshot every 64 subject events bounds current and pinned projection replay. The old 194 ms sample had one event and no per-read GC or I/O timing. [History methods and evidence](HISTORY.md)
**Erasure.** A protected save adds an opaque identity and an unindexed authenticated envelope. An identity-only erase journal and a separate current ledger prevent an older basis from reopening that generation. [Erasure probe and limits](ERASURE.md)
**Attribution.** The corrected writer, packed, packed with stored journal, and a raw native diagnostic share a fixed-size replacement tape. [Controls and serial work](ATTRIBUTION.md)
**Mixed traffic.** The corrected gateway and the journal variant run with 64 pinned reader loops and an adjacent import. The six-minute snapshot load excludes source-digest, receipt replay, fence and route checks. [Workload and loader obligations](MIXED.md)
**Prediction.** With stored journal, checkpoints, readers and import, predict 450/s gross, 288/s after reserves and p99 of 72/124 ms at 235/394. The original quiet packed forecast was 733/s and 31/34 ms. [Assumptions and decision](PREDICTION.md)
`bash lab/experiments/EXP-DX1/compact1/bench-server.sh`
**Audit.** The floor checks full datom tuples and native t. The layout and loader compare durable event bytes to input. Receipts, old cuts, feed fields, the lost reply, SDK and oracle have explicit fresh-attempt and source checks. [PASS audit](AUDIT.md)
**Evidence.** Durable attempt directories under `evidence/DX-COMPACT1/`. [Checksums](SHA256SUMS)
**Open.** Complete portable and native business query parity, production key custody and back-up restore, storage-layer isolation, activation and notice delivery, and the bare-metal run.
