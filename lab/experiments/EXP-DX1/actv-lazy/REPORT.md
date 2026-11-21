Build the held-database server candidate at `43b186d9a175054cfb94b84ca6d5c76e6ee9b128`. It includes both credit modes.
On bare metal at 25,000 people, every priority Publish gave the first correct answer within one second, including at peak.
At peak the system offered 39.4 saves a second and stored 25.39. The same queue grew without any Publishes.
The 30 Publishes held the turn for less than one second of a 150-second window. The old run used one core per JVM and serial saves.
The new command opens the existing one-million-person database and publishes to one account of 100,000 without reseeding any people.
The 100,000-person forecast is 60–180 ms p99 at 3.5 saves/s, 130–450 ms at 23.5, and 200–900 ms at 39.4, with the other accounts live at the two higher rates.
The bare-metal result still decides whether the new path meets the one-second target and protects ordinary traffic.
Assumed production cadence for confirmation is one Publish per account per hour during a busy deployment. The five-second test deliberately stresses the queue.

The completed BM1 replay at `48f55759494f6a6a04eeb6aa5284dde3e166d431` verified all 16,045,255 seeded facts, 3,240 save receipts and 342,881 ordered notice effects across six windows. Each broad release changed about 490,000 values across all 100,000 people. Its separate background campaign was stopped after the release windows were proved. [Verified results and digests](PART8.md#server-observations-at-100000-people)

INT1 merged the pinned candidate, ACT2 `bc01028b0` and STG1 `fa53e50cd`. The joined server command stays on its directly checked writer and observer. Publish has no fixed healthy-path grace and makes at most three predecessor attempts. A waiting save gets a turn after eight Publishes. Shared geography already used a full release census. The shared-save fix falls back to the same census when it cannot prove ownership. Its native check covered three edits, seven affected people and one untouched person per edit, a lost acknowledgement, three stops and 35 ordered effects.

The original-selector 23.5 saves/s deep run reopened and verified the parked seed. The local time cap arrived before either terminal cursor was verified. Its volume was removed. The peak background timing is still open.

The first Mac native ordinary-token run verified settlement across worker stops and quicker smaller frames after a typed 413. It also checked a future-dated release, both orders of a same-person save, a pinned reader started before Publish, two publishers, and releases affecting everybody or nobody. The updated role probe passed six transactor and gateway suspensions before, during and after Publish. The original receipt matched on retry. The native priority gate recorded a save at 12, Publish at 13 and a waiting save at 14, then proved the opposite order and three bounded conflicts. [Independent proofs and audit](PART8.md)

The 3.5 saves/s 10,000-person pair matched 78,548 reads, 49,297 values and 5,997 effects. It had 630 saves per block and scope. Full-block save/read ratios were 0.30/0.85 and 0.33/0.91 in the publishing account and neighbour. The first minute of control built a backlog. Ratios reversed in the last 90 seconds, with 315 saves per side. The deep pair waited 3 hours and 38 minutes across the earlier grants. The pilot waited 4 hours and 33 minutes, partly overlapping. The new Mac runs use one ordinary token per step. [Clock breakdown](PART8.md#deep-settlement-on-the-mac)

The 45-second native v3 prefix used 64 readers per arm and matched 53,886 reads and 44 save receipts per arm. Its save/read p99 ratios were 1.10/1.67, with too few saves to qualify. The 180-second pair hit the local cap. The full interference trace remains open. [Trace evidence](PART8.md)

Earlier 10,000-person deep Mac checks found 48.2 encoded notice-leaf bytes per person and about 101.3 address bytes. Three sampled thin pages used 10.3–10.4 leaf bytes and 100–104 address bytes. Both are storage counts. P7 measures resident memory outside Postgres. [Size price](PART6-PRICE.md) · [Read stages](STAGES.md) · [Retention choice](RETENTION.md)

Fresh-reader checks covered 10,000 and 25,000 thin people and 1,000 deep people. Each wrote four changes with no subject visits. The 25,000-person receipt took 79 ms and the sampled cold-read p99 was 27 ms on the Mac. Its index used 10.46 leaf bytes and 101.72 address bytes per person. JVM snapshots include index and heap activity and cannot isolate the 64-byte resident-memory bar.

The revised 64-person smoke used the pinned candidate. The cold observer started within 5 ms of the cutoff in all three cells. The peak Mac diagnostic still missed with 758 ms behind an active save and 317 ms from entry to durable. Quiet and 3.5 saves/s observed the new release in time. All 15 point samples and 379 effects replayed exactly.

The packed Mac correctness gate checked both credit modes on 80 people across ten accounts. It verified 7,632 save receipts, 384 reads, 86 concrete changes and eight notices. A fresh reader replayed old and new release pins. [Part 9 evidence](PART9-SHA256SUMS)

### Server command

[Held scale command, budget, backlog analysis and forecasts](PART9.md). The previous command remains in [the separate-scope server instructions](SERVER.md).

The earlier six-window collector replayed all 30 point witnesses and 757 effects at 64 people. It rejects a missing terminal and late sampling cannot count as a hit. [Review response](REVIEW2.md)

The earlier experiment used separate logical scopes. The held runner uses one physical database. Full-size and one-billion-record evidence remain open. [Earlier evidence checksums](PART8-SHA256SUMS)
