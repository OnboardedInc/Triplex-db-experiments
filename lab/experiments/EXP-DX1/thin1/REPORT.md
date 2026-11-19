At 100,000 people, each eight-fact import added 3.20 kB to PostgreSQL and 4.61 kB of resident memory to each eager reader.
Starting that reader also added 2.99 kB per person to the read gateway's ID and row caches. The old test model separately used 3.10 kB per person.
The new reader imported all 100,000 with zero packed rows and zero added gateway cache bytes. The durable activation roster used 31 bytes per person including journal indexes.
After 2,000 people were read and updated, the reader held 3.09 MB of packed rows versus 134.02 MB. Its total resident memory fell from 603 to 209 MiB.
The first historical read of a cold person took 3.47 ms median and 38.55 ms p99. A repeat on a resident person took 0.24 and 3.04 ms.
One 16 GiB guest demonstrated 100,000 people. At the measured density, 4.5M would need roughly 14.4 GB of seed table and indexes and 139 MB of packed reader data at 2% touched.
Machine capacity at 1M and 4M, concurrent activation and quiet-server latency remain unmeasured. The touched reader retains admitted worlds until rebuild.
Both paths produced the same 100,000 release records and durable deliveries. Publication took 404.46 s eager and 178.70 s touched on the shared guest. These timings confer no verdict.

| Eager component, incremental bytes/person (bytes/fact) | 10k seed only | 10k after 2% touched | 100k seed only | 100k after 2% touched |
| --- | ---: | ---: | ---: | ---: |
| Reader RSS above freshly opened process, native | 9,704 (1,213) | 9,993 (1,246) | 4,606 (576) | 4,655 (580) |
| Reader RSS, separate wire census | 10,856 (1,357) | 10,869 (1,355) | 6,668 (833) | 6,695 (835) |
| Reader JS heap, includes maps, wire census | 2,683 (335) | 2,699 (337) | 1,708 (214) | 1,731 (216) |
| Packed current rows, native | 1,336 (167) | 1,340 (167) | 1,336 (167) | 1,340 (167) |
| Current ID map and entry objects, isolated V8 heap | 347 (43) | 344 (43) | 307 (38) | 307 (38) |
| Shared bootstrap lookup table, wire census | 250 (31) | 250 (31) | 240 (30) | 240 (30) |
| Accounted reader history, native | 0 | 24 (3) | 0 | 24 (3) |
| Read gateway ID memo estimate, native | 765 (96) | 769 (96) | 764 (96) | 768 (96) |
| Read gateway parsed and recent cache charge, native | 11,325 (1,416) | 11,445 (1,427) | 2,229 (279) | 2,247 (280) |
| Write gateway ID memo and row cache, native | 0 | 0 | 0 | 0 |
| Transactor object-cache charge, separate native census | 3,362 (420) | 18,065 (2,253) | sampling | sampling |
| PostgreSQL table, TOAST and indexes | 2,360 (295) | 2,401 (299) | 3,204 (400) | 3,243 (404) |
| Test apparatus only, compact model RSS | 3,985 (498) | 3,999 (499) | 3,104 (388) | 3,145 (392) |

Seed-only means no application touch since import. Denominators are 80k/800k facts, rising to 80,200/802,000. Rows overlap. The native driver stored 26.0 MB of intent receipts at 100k. Shared cache charges are population averages. SQL and charge samples exclude their empty baselines.

| Native OS RSS at 100k, MiB | PostgreSQL¹ | Transactor | Write gateway | Read gateway | Reader | Driver |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Eager after bootstrap | 1,275 | 807 | 759 | 1,016 | 598 | 125 |
| Touched after bootstrap | 1,217 | 738 | 775 | 384 | 159 | 216 |
| Eager at 2% | 1,335 | 856 | 762 | 1,039 | 603 | 208 |
| Touched at 2% | 1,290 | 741 | 780 | 634 | 209 | 224 |
| Eager after publication | 1,622 | 946 | 781 | 1,076 | 761 | 223 |
| Touched after publication | 1,696 | 845 | 942 | 708 | 214 | 219 |

¹PostgreSQL RSS sums its processes and can count shared pages repeatedly. At 2% the touched read gateway held 1.53 MB of ID memo and 35.21 MB of row cache. The admission path uses `reach-touched` with gateway reads. First calls including composition startup took 126 and 327 ms in two fresh scopes. No application keep-warm ran.
Both arms matched 13,000 pinned reads, 2,000 read-your-own-writes and all 5,125 feed transactions twice. Eager and touched p50 and p99 in ms were 0.41/3.20 and 3.47/38.55 for cold history, 0.37/2.56 and 0.75/10.32 for first current, and 15.64/66.81 and 11.04/91.80 for commits. Seed took 681.53/647.71 s.
At cut 5,124, 1,999 people required a full world and 98,001 needed only the subject ID. The last live write landed at 5,125. The three verified releases cannot read owned import answers. Missing status still orders a background check. Every person received a guarded outbox publication.

**Evidence audit.** [Design](DESIGN.md) · [Evidence index and reproduction](EVIDENCE.md) · [Checksums](SHA256SUMS) · [Physical queue](queue-bench.ts)

- `profile` checks fixture rows, size and source/build hashes in fresh guest processes. Native RSS/disk require owned live roles, matching nonce and source, and durable SQL settings. Object-cache samples verify the challenged JVM, weigher, divisor and charged bytes.
- `Replica.admit` checks exact cut, closure, rows, overlapping residents and live generation. `IntentLog` checks issued commands, assigned IDs and full public row metadata. The named entry also checks an actual write between two pinned reads.
- Feed verification and `ThinRoster.apply` check every journal against issued intent, scope binding, position and replayed bytes. The SQLite transaction commits the coverage certificate and cursor together.
- `ThinRoster.activate` checks release hash, cut and sorted roster count/hash before publication. Both actual streams have the same SHA-256. O-DOMAIN independently matched every record and native readback compared every state and delivery list.
- Frozen O-REPLAY checked 19 sampled reads and 76 entity results per arm from fresh cases and assigned receipts. The physical queue recomputes the run binding, digests and denominators for each fresh rung. Neither physical rung has run.

The Datomic suite passed 406 tests and skipped 52. Six experiment tests and the 13-package clean-consumer check passed. Root formatting stops on the unchanged deeply nested W0 fixture. Standalone bench typechecking also reports errors in existing files. No acceptance pins or frozen trace files changed.
