# DX-ACT1 · Import beside live accounts

- An interrupted import resumed from its last confirmed save. Three process kills near 90% left one journal entry for each of the 20 original saves, and a lost acknowledgement returned its original receipt.
- Current-only and full-history imports agreed on all 17 current facts. History also answered what the account knew on earlier dates.
- For 48 people and 192 current facts, the snapshot took 0.74 seconds on the shared Mac. Replaying their 96 original saves took 7.02 seconds.
- A live save can encounter one import transaction already in progress. In the forced queue, three 32-fact imports delayed it by up to 174 ms. Across two runs the largest 904-fact person delayed a live save by up to 1,615 ms.
- The local trials delivered 26–556 facts/s under live traffic. The fastest setting raised the importing account’s commit p99 to 7.92× baseline. The server run must establish which setting can sustain 3,000 facts/s within the live latency limits.
- At that target, ingesting a deep account takes 89 minutes and a 4.5-million-person wide account takes 200 minutes. These estimates exclude preparation and verification.

## The lane

Priority 8 requires at least 3,000 facts/s and each neighboring account’s read and commit p99 within 1.5× its own baseline. The owner’s scale and provisional bars are in `git show 8f014afb:lab/NORTH-STAR.md` and `git show 8f014afb:lab/TARGETS.md` §1.2.
One shared coordinator admits manifests and data transactions in arrival order. It spaces bulk work using the preceding transaction’s actual service time and defers bulk for up to 500 ms when live work is queued. Live saves submit immediately. If native bulk service is bounded by S ms, the import contribution to a live save queued directly behind it is at most S ms. A storage stall removes that elapsed-time bound.
Snapshot frames combine whole source groups. A larger person stays intact up to the hard caps of 2,048 changes and 2 MiB of serialized operations and metadata. The fixtures span 106–904 facts per deep person and 6–10 per thin applicant, including references and a missing answer.
A sealed export, account and frame policy determine command identity and payload checks. Native commit precedes the full-sync cursor transaction that stores the source interval and assertion ID map. Restart settles one ambiguous command at its original ID. A missing cursor rebuilds from durable target receipts. [Import lane](lane.ts)

## Local interference curve

The complete four-setting sweep at `f814c3a94` used a fresh native importing account and neighbor per setting, with one touched reader each. The import and subsequent control received identical 3.6-second frozen burst offers. Each ratio divides loaded p99 by baseline p99.

| Target facts / duty | Facts/s | Importing scope read / commit p99 | Neighbor read / commit p99 |
| --- | ---: | --- | --- |
| 32 / 25% | 50.3 | 208.71 / 0.26 | 1.12 / 0.90 |
| 128 / 50% | 172.5 | 0.01 / 17.22 | 1.38 / 1.11 |
| 512 / 75% | 283.6 | 0.98 / 3.87 | 5.07 / 1.33 |
| 2,000 / 100% | 555.6 | 1.01 / 7.92 | 1.14 / 0.99 |

On the final revision, forward and reverse repeats measured 32-fact frames at 26 facts/s (93.24 / 2.00 here, 29.20 / 2.91 next door) · 42 facts/s (0.97 / 0.47 here, 0.51 / 1.00 next door). Three final-revision settings could not start. After 75 disk refusals, even the quietest pool forecast was 90.51 GiB against a 90 GiB limit. All import reservations were released.
The importing scope had 135 live commits per side and its neighbor had 84. Read counts ranged from 12 to 4,375. Across the four-setting sweep and completed final-revision repeats, 4,066 confirmed changes counted toward throughput and 6,788 were checked including the final in-flight frames. The server requires 500 samples per scope, metric and side.
At batch sizes of 32 / 160 / 512 / 904 / 2000 facts, median additional FIFO waits were 47 / 102 / 224 / 250 / 681 ms and maxima were 174 / 115 / 359 / 301 / 1,908 ms (three pairs each). With direct concurrent submission, 1 of 15 live transactions landed after the bulk write. A separate checked run reached 1,615 ms behind 904 facts. The FIFO probe offers the live save at native bulk transmission and releases it at the preceding ACK. [Queue probe](behind.ts)

