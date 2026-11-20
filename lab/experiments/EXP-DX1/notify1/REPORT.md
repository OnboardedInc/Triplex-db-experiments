The earlier 10,000-person run sent 1,000 notices in 97.76 seconds.
It took a quarter-second break after each of 157 source checkpoints and 157 acknowledgements.
Those scheduled breaks alone add up to 78.50 seconds, or 80.3% of the run.
Every notice cost 0.314 transactions in the live database and 0.157 at the recipient on average.
Ten people were checked for each notice. Checks and ledger reads together took 3.41 seconds.
The live database spent 7.47 seconds committing progress and acknowledgements. The receiver spent 1.70 seconds in total.
A shorter break gave 40.74 notices/s. The slowest one percent of reads and saves then took 1.99 and 1.89 times their usual duration.
The full rate investigation uses the Mac. The server dispatcher has not been run.

North star P5 protects P1 reads and P2 saves. [Targets](../../../TARGETS.md) · [Part 2 measurements and recovery audit](PART2.md)

**Evidence audit**

The prior budgets come from the hash-verified paired raw windows in the part 2 manifest. The detailed probe binds every run to its source, exclusive slot, nonce, input bytes and native release receipt. Each active arm checks complete ordered effects and every sender and recipient state against Python W0. The store observer checks pinned cuts, original transaction IDs and returned positions. Public, source and recipient bytes are counted separately.
