Most of a roughly 90 millisecond database stall was spent waiting.
The new writer checks one database version for a group of saves.
On the smaller database it added under two milliseconds to apply a group of eight.
On the larger database it used the fast path twice in twelve batches and completed fewer saves per second.
The writers matched on 216 receipts and 1,392 historical reads.
After a restart both saves returned their original receipts.
Lean erasure left values in the change feed and allowed ID reuse under either owner.
The benefit so far is shorter bursts on small databases.

**North star.** P2 durable saves, P1 exact cuts, P3 exact feed and P6 account isolation. [Scope](../../../SCOPE.md) · [Priorities](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
**Part 1.** Git `0bcc9ec55` holds the original report. At 235 offered saves/s, full-group median native apply moved from 4.2/5.2 to 89.0/89.8 ms with the original prepared guard. `live-01/native-cost.json` contains the earlier joined results.
**Profile.** `guard-deep-01` drained all heavy lab slots and distributed 96 edits at 32 outstanding across 192,000 seeded facts, the part 1 depth. The one-CPU container still shared its limit among the writer, gateway, driver and PostgreSQL. Earlier diagnostic boot, transported-witness and I/O context failures are retained. Timing and I/O samples join the exact receipt to native t, VM pressure and cgroup throttling.
**Measured floor.** Two shared ABBA windows at 32 outstanding and 15,360 seeded facts per arm each captured 11 eight-save appends per arm. W1/basis median apply was 2.14/2.94, 1.31/1.86, 2.62/4.35 and 1.76/3.05 ms. Matching median bracketed VM pressure was 52.8/50.8%, 43.4/51.2%, 64.8/58.8% and 54.7/54.0%. The observed increase was 0.07–0.22 ms per member. The uninstrumented full guard medians were 2.51 and 4.17 ms at 49.9% and 61.5% pressure. [Checksums](SHA256SUMS)
**Where the long apply went.** At depth, ten full prepared groups had median native apply 103.99 ms and guard elapsed 93.28 ms with 8.47 ms of writer CPU at 57.2% VM pressure. In the I/O arm at 57.8%, the guard made a median 13.5 SQL reads in 4.0 ms of counted SQL elapsed. Four groups spent 82–95 ms inside SQL calls at 51–62% pressure. At t=2486, one revision check took 86.29 ms with 0.81 ms CPU and 0.10 ms in SQL at 58.6% pressure. All sampled I/O group brackets throttled in every sampled period. The SQL counter includes time waiting to run. W1 also reached 85 ms at 53.0% pressure in the shallow burst.
**Deep coverage.** W1 drained 19.94 saves/s at 46.1% median VM pressure. Basis drained 18.15 at 55.9%. Two of 12 multi-save batches certified, both through point checks, with zero submitted replays. The sole certified eight-save group took 5.67 ms native apply at 57.7%. W1's eleven full groups had a median of 11.44 ms at 46.1% pressure. The end-to-end result includes the cost of preparation followed by reference fallback.

| Check | Sections/group | Elapsed / CPU ms per group at 57.2% | Elapsed / CPU ms per member | SQL reads per group / member at 57.8% |
| --- | ---: | ---: | ---: | ---: |
| Scope and feed flags | 1 | 0.045 / 0.044 | — | 0 / — |
| Logical head and clock | 1 | 0.034 / 0.032 | — | 0 / — |
| Function revision | 8 | 0.107 / 0.094 | 0.013 / 0.012 | 0 / 0 |
| Subject revisions | 8 | 45.048 / 4.197 | 5.631 / 0.525 | 7.5 / 0.94 |
| Retirements | 8 | 1.294 / 1.089 | 0.162 / 0.136 | 1 / 0.13 |
| Historical assertion IDs | 8 | 3.774 / 2.970 | 0.472 / 0.371 | 6 / 0.75 |
| Journal absence | 8 | 0.075 / 0.071 | 0.009 / 0.009 | 0 / 0 |
| Native claim and operation uniqueness | 8 each | 0.008 / 0.005 and 0.009 / 0.005 | 0.001 / 0.001 each | 0 / 0 |
| Shared uniqueness and redundancy prefetch | 2 | 0.013 / 0.011 | — | 0 / — |

**Candidate.** `TX2_PARALLEL_PREPARE=1 TX2_PREPARE_GUARD=basis` validates all members against one physical database value. The existing W1 basis guard protects the exact data, even across non-Triplex appends. Workers reuse matching drafts or refresh them on that basis. A covering historical range can prove all new IDs unused, with exact point checks for an occupied range or unsupported keys. Normalized subject EIDs eliminate repeated owner upserts.

| Removed native check | Dependency fenced | Negative fixture |
| --- | --- | --- |
| Scope, feed and installed function | The physical basis changes on schema, feed or function publication | Changed schema hash, feed flag and writer function |
| Head, clock and revisions | The same basis binds logical head, clock and all subject or predicate revisions | Logical append, subject revision and independent predicate revision |
| Retirement, journal and history reads | The same basis binds exact old bytes, journal absence and historical presence | Retirement marker, occupied journal, historical ID and range endpoint |
| Owner resolution and claims | Snapshot resolution plus native unique values for claim and operation IDs | Owner revision and duplicate claim at the exact same basis |
| Physical excision | Historical excision requests exclude a basis from certification | SQL excision between proof and apply and a fresh proof after the watermark |

**Scheduling.** Prepared drafts can start while another group is pending. A certified submission refreshes them against the actual prior append. Both the full witness and W1 reference paths remain available. Definitive refusal replays through W1. A lost reply resolves from its durable identity.
**Parity.** `basis-parity-02` matched the reference, full witness and basis writers over four randomized tapes in compact and ordinary layouts. Pinned O-REPLAY matched 216 receipts and 1,392 reads. A same-subject chain shared a physical append through the reference writer. All 12 fences matched the expected write, refusal or replay, including a duplicate claim with no intervening transaction. All six older window cases passed.
**Fix integration.** WFIX through `0f92704d2` carries ordered admission, scope-maintenance ownership, SDK duplicate recovery and readback. Both writers use the stored-row stamper, including compact journal rows. Same-subject chains continue through the reference writer. With the basis option enabled, `wfix-01` passed 98 native assertions, 12 SDK tests and two W1 readback/feed tests. `wfix-oracle-01` matched the full change feed and resumed read in all three layouts against pinned O-REPLAY.
**SQL restart.** In `recovery-02`, a certified group committed at native t=1044. The process stopped with zero replies, and PostgreSQL and the transactor restarted on the same data. Both receipts returned at positions 9 and 10 and clocks 1008 and 1009. Replacements with the original operation ID or a fresh ID under the same claim resolved to their original receipts. The head stayed at 10, and pinned rows, stored retractions and the resumed feed matched the fixture.
**Lean erasure failed.** In two independent scopes, the actual excision watermark reached t=1054. Certified data prepared before excision was refused and a fresh certificate declined. Native row history lost the marker, while the journal kept it. The first reuse of the ID under either owner committed at position 12. This reproduces the reference limitation and blocks lean promotion.
**Evidence audit.** `manage.py` binds frozen files, image, slot and attempt. `observe.clj` binds times and read counters to the attempt. `probe.ts` checks receipt/feed and pinned rows, and `read_guard.py` joins them to native t, append and pressure. Completed-arms summaries require actual failure, observer shutdown and the fresh completed arm events. `gate.py` checks scope, source, JAR hashes and pinned O-REPLAY bytes. `read_recovery.py` binds process stop, durability settings, native t, original claims, pinned rows, feed and watermark. `live.ts` preflights the two fresh scopes, active function, options, source and launch nonce. A prepared ACK matches operation, position, clock and t in the actual native report. The SDK checks the recovered command and durable tuple on the attempted database. [WFIX audit](../wfix1/REPORT.md)
**Evidence.** `guard-deep-01/guard-summary.json` holds per-member durations and reads. The table uses group medians and divides member totals by eight. The ten groups had 67 revision, 68 history and 11 retirement SQL reads. Attempts sit under `evidence/DX-PREP1`. Acceptance content hashes are unchanged. [Checksums](SHA256SUMS)

**Capacity and server forecast.** Shallow bursts drained at 46–68 saves/s on W1 and 60–79 on basis under the pressures above. Single saves use W1. The deep coverage and throughput give no measured case to spend server time on this as a capacity fix. Assuming that fallback mix, at 50 offered/s predict both arms at 49–50 ACKs/s and p99 of 25–55 ms. At 235/s predict W1/basis at 210–235/200–235 with p99 of 60–160/60–180 ms when they keep pace and up to about 7/10 s of queued p99 after one minute otherwise. At 394/s predict 210–300/200–300 ACKs/s and 19–52/19–58 s of queued p99 over one minute. These are bare-metal projections for disposable scopes.
**Server comparison.** Run both disposable gateways from the same merged source, with verified source hash and a shared launch nonce. Set `TX2_WRITE_OPTIONS_ATTEMPT` to `DX_PREP1_OPTIONS_ATTEMPT` and `GATEWAY_SOURCE_SHA256` to `DX_PREP1_SOURCE_SHA256` on both gateways. The driver checks the installed function and options on each opened scope before measuring.
Set `TX2_GROUP_COMMIT=1 TX2_LIVE_PRIORITY=1 TX2_GROUP_MAX_MEMBERS=8 TX2_PREDECESSOR_LOOKUP=1 TX2_GROUP_REUSE_PREPARED=1 TX2_GROUP_QUEUE_CLOCK=1 TX2_GROUP_STAGE_CLOCK=1 TX2_GROUP_FAST_REPLY=1 TX2_BULK_ROWS=2048 TX2_BULK_BYTES=1048576` on both. On B use `TX2_PARALLEL_PREPARE=1 TX2_PREPARE_GUARD=basis`. The foreground schema is strict lean V3.
`node --import tsx lab/experiments/EXP-DX1/prep1/live.ts "$DX_W1_URL" "$DX_PREP1_URL" 60`