## Current facts and full history

Per input change, snapshot cost 110.8 bytes, 0.0625 HTTP requests, 0.59 ms client CPU, 3.25 ms commit and 3.85 ms wall. History cost 161.8 bytes, 1.500 HTTP requests, 2.11 ms client CPU, 10.25 ms commit and 18.27 ms wall across 384 changes, or 13.7 verified source saves/s. Per retained current fact, history used 323.5 serialized bytes and 36.55 ms wall. Source/cursor sizes were 45,056/36,864 bytes for snapshot and 65,536/147,456 for history. Annual history at 14.6 million saves requires that many ordered original transactions. [Matched pricing](price.ts)
At valid time 125 the history returned 99 at record time 800, then 99 and 42 at record time 1,000. The snapshot returned no rows at either historical cut. It loses earlier beliefs, earlier valid intervals, retired assertions and original save boundaries.
A named history-import scope has immutable non-strict record clocks. A strict live scope accepted the same backdated valid-time correction with a fresh server clock. Erasures, malformed intervals, same-save symbolic retirements and numeric JSON tokens for exact integers fail preflight. Live cutover and erasure propagation remain open.

## Bench command and PASS audit

With `BENCH_SERVER` and `DX_BENCH_KEY` supplied, run `node --experimental-strip-types lab/experiments/EXP-DX1/import1/control.ts --campaign`. It runs the oracle, queue and 20,000-save history price, calibrates disk on both source shapes, then screens four settings at one million facts each. The two scale imports contain 16,045,255 deep facts and 36,000,000 thin facts. Each runs beside nine 10,000-person deep neighbors.
The 256 readers span ten processes. Each scope receives the unchanged v3 trace and a matched control lasting as long as ingestion. The run records the verified frontier, verification time, each native latency distribution, storage and cleanup. Full-scale measurements await the bench operator. [Controller](control.ts)
For durable receipts, `fileSource` seals the source bytes and map. In `ImportRun.open/step/importAt`, `proof` and `edges`, native readback binds command, actor, position, clocks, assertion and retirement IDs to that account. Independent O-REPLAY checks the full journal, lifetimes and 122 queries per mode in fresh scopes. Three real kills and fresh reconstruction recovered one ambiguous write.
For native readback, `verifySnapshot/touchedWitness`, `fair`, `behind` and `price` compare fresh bytes and ordered receipts at explicit cuts with the expected sources. Concurrent deep/thin imports preserved interactive edits on the same incoming subjects through later frames and their subsequent retirement. `thin.test` independently checked all five generated thin widths against O-DOMAIN.
For measurements, `traffic`, `campaign.compare`, `calibrate`, `choose`, `local`, `server` and `control` bind original offers, source, scopes, samples, endpoints, image and raw hashes to the fresh attempt. The evidence audit recomputed p99s from the closed SQLite files. Server screening prefers the fastest setting inside both same-scope and neighbor limits. It marks the fallback exploratory. The P8 check requires complete coverage, sample floors and both neighbor bars. No acceptance pin moved.
Under `evidence/DX-ACT1/import1/`, `manifest-proof/` contains oracle, paired prices, queue and overlapping edits. `native-forward-v3/` contains the complete four-setting sweep. The completed `stable-*` directories contain final-revision repeats with controls and raw samples. `checks/final-audit.json` contains recalculated results. Earlier aborted fixture, connection and source-change attempts are retained. [SHA-256 manifest](SHA256SUMS)
The complete four-setting sweep preceded the shared permit for manifest writes. The final proof and repeat used revision `7210ae39d1`. Focused TypeScript, five experiment tests and 20 Datomic tests passed. The broad lab type check has 32 existing errors. Datomic dry-packed successfully. The repository packaging check stops when pinned pnpm rejects the required store option for pack. Independent review is pending.
