# Per-event recording

North star P2. Keep the offer-to-durable-ACK clock and observe the waiting intervals in the same attempt. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)

The stack's summary tracing enables JFR in all three JVMs, native binary `:tx/process` capture, and PostgreSQL duration-only logs plus WAL timing statistics. Explicit component lists still select the recorders used by existing ablations. The original allocation replay requests its original component set. Runtime samples record collector names, committed and maximum heap, available processors, CPU throttling, boot identity, wall time and JVM uptime. Unified JVM logs provide pause and safepoint causes and uptime. JFR records wall start and end, with monotonic clock markers once a second and Java monitor and socket waits of at least 1 ms. [JFR events](https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshoot-performance-issues-using-jfr.html)

| Save interval | Evidence |
| --- | --- |
| Gateway receive through submit | Gateway v1 request and `d/transact-async` span start/end. The outer await may include ordering before submission. |
| Submit through peer response | Gateway future wait end. Exact native transaction joins require the same source, slot, boot, database hash and native t. The native process duration includes queue, apply and durable storage. Its inferred start uses the native log event endpoint and the emitted duration. |
| Serial transaction work | The authored Triplex transaction function measures its own interval. The native apply and `io-stats` give durations and read counts for the same native transaction. These totals may overlap, and grouped members share a native transaction. |
| Transactor queue, commit to disk and socket handoffs | The residual includes native queueing and other closed engine work. PostgreSQL statement-completion records have backend/session/line IDs and wall time. Their starts are inferred from the logged duration. PostgreSQL WAL counters measure the sample interval, and SQL sessions have no Datomic t. Socket or monitor events identify a JVM thread and interval. They can overlap a save without establishing causality. |
| Peer response through gateway response and client ACK | Gateway response end, client trace and ACK ledger. Mac and Linux boot clocks are kept separate. |

Datomic's metrics callback carries process-wide storage get/put and log write distributions. A Datomic I/O-stat read count is a native API counter. PostgreSQL duration logging omits SQL text. Guest wall timestamps map to the transactor's boot clock through retained JFR anchors. A clock step or a missing bracket leaves a wall-only record. Extended-protocol Execute and an implicit commit at Sync can cover different intervals. WAL sync counts can aggregate commits, and `open_datasync` can put durability cost into the write counter. [Datomic I/O stats](https://docs.datomic.com/reference/io-stats.html) · [Datomic metrics](https://docs.datomic.com/operation/monitoring.html) · [PostgreSQL logging](https://www.postgresql.org/docs/17/runtime-config-logging.html) · [PostgreSQL WAL counters](https://www.postgresql.org/docs/17/monitoring-stats.html)

## Audit

- `event-smoke.ts` derives the input on this run's nonce-specific scope. It compares five returned values per save with the command and then reads every assertion ID from the database. Its exclusive-create ledger includes observed transaction t, source, slot, nonce and trace ID.
- `event-joins.mjs` checks the live role IDs and startup clocks, same-attempt JFR SHA-256 and event counts, ordered gateway spans and exact SDK/database/native-t joins. PostgreSQL timings are checked inside the attempt on the original server. WAL samples must keep the same statistics epoch. No SQL or JFR overlap alone earns a per-save attribution.
- `postgres-events.mjs` emits parsed duration bytes with their recorded role and backend. Clock-qualified rows require a continuous region of the transactor's own anchor sequence. `native-recording.mjs` checks the running container IDs and process starts, source and slot of each recorder, binary content hashes, one shared boot, SQL coverage and a bound WAL bracket before writing its collection inventory.
- The summary trace changes keep the existing finalize/report evidence checks. The ablation reads back actual PostgreSQL flags. Collection on a physical host and the two-percent save p50 bar remain to be measured.

## Recorder cost on bare metal

Predict a 0.5–4% p50 increase over the previous summary recorder at this small save shape. PostgreSQL duration logging and JFR event submission can both affect the median. The 2% bar lies inside that range. Compare the mean of the two treatment medians with the mean of the two controls and retain control drift. Use the fresh stacks, exact input ledger and saved clocks for all four arms. Mac measurements are diagnostic.

```sh
env DX_BARE_METAL=1 DOCKER_HOST=unix:///var/run/docker.sock node lab/bin/heavy.mjs --label DX-TAIL1-trace-cost -- \
  python3 lab/experiments/EXP-DX1/tail1/trace-cost.py \
  "$DX_TAIL1_ARCHIVE" "$DX_TAIL1_IMAGE_RECEIPT" "$DX_TAIL1_OUTPUT"
```

The command uses the pinned stack and five-field commands from the correctness fixture. The control keeps the previous Node and gateway summary recording. This compares the incremental cost of the new recorders under a bounded physical campaign. Scorecard-scale recorder cost remains a separate observation. The comparison checks four fresh slots, exact source, matching input and placement, actual role IDs and cleanup, and each arm's sealed command ledger. Any incomplete arm stops the comparison.

## Local correctness proof

`part3-events/events-f2` used source `b9f4af923`, a signed Java 21 Datomic image, and an ordinary heavy token. The fixture matched all 192 SDK acknowledgements to the gateway and native database/t records and verified 960 assertion IDs at readback. Writer, reader and transactor exports contained 11,022, 5,938 and 17,403 events. PostgreSQL mapped 2,305 duration records to the guest clock and preserved 15 wall-only records. Its WAL samples spanned 523 syncs on the same statistics epoch. Each owned container and the SQL volume were released. The first attempt reached the native joins and exposed discarded PostgreSQL stderr. Its evidence remains indexed. [Evidence hashes](SHA256SUMS)

## Shared-database campaign audit

- The integrated physical launcher reserves a separate physical core for the writer and removes it from the driver's placement. It reads the JVM process flags before the barrier and binds collector and heap evidence to the same container IDs and process starts as the recorder. The collector checks the same source, slot, nonce, actual JVM flags, recorder bytes, qualified SQL records and WAL samples after the attempt and verifies cleanup. The existing independent receipt, live readback and matched input checks still bind the campaign.
- The receipt shortcut remains opt-in through `receiptPredecessorAttributes`. Eligibility comes from the exact returned row identities and native receipt binding. Known retirement invalidates its cache. The transactor still validates live IDs at the serial point and a conflict can retry through the existing snapshot path. The native suite reads back the asserted rows and verifies intervening writer, retirement, erasure and exact-cut cases.

The JVM1 merge still needs to preserve its explicit Java 21/25 policies and restore hook alongside this branch's gateway, SQL and JFR setup. The local gate and option checks exercise TAIL1 on the current integration base. The fresh and 1B scorecards require the separately maintained scorecard wrapper and the merged project gates.
