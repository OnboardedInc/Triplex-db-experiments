# Publish at the held scorecard size

Ten accounts of 100,000 people share the original SCALE1 database. Its pinned manifest attests 162,456,470 facts at cut 87,002. The runner opens account zero at that cut, verifies its native membership witnesses, and adds only the joined notice census, origin, calendar and tail. It does no loader replay or policy precomputation. The receipt uses the existing joined four-change transaction. Both settlement archives also live in that database. The benchmark keeps one fixed W0 valid time and the runner owns the offered field saves.

## Prepared-copy command

Use the matching clean v0.1 build and tool path from [the scorecard setup](../v01/SERVER.md). Supply the held SCALE1 transfer directory and published image and transfer digests. Keep its original directory tag. Supply the original stopped PostgreSQL 17 directory, a private stopped copy with identical data and control file, and a private WAL directory on the other device. Copy the template's WAL bytes to the dedicated directory and point **the copy's** `pg_wal` link at `/wal` for the container mount. The original stays stopped and read-only. There is no logical restore. The runner retains the prepared copy and its WAL for the caller to archive or discard.

```sh
sudo env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
  bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
  "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
  "$SCALE1_PGDATA" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
```

The command takes the native queue lock, binds the exact source and image build, and checks the live mounts, durable PostgreSQL settings, JVM settings and both gateway identities. The server uses three transactor cores, 24 GiB heap, 16 GiB object cache, Java 25 ZGC, and four write-gateway cores with Java 21 G1. The read role uses one separate core. The on-copy budget is 87 minutes plus 90 seconds for shutdown. Allow up to 8 minutes to boot and verify, 2 minutes for membership and notice enrolment, 40 minutes for the first release's concrete state, 10 minutes for archive readback and oracle replay, and 26 minutes for twelve traffic windows, preload and drain. These are allocations.

The twelve 100-second windows use the scorecard's ordered-ID subject writer with the merged `barrier6` and `rolling6` arms. Each rate and mode has one no-Publish control and 20 Publish offers at five-second intervals. The two modes share the prepared database and alternate order across rates. Each pinned field-read tape uses the same loader cut. Writes prepare against each window's current cut. A receipt takes precedence over the next turn once the current turn drains. Because all accounts share the transaction cut, the harness fences submissions from all ten accounts during that brief handoff. The live offer clocks keep running. The native verifier checks every save's exact command and journal identities, including through each receipt predecessor. Readers use the existing 64-seat pinned field tape. A connected demand reader checks the first answer and four independently chosen roster positions at the one-second deadline. It records actual starts and late samples. This is an explicit stress cadence. The seed and regular workload remain unchanged.

The first R1 receipt also prices one complete background settlement with no save offers. It reads back every changed value and notice entry and compares them with the independent W0 oracle. The later burst keeps every receipt and owed recipe durable. It does not settle all 120 receipts inside this budget. The command reports the 100-second receipt floor and one-second target separately from background settlement. Save and read p99 report both against the quiet no-Publish window and against the no-Publish window at the same rate. Offered, acknowledged, expired and pending saves and missing read samples are retained.

INT1 `f8057d113` supplies both modes through the same writer dispatcher. Rolling releases the individual durable credit and reserves a quiet-account slot. Publish fences the same six-credit maximum in either mode. Each mode uses its own matched no-Publish controls. PREP1's forecasts and gates inform the predictions without qualifying this campaign.

## Forecast before bare metal

| Writer and account / neighbours offers per second | First correct p50 / p99 | Within one second | Read / save p99 vs quiet | Saves stored/s account / all | Pending at end + 1 s |
| --- | --- | --- | --- | --- | --- |
| Barrier 3.5 / 0 | 25–70 / 60–180 ms | 20/20 | 0.9–1.3× / 0.9–1.5× | 3.4–3.5 / 3.4–3.5 | 0 |
| Barrier 23.5 / 211.5 | 45–140 / 130–450 ms | 19–20/20 | 1.2–1.8× / 2–6× | 21–23.5 / 200–235 | 0–1,000 total |
| Barrier 39.4 / 354.6 | 60–220 / 200–900 ms | 18–20/20 | 1.4–2.2× / >6× | 24–34 / 235–340 | 1,000–10,000 total |
| Rolling 3.5 / 0 | 25–70 / 60–180 ms | 20/20 | 0.9–1.3× / 0.9–1.5× | 3.4–3.5 / 3.4–3.5 | 0 |
| Rolling 23.5 / 211.5 | 40–120 / 100–400 ms | 19–20/20 | 1.2–1.8× / 1.5–4× | 22–23.5 / 215–235 | 0–500 total |
| Rolling 39.4 / 354.6 | 55–180 / 160–800 ms | 18–20/20 | 1.4–2.2× / 2–6× | 30–39.4 / 285–380 | 0–8,000 total |

