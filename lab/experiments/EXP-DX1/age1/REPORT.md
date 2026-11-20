All accounts stay in one Datomic database.
The one-billion server candidate is `3af0e981d`. The small Mac gates are pending.
The existing ten-account seed is estimated at 430 million native records. The driver reads the actual count.
At 24,000 records per second, the first billion is forecast at 9.60 hours and $10.46.
The first rung stops within 9.9 hours. It continues after calibration only if the measured rate fits.
Earlier Mac diagnostics put 57 extra seconds in the slower run's native write window.
The model predicts more index segments and directories while the trees keep their depth.
The successor drill now checks one erasure across both eras, including views held before the move.

# DX-AGE1 part 2

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

The SDK build, source parsing, rate and count tests, and historical log join completed. The pinned SCALE1 source produced five frames with 9,690 facts for 80 people, and the Clojure adopter validated that fixture manifest. The small SQL-backed gates use one ordinary heavy token per run. Any Mac timing is diagnostic. [Evidence manifest](P2-SHA256SUMS)

- The larger load-settings arm verified 1,072 saves and 21,436 logical datoms and took a settled per-index census. Its slot, containers and volume were released. `p2-mac-d-fidelity-arms-load`
- Retained failures cover the missing W0 build, a PostgreSQL image unavailable at container creation, JSON escaping in the opaque-token probe, and the grouped revision-retraction census. Setup and oracle failures remain distinct from completed comparisons.
