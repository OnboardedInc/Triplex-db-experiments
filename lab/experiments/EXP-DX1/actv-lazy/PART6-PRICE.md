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
