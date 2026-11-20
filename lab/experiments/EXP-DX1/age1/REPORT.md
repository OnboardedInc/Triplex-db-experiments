Keep `2859d6b15` for queued aging. Use `93ad03aa3` for the corrected scorecard exporter.
Take `93ad03aa3` for the INT1 merge.
The merged Mac check matched all 120 saves and rejected the fresh database as an aged input.
At 24,000 records per second from the estimated 430 million, the run would take 9.60 hours and cost $10.46.
The driver reads the real starting count and continues only if the observed rate fits the 9.9-hour cap.
The rate needs to reach about 23,000 records per second if the starting count is 430 million.
The model predicts bigger index directories while the lookup trees keep their depth.
The successor drill erased a protected value across both eras, including views held before the move.

# DX-AGE1

Part 1 at `e44ea53dc` matched 112 saves and reached 360,314 and 1,260,314 records. Its successor preserved reads, receipts and feed but raw held views retained erased values. Part 2 uses the Mac only for small correctness. [Part 1 observations](OBSERVATIONS.md)

- [Seed adoption](SEED-ADOPTION.md) compares the exact SCALE1 bulk loader and synthetic AGE1 seed. The full seed business count is 162,456,470 facts. The server command reads the native history count before aging and checks the observed load rate before continuing.
- [Aging arms](AGING-ARMS.md) joins 15,000 native acknowledgements in each original Mac sample. It adds measured client stage timers, a rolling pipeline, W1-shaped physical groups and larger load-only index settings. Adopted solo K retains the intended index workload. Server rates remain predictions.
- [Growth model](GROWTH-MODEL.md) predicts level count, leaf count, directory count and serialized-size estimates per index. It names a counterexample measurement for each operation and includes a separate directory-census peer.
- [Server rung](SERVER-RUNG.md) describes one Linux command and its setup, stopping conditions, exact-prefix restart, quiet and busy schedules, index overlap, fresh JVM reads, pauses and backup/restore seal. The campaign ends at 1B. The 20k prior misses the time cap on the estimated seed.
- The release scorecard is a separate bare-metal run on merged INT1. Its current verifier needs a starting-state and oracle replay extension for SCALE1 seed command identities and the aged head. The ten-deep-account source census does not cover the thin and small accounts in the v0.1 population. This branch has not merged into INT1. [v0.1 handoff](CAMPAIGN.md)
- [Successor erasure](SUCCESSOR-ERASURE.md) describes the source-pinned detached cipher and shared frontier. The test forces a partial publication, then checks replay, held cuts, the ordinary feed and detached-key removal.

## Evidence checks

- Adoption seal and fixture cut compare exact manifest SHA, loader identity, scope/head and observed facts, membership, field values, row bytes, times and revisions. The Mac harness binds fresh container/image, role, disk and slot, git archive, exact loader and SDK artifacts, and seed cut; the server binds the verified original transfer and its held instance.
- Native aging and recovery compare complete normalized ACK/log datom sets including retractions and the exact predecessor revision. The branch uses fresh cut t, dense tape positions, pure tape inputs and indexed operation IDs. Group fidelity adds the W1 physical materializer, equality of oracle/current and interior pins, receipt clocks and feed, plus separately counted physical datoms.
- Server checkpoint/windows compare admitted head and native t, fresh product replies and stored bytes for each timed command, expected field values and feed. The terminal seal also checks exact full backup verification, restore content, attempt/JVM identity and hashes of retained artifacts. Linux runtime and costs remain unverified.
- Erasure tests compare the pre-erasure plaintext control and post-erasure marker, exact published identities and retries, raw native/history probes, keys and ciphertext. The native coordinator binds both scopes and the shared sequence. Local engine bookings and staging bind the fresh attempt and pinned ERASE1 sources.
- No acceptance files or pinned source paths changed. Bulk local evidence stays outside git. No bench server has been contacted for this work.

## Verification

The SDK build, source parsing, rate and count tests, and historical log join completed. The small SQL-backed gates used one ordinary heavy token per run. Any Mac timing is diagnostic. [Evidence manifest](P2-SHA256SUMS)

- The larger load-settings arm verified 1,072 saves and 21,436 logical datoms and took a settled per-index census. Its slot, containers and volume were released. `p2-mac-d-fidelity-arms-load`
- The standard arm verified burst and rolling log identity and W1 grouped log identity on the same tape. Grouping kept the logical behavior and increased the log count to 28,135. Its slot, containers and volume were released. `p2-mac-g-fidelity-arms`
- The exact SCALE1 loader seeded 9,690 facts for 80 people in ten accounts. The adopted copy started with 26,385 native records. It matched 120 product saves, 2,400 added native records, current and pinned reads at six cuts, history, receipts and feed pages. Its slot, four containers and one volume were released. `p2-mac-k-adopted-fidelity`
- The successor drill moved 14 accounts and verified 84 pinned and 28 current row comparisons, two held cuts and the feed before and after an interrupted erasure. It confirmed both sets of keys were gone and both stores still held ciphertext. Its slot, containers and volume were released. `p2-mac-f-erased-successor`
- Retained failures cover the missing W0 build, an unavailable PostgreSQL image, the grouped revision-retraction census, the opaque-token probe, a misread reverse-index claim, a same-catalog restore collision and an integral timestamp in the raw-row oracle. Setup and oracle failures remain distinct from completed comparisons.

## Part 3 integration

Merged INT1 through `cebffdf08` into AGE1. The engine keeps AGE1 and the JVM inventory routes. The Mac gates use ordinary tokens and bind the JVM launch files. PREP1 added authoritative predecessor metadata to compact journals. AGE1 matches that encoder while the handoff accepts the queued pin's earlier journal. The final native suite passed 27 tests and 54,079 assertions. At `7d7f192d4` the solo arms matched 21,436 new datoms and grouping matched its separate 28,135-datom reference. Archives retain their original paths and verified bytes. [Archive checksums](EVIDENCE-ARCHIVES.sha256)

The 1B export binds the hashed seal, immutable checkpoint, roster, restore readback, manifest, attempt and source. Its preflight checks the live catalog ID, count and clocks, both cuts, exact rows and feed bytes, and the final receipt from a fresh tagged peer. At `93ad03aa3` the SCALE1 fixture matched 120 product saves and 2,400 added datoms, refused the fresh cut and accepted the restored aged cut at 28,819 datoms. The v0.1 driver still has to select this input. [Scorecard handoff](SCORECARD-HANDOFF.md)

At 8–16k/s and a 430M seed, about 620–800M fits with three hours reserved. A true doubling needs more than 17.3k/s. An 800M diagnostic can check the proposed tree shape and fixed-width paths when a matched fresh baseline exists. It cannot certify 1B or settle long-run timing laws. [Budget and diagnostic plan](FALLBACK.md)

SCALE1 staged the AGE1 launcher and updated its disk admission at `2a431952a`. The verified full-seed transfer, AGE1 calibration and measurements have yet to appear. [Server comparison](GROWTH-READOUT.md)

The merged package build, 861 Core tests, 437 SDK tests, 17 pooled tests, three retention tests and the pooled TypeScript check completed. The SDK skipped 52 opt-in cases. The root JS gate still flags inherited scripts and unregistered paths, with zero AGE1-specific diagnostics. No acceptance pins changed.
