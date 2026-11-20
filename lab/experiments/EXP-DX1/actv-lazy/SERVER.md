# One deep account on the server

Predictions are planning estimates from the local compact calibration and the independently projected deep input inventory. An independent 1,000-person deep fixture census predicts 1,000 changed owners, 5,759 output rows and 799 changed work rows for R1 to R2. A broad deep release can change the due date for every person, so the compact result scales poorly to the deep profile even when the expanded index can supply every input. The numbers below are offer to durable, then to the first correct connected answer.

| Publish at 100,000 deep people | Quiet | 3.5 saves/s | 23.5 saves/s |
| --- | --- | --- | --- |
| Receipt only | 0.04–0.12 s, then another 0.02–0.05 s | 0.05–0.22 s, then another 0.02–0.07 s | Same service cost plus the live queue. About 5 s of queue if saves average 50 ms in the first 29 s. |
| Staged concrete values | 10–25 s, then another 0.02–0.05 s | 10–26 s, then another 0.02–0.07 s | Same work plus the live queue. About 15–30 s total with the 50 ms assumption. |

The staged estimate includes expanded index reads, cold workers, encoding the deeper change set and bounded writes. At one million deep people the analogous work projects about 100–250 s. The one-frame variant has a 4 MiB ceiling. A receipt carries the exact input, prior release and owed recipe in its marker transaction. The separate field for individually durable owed notices is null. In staged mode the native marker ACK is also the point through which all concrete values are readable. These predictions use the Mac to estimate work and do not predict fleet p99.

Use a clean checkout of the pushed experiment branch with built workspace packages. Attach the environment from the bench operator’s exclusively reserved Datomic slot. It supplies the slot owner file and gateway endpoint. Set `DX_LAZY_OUT` to a new, empty output directory for this attempt. This command keeps the receiver offline during measurement, runs the native small preflight and then six windows on one freshly seeded account.

```sh
TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1 TRIPLEX_DATOMIC_LAYOUT=lean node lab/bin/heavy.mjs --label DX-ACT1 -- node --experimental-strip-types lab/experiments/EXP-DX1/actv-lazy/join/server.ts 100000 "$DX_LAZY_OUT"
```

The loaded windows issue 210 and 1,410 real saves over 60 seconds. They record offered and entered clocks so queued saves and a queued Publish remain included. An independent one-second probe runs even if Publish is still working. The runner keeps each offer, native receipt, returned bytes, physical comparison and ordered receiver proof. It reports misses individually. A production verdict also needs the full fixed-trace interference and fault matrix.
