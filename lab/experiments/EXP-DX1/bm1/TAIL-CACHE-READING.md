# Transactor cache and deep-save queues

At 39.4 scheduled saves/s on the sealed ten-account database, raising the Datomic object cache from 256 MiB to 2.5 GiB cut SQL segment reads per save from 14.73 to 9.68 and scheduled ACK p99 from 286.13 to 173.37 ms. Datomic's reported decode p50 fell from 4.29 to 2.92 ms and native apply p50 from 8.65 to 6.25 ms. The larger cache saved 5.04 SQL reads per save on average and reduced ACK p99 by 39%. The 256 MiB tail exceeded my 250 ms forecast bound.

| Per-save measure | 256 MiB · n=2,364 | 2.5 GiB · n=2,364 |
| --- | ---: | ---: |
| Scheduled ACK p50 / p99, ms | 15.80 / 286.13 | 11.49 / 173.37 |
| Datomic SQL reads, mean · p50 / p99 | 14.73 · 14 / 22 | 9.68 · 9 / 17 |
| Datomic decode, mean · p50 / p99, ms | 4.56 · 4.29 / 10.28 | 3.22 · 2.92 / 7.02 |
| Datomic native apply p50 / p99, ms | 8.65 / 28.80 | 6.25 / 28.60 |
| Gateway submit to native read p50 / p99, ms | 0.45 / 38.63 | 0.44 / 12.30 |
| Native process p50 / p99, ms | 12.40 / 201.00 | 8.49 / 169.00 |
| Native end to gateway reply p50 / p99, ms | 0.45 / 4.55 | 0.43 / 3.44 |
| Earlier native replies still outstanding, p50 / p99 | 1 / 9 | 0 / 6 |

The slowest 24 saves per arm had an earlier reply outstanding in 24 and 23 cases. Six and ten overlapped a transactor GC pause. Maximum summed pause overlap was 24.19 and 37.91 ms. None overlapped writer or reader GC. Transaction-thread storage work and earlier requests both matter on this tape. The larger cache helped the median and the queue, while native apply p99 stayed near 29 ms. These are Datomic SQL segment reads. PostgreSQL can serve them from memory. The measurements give no count of physical NVMe reads.

Both arms used Java 21 G1, with 3/2/3 cores for transactor/writer/reader, one PostgreSQL core and the same three-core sender split. The read gateway ran idle during 60 seconds of offered load. Clock-qualified JFR pause p99 across the recorded process time was 35.53/24.65/20.95 ms at 256 MiB and 54.37/18.72/19.15 ms at 2.5 GiB, in transactor/writer/reader order. Absolute timestamp logs and the per-save joins are in the compressed bundles.

Each eight-save small gate matched the packet, journal and native IDs before full timing. Both full arms matched all 2,364 planned saves and their field and journal values. The comparison runs TAIL1's exact `da4c34f48` producer on the pinned JVM1 `5a9652780` restore integration, using the original cold physical image. The measured tape is one active deep account among ten seeded accounts. It differs from the earlier fresh single-account 10k deep runs. A same-seed comparison of collector policy and cache size remains open.

The Mac copy is `evidence/DX-BM1/day-n20/tail-backlog-generation`, with 3,224,635 bytes of summaries and 28,347,880 bytes of raw recordings. The first two failures remain in their own archives. [Checksums](SHA256SUMS) · [Forecasts](PREDICTIONS.md)
