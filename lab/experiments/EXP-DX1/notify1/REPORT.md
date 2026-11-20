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

**2. Which constraint mattered**

- **(a) Shared writes.** The proposed one-transaction floor is false. The source accepted .314 transactions/notice. Native JFR joined all 314 by trace and parent, with at most .081 ms clock uncertainty per join. Before, inside and after the transaction function accounted for .640, .438 and 1.322 ms/notice. Zero pre-function time overlapped an outstanding earlier live save. Foreground admission had already yielded .805 ms/notice. In the reverse direction, 13.24 ms across all 32 saves overlapped earlier dispatch commits before function entry, including 1.56 ms of their actual functions.
- **(b) Evaluation.** Re-evaluation happened ten times per notice. The kernel consumed 1.52% of wall time. Pinned world reads, sender ledger reads and publishing/packing raised that to 6.14%. Source metadata reads added 14.72%.
- **(c) Receiver.** Its commit consumed 3.95% and receiver state reads .96%. Source checkpoint and ACK writes together consumed 28.04%. Both dominant costs were outside the receiver.
- **(d) CPU.** The no-dispatch control used .066 of three slot cores and the VM was 1.44% busy. With dispatch the slot used .492 cores, the VM was 7.19% busy and the quota throttled for zero seconds. Neither window exhausted the VM. With no live traffic or intentional pause the original dispatcher reached 85.27/s. An initial idle control that waited for disabled saves was discarded.
- **(e) Live latency.** At 50.92/s the read p99 was 26.40 vs 6.72 ms (3.93×) and the save p99 was 46.71 vs 34.61 ms (1.35×) for 1,310 reads and 32 identical offers. The p99 read spent 26.01 ms in HTTP, including .51 ms of reported gateway work. The control spent 6.25 ms in HTTP. Both read directly from the writer at the exact requested position. The wire, gateway admission and client scheduling share the unseparated remainder. In the earlier 1k shared-stack run the save limit broke first (3.29× vs 1.32× reads).

**Evidence audit**

The prior budgets come from the hash-verified paired raw windows in the part 2 manifest. The detailed probe binds every run to its source, exclusive slot, nonce, input bytes and native release receipt. Each active arm checks complete ordered effects and every sender and recipient state against Python W0. The store observer checks pinned cuts, original transaction IDs and returned positions. The native join checks the JFR file digest, trace and span parents, source tree, guest boot clock and complete matched commit set. The control comparison checks all offers and fixed read schedules. The budget reducer checks raw file hashes, receipts, pinned code, packet counts and coverage of every observed HTTP request. [Rate evidence](RATE-SHA256SUMS)
