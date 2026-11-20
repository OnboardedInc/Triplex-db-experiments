# Ready saves in one Mac SQL queue

Both arms use the compact row encoder and the same durability, fresh scope, ten account namespaces and tape of 1–3 replacements. Each cell has 192 readable durable receipts and matching feed/row checks. The order is recompute, reuse, reuse, recompute. The ranges below are the two repeat values in small noisy diagnostic windows.

| Outstanding offers | Recompute saves/s | Reuse saves/s | Mean successful members per native transaction with reuse |
| ---: | ---: | ---: | ---: |
| 1 | 35–57 | 46–49 | 1.0 |
| 8 | 60–66 | 77–87 | 3.8–3.9 |
| 32 | 123–131 | 138–159 | 14.8 |
| 64 | 146–196 | 189–195 | 27.4 |
| 128 | 119–172 | 158–183 | 27.4–38.4 |

At 64 outstanding, repeated request preparation in the writer fell from 1.43–1.95 ms per save to about 0.01 ms. All 382 grouped members at this depth reused their compiled requests. Speculative apply cost 1.59–2.71 ms per save. Physical native compute cost 0.105–0.168 ms per save, and total peer await cost 1.93–3.00 ms. The latter includes native compute, log, notification and peer apply. The PostgreSQL LSN advanced by 1.81–1.89 kB per logical save in those two cells, including database background writes. It cannot split log-write time from peer acknowledgement time. The largest realized group in the full study was 75. Offering 128 concurrently gave worse throughput than 64 in both reuse repeats.

The writer can reuse the first prepared data only while the journal entities remain absent and the reference layout and transaction function agree. Native proof makes a journal appear after the initial preparation and requires exactly the ordinary freshly compiled data. Every operation still goes through its successive logical view and the durable whole-basis guard.

Reference hardware forecast for this implementation is 260–350 saves/s with large ready groups, or 180–215 at the 8 ms sizing budget. For the unbounded estimate use the analyst's 2.4 ms fixed cost and a remaining range of 2.8–3.8 ms of coupled per-save work at 32 members, including cold reads. Those are assumptions rather than a Mac-to-server multiplier. The bounded forecast uses the observed mix and saved-tail sensitivity from the budget grid. There is still one speculative native `d/with` for each save on the peer. The analyst's 500–700/s scenario depends on removing that reapply and storing substantially fewer datoms than these arms.
