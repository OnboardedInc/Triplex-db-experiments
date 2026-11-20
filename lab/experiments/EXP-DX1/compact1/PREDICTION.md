# A one-database prediction for ten deep accounts

**North star.** P2 and P6 durable save tail at 235 and 394 offers/s, with P9 durable receipts. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

For a bare-metal Datomic Pro 1.0.7745 transactor with synchronous PostgreSQL, ten accounts of 100,000 placements and 160 facts per placement, I predict **730 sustained small saves/s** at saturation. At 235 and 394 smoothly paced offers/s I predict **31 ms and 34 ms** p99 from scheduled offer to durable receipt. Both rates should fully drain. The experiment sends 1-, 2- and 3-fact replacements around ten accounts. It has no competing activation or import. Rate is a single database's workload.

The model gives a full group of eight a nominal 2.6 ms fixed cycle plus 0.95 ms per member. It applies a uniform 0–0.7 ms perturbation and an 8–28 ms delay to 2% of groups. One ACK gates the next group, with immediate start and no collection timer. These are priors for deeper caches, storage round trips and scheduling tails. The Mac floor separates short native apply from the rest of the durable cycle. Full-size segment misses, replica flush latency and correlated pauses remain open. The model rates a full group at 733/s on average. Multiplying by 0.85 and 0.75 for maintenance and spare capacity gives a planning budget of 467 offers/s. [Datomic's capacity and indexing model](https://docs.datomic.com/operation/capacity.html)

The alternating Mac run subsequently measured 614–742 compact saves/s and 222–252 µs of native apply per save at depth 64 and 1,024 subjects. Those blocks measured the fast path mechanism at a shallow history depth. The pre-registered fleet forecast still needs the paced and saturated tests on 1M subjects. [Mac comparison](MEASUREMENTS.md)

The 16M-fact Mac load sampled 88 untouched subjects. Most rebuilt quickly, with p95 of 12.74 ms, and one took 194.44 ms. A save on an untouched subject also rebuilds its projection before entering the writer. That cost and its correlation across accounts are the main risks to the predicted tail. The fleet command sends edits to distinct subjects using the same cold preparation path. [Import and cold read evidence](COST.md)

Run this from a clean experiment checkout on the provisioned bare-metal SQL stack:

```sh
bash lab/experiments/EXP-DX1/compact1/bench-server.sh
```

The stack needs the pinned Datomic distribution, the same checkout's compact namespace on its transactor classpath and SQL connection settings in its private environment. The script uses a fresh database, loads 160M business facts across ten accounts, offers 14,100 followed by 23,640 paced saves, then measures a distinct 24,000-save saturation window. It checks receipt identity against the durable database and reports all-offer and per-account latency. Provision and reserve adequate independent SQL capacity before running. The script was supplied for the server operator. These are numerical predictions.

Advance the incremental W1 and PREP1 route first, with the write-audit fixes verified. PREP1 measured 85.8% of the full group's measured gateway turn in speculative apply and materialization. Its guarded preparation targets that recurring cost while keeping the incumbent read layout. Make whole-account routing movable now. At 394/s, two independent five-account pools need around 310 saves/s each under the same maintenance and spare-capacity assumptions. Use smaller pools when required by the quiet-account tail or storage-layer isolation. The compact branch earns a second round if the server measures at least 620/s, both rate windows return every receipt with p99 below 50 ms, and quiet-account visibility remains within its own 1.25× budget under imports and activation. Compare retained-history read tails before committing to migration. [PREP1 stage measurements](https://github.com/OnboardedInc/Triplex-db-experiments/blob/0f7438020/lab/experiments/EXP-DX1/prep1/REPORT.md)
