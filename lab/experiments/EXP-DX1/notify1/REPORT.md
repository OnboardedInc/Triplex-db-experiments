The earlier 10,000-person run sent 1,000 notices in 97.76 seconds.
It took a quarter-second break after each of 157 source checkpoints and 157 acknowledgements.
Those scheduled breaks alone add up to 78.50 seconds, or 80.3% of the run.
Every notice cost 0.314 transactions in the live database and 0.157 at the recipient on average.
Ten people were checked for each notice. Checks and ledger reads together took 3.41 seconds.
The live database spent 7.47 seconds committing progress and acknowledgements. The receiver spent 1.70 seconds in total.
A shorter break gave 40.74 notices/s. The slowest one percent of reads and saves then took 1.99 and 1.89 times their usual duration.
The full rate investigation uses the Mac. The server dispatcher has not been run.

North star P5 protects P1 reads and P2 saves. [Targets](../../../TARGETS.md) · [Part 2 measurements and recovery audit](PART2.md)

**1. Cost of one delivered notice**

Fresh Mac captures used four pinned readers, 1.6 offered saves/s, 64 subjects per batch, a separate cold worker, FULL SQLite and 20 ms between turns. Each processed the full R1 ledger before measuring a new R2 publication. The 1k/10k arms delivered 100/1,000 release notices. All submitted effects and sender and recipient states matched Python W0.

| Per notice                                | 1,000 subjects | 10,000 subjects |
| ----------------------------------------- | -------------: | --------------: |
| Source / recipient durable transactions   |    .320 / .160 |     .314 / .157 |
| Source / recipient pinned calls           |   1.780 / .320 |    1.729 / .314 |
| Source HTTP exchanges / rule evaluations  |     2.750 / 10 |      2.672 / 10 |
| Source HTTP request / response body bytes | 9,060 / 17,347 |  8,981 / 17,320 |
| Source / SQLite logical operation bytes   |      872 / 773 |       865 / 769 |
| Business payload / encoded delivery bytes |       39 / 308 |        39 / 308 |

At 10k the 19.64 ms/notice split into measured sleep 6.779, source checkpoint 3.770, source metadata reads 2.891, source ACK 1.736, cold start and residual 1.488, foreground grants/IPC .805, receiver commit .775, pinned world .430, sender sequence ledger .412, rule evaluation .298, receiver state/receipt reads .189 and publication/packing .066. These exclusive intervals sum to elapsed wall time. SQLite operation bytes are logical input. HTTP counts both body directions and excludes headers.
Sequence numbers come from the live sender ledger. The receiver checks its own stored sequence before applying a packet. The 314 source commits spent 2.87 ms total in the client send-order wait and 9.08 ms before the gateway predecessor was ready. The 2.40 s from native submission to peer completion includes service as well as queueing.

**Evidence audit**

The prior budgets come from the hash-verified paired raw windows in the part 2 manifest. The detailed probe binds every run to its source, exclusive slot, nonce, input bytes and native release receipt. Each active arm checks complete ordered effects and every sender and recipient state against Python W0. The store observer checks pinned cuts, original transaction IDs and returned positions. The budget reducer checks raw file hashes, receipts, pinned code, packet counts and coverage of every observed HTTP request. [Rate evidence](RATE-SHA256SUMS)