All three rows should clear the 100-second receipt floor. I forecast 16–40 minutes to store the first release's values and 20–45 minutes to record its individual notices on the shared database. The nearest benchmark is the 10,000-person Mac run at 216 and 254 seconds under light traffic. That is a diagnostic scaling input. Competing archives and storage at 162 million facts may raise those clocks. Rolling credits should improve ACK rates and reduce pending offers before reducing first-answer latency. The current turn drain is already short at 25,000 people. A repeatable one-second miss at sustainable 235/s, a receipt outside the 100-second floor, more than 1.5× live p99 against a sustainable same-load control, growing matched-control-adjusted backlog, or any oracle mismatch undermines the priority design. Saturation in both peak controls still fails the live service bar versus quiet and does not isolate Publish.

## The old peak backlog

| 39.4/s peak stage | Offers | Actual in-window ACKs/s | Pending after +1 s | Offer-to-ACK p99 | Admitted-save p50 / p99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| No Publish, 30 s | 1,182 | 27.90 | 388 | 15.03 s | 31.23 / 88.04 ms |
| Publish every five seconds, 150 s | 5,911 | 25.39 | 2,527 | 119.67 s | 35.33 / 84.55 ms |

The save-only control accounts for 11.50 of the observed 14.01 saves/s capacity gap, about 82%. The 30 Publish turns occupied 792 ms of 150 s, or 0.53%. At the save-only service rate that displaces about 22 saves in 150 s, about 0.15 saves/s or 1% of the peak gap. That is a service-time estimate. The remaining 2.36 saves/s is confounded by the short, earlier control and the treatment's reader, preparation, JVM and native-write work. Median preparation and native-ACK stages moved from 9.60/20.69 ms to 11.65/22.06 ms. The run already saturated its serial save path and used one core per JVM. The archive has no paired settings change to separate CPU from serial service. It did not use the six-credit fair-turn barrier, so that barrier explains zero of this particular backlog. The tuned full-size scorecard's 342.90 ACKs/s at 394 offers/s is a different native run, with no priority Publish or barrier comparison.

Assumption for owner confirmation. One Publish per account per hour in a busy deployment period, with occasional correction bursts. The target specifies one release scenario and no production arrival rate. A Publish every five seconds is a queue stressor.

## Evidence and audit

The backlog numbers use the original BM1 peak `full/cell-2/observed.json`, its issued tape and the exact archived `publish-priority.ts` control from the `d767ae051` handoff. The two copied archive digests match TRANSFER. Screen and treatment rates count actual ACKs in their respective time windows. Pending counts follow the offered tape at +1s. [Evidence digest index](PART9-SHA256SUMS)

- Adoption and setup compare pinned transfer bytes, selected scope identity and native loader claim, every selected account membership root at the original cut, and exact joined census readback. A new attempt and original seed head are required. Physical server evidence adds the template control, copy and WAL mounts, serving JVM boots and runtime build checks.
- Each activation reuses the native checked command receipt. Its marker and owed recipe match the submitted release, epoch and exact predecessor. The tail and recipe assert together. Each offered save is bound by expected field-change digest, command and transaction in the same native journal. Foreign positions or unresolved outcomes stop certified publication.
- Foreground observations use fresh fixed offsets, unique request and attempt identities, the connected peer's own clocks and sampled answer bytes compared to independent authored facts plus verified field writes. Late deadline starts cannot count as hits. Background completion requires read-back chain and per-value/notice content against the independent oracle at its exact cut. Output is a diagnostic or an observation, with no new acceptance verdict.
- No acceptance file or pinned acceptance input changed. The original W0 trace and verdict rules remain in force.
