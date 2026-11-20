# Part 6 price measurements

The Mac runs diagnose the work at a named cut. They do not qualify the server bar. The earlier 10,000-person compact run measured 37 ms to record the wage notice recipe, 472 ms with the concrete wage values and 1,198 ms with concrete values for the three-rule W0 release. The independent oracle checked every changed value and the entire roster. The 10,000-person estimates replace the earlier 1,000-person extrapolations. [Compact price](COST.md)

## What each change buys at 10,000 people

The feature comparison uses 40,898 compact native W0 facts. All six overtime alternatives produce the exact same 824 stored flag changes. Workers are started only during the offer. Index enrolment took 18.8 s with no candidate release and used 87.6 encoded leaf bytes per person plus 101.3 bytes per person for address keys and values. Independent verification ran after all offers.

| Publish arm | Native world pulls | Select ms | Read ms | Evaluate ms | Encode ms | Stage write ms | Offer to durable / connected answer ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Overtime, census | 10,000 | 24 | 745 | 478 | 5 | 0 | 1,329 / 1,340 |
| Overtime, DELTA ranges | 824 | 419 | 96 | 44 | 9 | 0 | 656 / 683 |
| Overtime, ranges and four workers | 824 | 446 | 115 | 98 | 5 | 0 | 978 / 997 |
| Overtime, inputs held in the index | 0 | 303 | 0.2 | 77 | 4 | 0 | 651 / 664 |
| Overtime, staged with legacy values | 0 | 265 | 0.1 | 89 | 3 | 49 | 635 / 669 |
| Overtime, staged with compact values | 0 | 308 | 0.2 | 90 | 7 | 21 | 634 / 645 |
| Three-rule W0 release, staged with compact values | 0 | 336 | 0.3 | 195 | 30 | 95 | 796 / 807 |

Read and evaluation columns sum the individual operations. Four workers overlap them. Their cold starts, message transfers and exit also take time. On the narrow edit, forcing four workers increased the materialization clock from 149 ms to 473 ms. One worker is the better measured narrow configuration. Reusing the independently maintained input leaves eliminated candidate world pulls. Index enumeration was the largest remaining measured stage. The staged mode traded an additional commit for the ability to make many bounded writes before visibility. Compaction reduced the overtime value payload from 6,276 to 3,324 bytes. The broad arm wrote 147,568 encoded bytes and used two chunk transactions before its four-change marker. It stored 3,764 rows across 2,007 people.

## Deep index footprint

The deep fixture has 137,635 owned facts for 1,000 people and 1,604,464 for 10,000. Applying the exact notice-leaf codec to the independently authored seed used 48.1 and 48.2 bytes per person, respectively. These are encoded leaf values. The native account also carries membership addresses, census structures and database overhead. This calculation does not time a transaction.

At 1,000 people on the actual deep source, receipt-only Publish took 68 ms to become durable and 85 ms through the first correct connected answer. Staged Publish using the notice-only index took 1,052 / 1,068 ms. It performed 1,000 native world pulls, stored 5,759 values in a 124,384-byte payload and applied 2,003 independently verified recipient effects across the whole experiment. Full answer envelopes would encode to 515,920 bytes at the same cut. Native enrolment took 18.9 s. The durable notice leaves measured 48.1 bytes per person, and address keys and values added 100.4 bytes per person.

At 10,000 deep people, the same receipt-only offer took 38 ms to become durable and 49 ms through the first correct connected answer. The notice-only index left a full native read for the three-rule stored mode. It took 21.664 / 21.739 s, made 10,000 world pulls and stored 49,297 concrete changes across all 10,000 people. The compact payload was 931,144 bytes across eight staging transactions. Including the final marker, the nine native requests used 2,132,042 wire bytes and 543 ms. The remainder includes source reads, evaluation and client preparation. Full answer envelopes would already encode to 4,395,280 bytes at this cut. The receipt marks the debt for 4,497 new effects in this release. The oracle checked all four cuts and verified 11,997 ordered recipient effects across the run. Native enrolment took 232.2 s. Measured notice leaves used 48.2 bytes per person and address keys and values added 101.3 bytes.

| Ordinary save | 1,000 deep wall medians (ms) | 10,000 deep wall medians (ms) | 10,000 deep client CPU medians (ms) | Native request (KiB) | Notice / index changes added |
| --- | ---: | ---: | ---: | ---: | ---: |
| Reader-only input | 65.1 / 66.1 | 65.2 / 37.8 | 22.4 / 12.5 | 9.5 / 9.7 | 0 / 0 |
| Notice input, same posting | 81.7 / 71.4 | 77.0 / 69.6 | 20.8 / 18.9 | 9.5 / 19.5 | 3 / 0 |
| Notice input, changed posting | 68.7 / 70.9 | 55.4 / 55.3 | 18.3 / 21.2 | 9.5 / 23.3 | 3 / 2 |

Each cell pairs six controls with six joined saves. Raw source preparation is outside both clocks. Controls run before enrolment. The lower wall medians can reflect host contention and warmer storage. The wire-byte and fact counts show the durable cost of notice and index maintenance. The optional expanded output index adds maintenance for reader inputs whose posting or projected source changes. The save table prices the notice-only configuration.

## Planning estimates

For the same compact distribution, subtract the measured request preparation and final marker request as fixed costs, then scale the remaining measured work by roster size. This simple projection includes cold worker cost in the scaled part. Data volume, writer queues and server hardware can change the slope.

| Mode, compact mix | 100,000 people | 1,000,000 people |
| --- | ---: | ---: |
| Recipe only | About 0.04–0.10 s of local service | Same four changes, subject to admission |
| Overtime, native census | About 13 s | About 130 s |
| Overtime, DELTA range and one worker | About 6 s | About 60 s |
| Overtime, staged compact | About 6 s | About 60 s |
| Three-rule W0 release, staged compact | About 8 s | About 80 s |

The result at 10,000 is inside one second on this compact fixture. The projection misses at 100,000. Staging overcomes the aggregate request limit and still has a cost per encoded chunk. The current implementation bounds staged value bytes to 128 KiB per transaction and checks that every measured actual request fits the 4 MiB native gateway limit.

The priced deep mode uses the notice-only index. Keeping its full native read projects about 216 seconds at 100,000 deep people and 2,160 seconds at one million. The server command uses the expanded index and measures that path separately. At the observed deep value density, 100,000 people would encode about 9.3 MB of changes and need at least 72 staged writes at 128 KiB each. A million would encode about 93 MB and require at least 711 writes. At the Mac's observed native request cost the 100,000-person write sequence alone would take several seconds. The 10,000-deep fixture was loaded before the timing window. The pricing lease includes saves and Publish, and releases before delivery.
