Priority server and integration candidate `acc0f5c39ed7dafc4c1539ce7353fa11750e6f9b`.
On bare metal, one write recorded the release and what notices it owed in 46 ms. The first correct answer came at 56 ms.
At 3.5 saves per second the receipt and answer took 53 and 63 ms. At 23.5 saves per second they took 2.043 and 2.051 seconds.
The busy receipt waited 2.020 seconds behind 50 saves. A new release can now pass waiting saves in its own account. The active save finishes first.
The owner chose the permanent receipt as the stored point. The earlier server run took 13.0 to 18.6 seconds to write every changed value before that point.
At 10,000 deep people and 3.5 saves per second, the Mac recorded values after 216 seconds and individual notices after 254 seconds. Laptop clocks are diagnostic.
While those values are being written, a reader works out the same answer from the release and its recorded cut. The recovery gate compared both answers.
The 100,000-person priority path and common-database scorecard still need server measurements. Protected-input notice retention remains open.

The completed BM1 replay at `48f55759494f6a6a04eeb6aa5284dde3e166d431` verified all 16,045,255 seeded facts, 3,240 save receipts and 342,881 ordered notice effects across six windows. Each broad release changed about 490,000 values across all 100,000 people. Its separate background campaign was stopped after the release windows were proved. [Verified results and digests](PART8.md#server-observations-at-100000-people)

The integration candidate includes ACT2 `bc01028b0`, STG1 `fa53e50cd` and INT1 `a7926719103a12c83b04ce6c9ce770b1ab70433d`. The integration includes the guarded Reach and recorded-cut writer changes. The server candidate remains pinned to the earlier writer and its own evidence. It has no fixed grace on healthy Publish, retries at most three predecessor conflicts and gives waiting saves a turn after eight Publishes. The shared geography release already chose a full census. The repaired shared-save path now does the same when ownership cannot be proved. Its native regression covered three edits, seven affected and one unaffected person per edit, a lost acknowledgement, three stops and 35 ordered effects.

The first Mac native ordinary-token run verified settlement across worker stops and quicker smaller frames after a typed 413. It also checked a future-dated release, both orders of a same-person save, a pinned reader started before Publish, two publishers, and releases affecting everybody or nobody. The updated role probe passed six transactor and gateway suspensions before, during and after Publish. The original receipt matched on retry. The native priority gate recorded a save at 12, Publish at 13 and a waiting save at 14, then proved the opposite order and three bounded conflicts. [Independent proofs and audit](PART8.md)

The 3.5 saves/s 10,000-person pair matched 78,548 reads, 49,297 values and 5,997 effects. It had 630 saves per block and scope. Full-block save/read ratios were 0.30/0.85 and 0.33/0.91 in the publishing account and neighbour. The first minute of control built a backlog. Ratios reversed in the last 90 seconds, with 315 saves per side. The deep pair waited 3 hours and 38 minutes across the earlier grants. The pilot waited 4 hours and 33 minutes, partly overlapping. The new Mac runs use one ordinary token per step. [Clock breakdown](PART8.md#deep-settlement-on-the-mac)

Earlier 10,000-person deep Mac checks found 48.2 encoded notice-leaf bytes per person and about 101.3 address bytes. Three sampled thin pages used 10.3–10.4 leaf bytes and 100–104 address bytes. Both are storage counts. P7 measures resident memory outside Postgres. [Size price](PART6-PRICE.md) · [Read stages](STAGES.md) · [Retention choice](RETENTION.md)

The revised 64-person smoke used the pinned candidate. The cold observer started within 5 ms of the cutoff in all three cells. The peak Mac diagnostic still missed with 758 ms behind an active save and 317 ms from entry to durable. Quiet and 3.5 saves/s observed the new release in time. All 15 point samples and 379 effects replayed exactly.

### Server command

Use the priority candidate on the first line in a managed exclusive gateway with live priority enabled. This runs the 1,000-person preflight and three receipt-only windows at quiet, 3.5 and 23.5 saves/s. Forecast peak receipt and first answer are 70–300 and 80–350 ms under sustainable load. Record the paired 100,000-person background clocks separately with 64 readers. [Environment, commands and predictions](SERVER.md)

```sh
TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/join/server.ts 100000 "$DX_LAZY_OUT" --receipt
```

The earlier six-window collector replayed all 30 point witnesses and 757 effects at 64 people. It rejects a missing terminal, late sampling cannot count as a hit, and each offer compiled a distinct release absent from the startup set. [Review response](REVIEW2.md)

The experiment uses separate logical scopes. INT1 needs the same-cut Publish, visibility and settlement proof on the scorecard's single physical database at both fresh and one billion records. No acceptance pins, W0 files, workload trace or declared bars moved. [Evidence checksums](PART8-SHA256SUMS)
