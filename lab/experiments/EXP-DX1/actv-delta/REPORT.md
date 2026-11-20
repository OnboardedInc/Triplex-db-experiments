At 3.5 saves a second, all 800 Publishes recorded the release and what it owed, and the first correct read arrived within one second.
With one Publish every five seconds, the slow end was 382 ms in queue order and 373 ms with priority.
With one Publish every second, it was 403 ms in queue order and 411 ms with priority.
The Mac fell behind on saves alone at 23.5 and 39.4 saves a second, so those rates have no Publish timings.
The native check proved that the release includes a save that goes first and excludes a save that goes after it.
The bare-metal model puts one priority Publish at 140 to 169 ms if joined saves can match the measured server save times.
The release record and notice recipe were durable in this test. The clock for storing every changed value is separate.
The joined path has the priority change and the tests. The older DELTA path remains available to reproduce its results.

North star P5 with P1 and P2 under load. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The isolated Mac run at `a52f7937c` used 10,000 deep people, two neighbours each offering 1.6 saves/s, and 64 readers offering one read each second. Each of the eight admitted blocks started from the same checked R1 state and reopened both Datomic roles. The fixed schedule kept 200 offers per cadence and policy. The oracle checked 180,884 responses across the measured blocks and capacity screens. There were zero misses, stale reads or Publish retries. [Timings, save p99, CPU and phase clocks](PART5.md#matched-mac-results)

The high-rate screens acknowledged 385 of 706 and 421 of 1,182 saves within their 30-second windows. Both queues grew. The earlier four-Publishes-per-second run measured a saturated system. A first sparse run also lost save capacity after 300 scheduled releases on a reused account. The matched rerun reset release history and native process state together. [Capacity checks and earlier run](PART5.md#matched-mac-results) · [Part 4 evidence](PART4.md)

For DX-ACT1, merge `a52f7937c` for the complete joined study, or `bc01028b0` for priority and the native order gate. The product changes are `9895f926b` and `eb08bd32f`. Native checks ran on joined code from `541326043` with those changes. The current activation head checked at `46e838fe7` adds documentation only. Wire saves and Publish in the scope to the same `AccountAdmission`. The `--one-seed` runner already uses that wiring. Joined uses the shared declarations, posting codec and deadline checker. [Exact handoff](PART5.md#joined-handoff)

The one-second record endpoint combines the native release and owed-recipe write with the first exact response. The offer-to-turn clock, transaction, reader learning and first response are timed separately. The estimated bare-metal priority p99 is 144, 140 and 169 ms at 3.5, 23.5 and 39.4 saves/s. At the highest rate, about 19 ms of added mean save service would exhaust the model's capacity. Literal storage and the joined path's write price remain separate measurements. [Law and assumptions](PART5.md#the-latency-law-and-bare-metal-forecast) · [One-seed server command](PART4.md#one-seed-server-campaign)

The prior DELTA audit at `d2cda11f0` covers the 23 publication schedules, two crash stops, the record/stored split and the 6.68% WAL increase. [Earlier evidence](ACTAUDIT-SHA256SUMS)

The receipt audit binds checks to the native nonce, source/build bytes, slot owner and re-opened R1 image. It lists the save, release, independent read, deadline and order checks. The local lease was released and its three containers and one volume were removed. The acceptance pins, W0 and frozen trace are unchanged. [Receipt audit](PART5.md#receipt-audit) · [Evidence index and checksums](PART5-SHA256SUMS)
