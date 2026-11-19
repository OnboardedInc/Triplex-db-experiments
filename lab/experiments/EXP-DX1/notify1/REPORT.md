When Publish returns, its database transaction has recorded every notice the new release owes.
It stores the new rules, the original facts’ position and time, who was covered, and the preceding publication.
Recording the notices took 21–68 ms in five local trials with 10,000 people. It added three facts and removed one at both sizes.
A later save or rollback leaves its own notice behind the earlier one. A recipient waiting for notice 2 gets 2 before 3.
A lost acknowledgement can repeat a transmission. The receiver records each batch’s effects and its place together, so a retry applies it once.
At 1,000 people, 16.5 and 20.8 notices/s kept slow reads and saves within 1.5 times normal. At 10,000, 10.2/s did so once. A repeat at 9.25/s missed both limits.
When one account’s receiver stalled, a second account finished its entire batch on the shared receiver.
After the database gateway was killed, all 455 effects from one run and all 4,492 from the other matched their saved copies byte for byte. LAZY still refuses E-Verify submissions pending an owner ruling.

**Local Datomic observations**

These are Mac diagnostics. Each trial compares dispatch with a fresh account given identical scheduled saves. Four clients issued pinned reads. Read p99 measures request to response, save p99 scheduled offer to receipt. Rates cover the broad release through sender acknowledgement. The local fixture owes 100 and 1,000 notices respectively. The frozen W0 and deep server workloads have different populations.

| People | Receiver and pause between turns                       | Notices/s | Read p99 ratio | Save p99 ratio | Reads / saves during dispatch |
| -----: | ------------------------------------------------------ | --------: | -------------: | -------------: | ----------------------------: |
|  1,000 | Same Datomic stack, 0 ms                               |     25.34 |           1.32 |           3.29 |                      264 / 40 |
|  1,000 | Same stack, 100 ms                                     |     16.47 |           0.34 |           0.15 |                      405 / 61 |
|  1,000 | Same stack, 100 ms, 3.5 GiB repeat                     |     20.75 |           0.49 |           0.54 |                      322 / 48 |
|  1,000 | Separate dispatcher and SQLite, 20 ms                  |     35.75 |           2.51 |           0.26 |                       187 / 5 |
| 10,000 | Same stack, 100 ms                                     |     10.76 |           1.28 |          10.12 |                   6,194 / 929 |
| 10,000 | Same stack, waiting saves first, 20 ms                 |     23.53 |           3.40 |           5.33 |                   2,834 / 425 |
| 10,000 | Separate dispatcher and SQLite, 20 ms                  |     40.74 |           1.99 |           1.89 |                    1,637 / 40 |
| 10,000 | Separate dispatcher and SQLite, 250 ms                 |     10.23 |           1.42 |           0.95 |                   6,518 / 157 |
| 10,000 | Separate dispatcher and SQLite, 250 ms, 3.5 GiB repeat |      9.25 |           2.62 |           2.09 |                   7,211 / 174 |

The shared-stack trials offered 10 saves/s. The separate-process trials offered 1.6/s. The original runs had a 2.5 GiB cap. The repeats used 3.5 GiB. At the first qualifying 1k point the baseline save p99 was 967 ms versus 146 ms with dispatch. At the qualifying 10k point the first effect arrived at 1.18 s and the last at 97.48 s after dispatch started. Read p99 was 26.0 vs 18.2 ms and save p99 126.3 vs 133.2 ms. On repeat, 1,000 notices took 108.15 s and all 4,509 effects matched Python. Read p99 was 74.6 vs 28.4 ms and save p99 519.7 vs 248.1 ms. A repeatable 10k operating rate is still open.
At 10k the 20 ms separate-process arm spent 3.67 s deriving records and reading ledgers, 6.85 s writing source progress and acknowledgements, and 1.39 s in the receiver. The 250 ms arm spent 3.41, 7.47 and 1.70 s respectively. Both sent 157 packets. Pacing accounted for most of the slower arm’s elapsed time.

**Host integration and recovery**

- The notice mode starts with the first publication or consumes the host’s authoritative journal. W0 sequences each work item. The stream additionally orders distinct items per subject. A later change earns the next sequence. An unchanged payload or retirement earns none. Reappearance advances the retained sequence. Moving an external subscriber with prior effects requires its durable inbox or an audited migration.
- LAZY `04dd4fab8` admitted an ordinary wage save while the earlier receiver acknowledgement was outstanding. The bridge used the projector’s original sequences and the host’s native batch acknowledgement. The service wake ran, and five effects in two packets matched Python. Its protected-submission probe left erasure uncommitted.
- DELTA `812673dd2` supplied the sealed release pair, source cut and preceding account revision. Its expansion preserved the preceding pending entries and exact new deliveries through subject-key erasure, a lost acknowledgement and a newer wage save. Six effects in four packets matched Python. Both hosts delivered wage sequences 1, 2, 3, 4.
- The standalone W0 implementation commits a newly supplied release document by hash. Its proposed erasure rule retains the prior work-item bytes needed to honor an existing notice, including EVSUB intent without the SSN. The protected fixture forces older raw input reads to fail. External effects require a transactional recipient or a recipient honoring the original idempotency key.

**Evidence audit and handoff**

- `installCensus` reads the stored membership pages back. `Notices.plan/append/erase` bind scope, epoch, preceding release, clocks, source position and immutable rule bytes. `Documents.commit/original` check the original intent and native transaction. The fresh-document gate reopens a same-name release with different rule bytes.
- `Dispatcher.derive/turn` check the original event, range and erasure fence, and commit packet, item state and progress together. `receiveOrdered` checks the original bytes and predecessor at the recipient. `drainHost`, `lazyFeed` and `deltaFeed` pin native row IDs or chunk hashes, account and epoch through retries. Crash gates reopen before and after durable writes.
- `verify` compares whole ordered effects and every sender and receiver state to Python O-DOMAIN for the offered history. `host-gate` hashes loaded host files against Git. `preflight/measuredPair` bind committed inputs, both windows, physical slot and nonce. `inspectPair` recomputes raw p99s, counts and rates for the report and server terminal. `archive` compares original transactions and full state across slot owners on the same volume.
- Controls include 23 publication schedules on Datomic, 174 W0 tests and five native notice gates. A concurrent retransmission recovered its original receipt and refused altered bytes. The host fairness gate checks the quiet account’s durable cursor while its neighbour waits for a lost acknowledgement. Retained stops include the first 1k timer summary rejecting decimals, fractional deep offsets, a killed 2.5 GiB gateway and a source change during preflight.
- The [checksums](SHA256SUMS) cover 287 files (142 MiB) in `evidence/DX-STG1/`, including the ten matched pairs in `results.json`, the failure logs and the full state exports. The owned slot and volume were removed. Frozen W0, v3, the acceptance contract and its pinned files retain their original bytes.

**Dedicated 100k deep command**

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/notify1/bench.ts launch notify-deep-001`

The local deep preflight checked 1,000 subjects, 799 release notices and all 999 effects. It delivered 87.8/s, with read p99 at 1.98× and save p99 at 3.80× baseline.
The launcher starts the cold SCALE1 stack, requires ACT2’s 1,000-subject identity check and a separate 1,000-deep notice comparison, then runs two fresh 100,000-person accounts sequentially with 64 live readers and the deep writer trace. The 100k server rate and the full one-second publication guarantee, including changed outputs, remain unverified.
