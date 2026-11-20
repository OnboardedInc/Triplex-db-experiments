# DX-JVM1
The writer remains on one core with Serial during this comparison.
The proposal gives the transaction process three server cores and asks it to do smaller index jobs.
The read process gets three cores and keeps its larger cache.
All three processes record the Java settings they actually started with.
The server command compares four configurations and reports the cost to a quiet account.
The earlier Mac run showed pauses in all three processes. Those times describe the shared Mac.
Fresh candidate measurements and a physical timing run are still needed before choosing defaults.

## Evidence and operation

- P1, P2, P6 and P8 cover pinned reads, durable save time, quiet-account delay and import interference. [Scope](../../../SCOPE.md) · [North star](../../../NORTH-STAR.md) · [Targets](../../../TARGETS.md)
- [Inventory](INVENTORY.md), [vendor sources](SOURCES.md), [settings and reasons](CONFIGURATION.md), [Mac measurements](MAC.md), [before-run predictions](PREDICTIONS.md), [server command](SERVER.md).
- The server command measures the shared database using the exact W1 field schedule and a sealed seed. It still needs a physical rehearsal to establish runtime and compare the four arms.
- DX-JVM1 Mac evidence belongs in the durable experiment directory. Historical DX-TAIL1 figures and hashes are indexed in the Mac and inventory notes. The branch keeps the candidate opt-in.
- Successive measurement leases held off Mac inventory and dependency setup for over an hour. The inventory, setup and replay remain queued. Full launch readback, alternating replay, startup timing and candidate measurements are still pending. Historical logs lack complete final HotSpot flags for the bench and do not establish private SQL pool values.
- Launchers for T1, SCALE1, W1 and BM1 use the instrumented split-stack path. The managed engine and image entrypoint capture each embedded role separately. The managed image needs a rebuilt source pin before adoption.

## Evidence audit

- JVM readback checks one selected collector, full flag output, VM initialization, unchanged container restart metadata and process start ticks. Experiment profiles additionally validate effective heap, flags, placement and cgroup caps against the chosen role.
- The Mac replay checks the archive hash, full offer identities and spacing, balanced source/slot/nonce receipts, readiness, distinct post-restart JVM boots, cleanup and sampled oracle answers. Its restart and index analysis binds the measured interval to those same process identities and acknowledged writes.
- `server.ts` checks the sealed seed identity, dump bytes, seed cut, every W1 offer and durable field or journal answer before publishing `field-summary.json`. The Part 2 historic read probe also compares returned rows with the frozen seed population during each window.
- Part 2 `result.json` and `comparison.json` additionally require fresh output, matching prepared image and actual JVM flags, identical process identity before and after, unrotated UTC-offset GC logs from the arm's own boot, hashed observed evidence, seed consistency, owned cleanup, and the arm time budget. These are measurements without an acceptance verdict.
- Static checks covered Bash and Node syntax and all eight platform/arm profile readback fixtures with a stale-container rejection. No acceptance verdict was promoted. The runtime readback and benchmarks require live validation. The acceptance contract was left intact.
- Image source byte changes, before → after:
  - `lab/config/datomic/entrypoint.sh` `93ade9ed9cf4c741230b217b8c8a42b148a8d7152a1ee887ea7fca515cfe9c2d` → `e704d4148351a0680c067d45d7f703e993c0b7a61d19f75c6381f354f606b9f2`.
  - `lab/config/datomic/transactor.properties` `762126e7626dae616553c9675fc5453ef7da01c10362e735982920aefef609cc` → `404281c4d749f2bd785297d592d1a052f6215ec79a4ccf2fe859a65753b29628`.
  - `packages/datomic/gateway/src/triplex/gateway/jfr.clj` `a703ed7772ab7fcdd62effde8135bc62f6b4325046a0f893a1165c8c08474d94` → `0c435b193a369f6dee40059452a41b9719046bac15bceaf06ac36e514e40994b`.
  - `packages/datomic/gateway/src/triplex/gateway/native_settings.clj` `0c3a527e0487f05cf93a033da059ed3175ab704f8fb510475ac120fe03c2b755` → `f77e08c1f8ad493c8faad2dfc79149562db19e1135de78f7340c46e77d8ea90b`.
