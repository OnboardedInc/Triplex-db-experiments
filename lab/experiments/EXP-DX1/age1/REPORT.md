Keep commit `2859d6b15` for the queued one-billion server run.
Take `f073d8058` for the INT1 merge candidate. The merged Mac checks are queued.
The Mac check on the server revision adopted a small copy and matched all 120 saves.
At 24,000 records per second from the estimated 430 million, the run would take 9.60 hours and cost $10.46.
The driver reads the real starting count and continues only if the observed rate fits the 9.9-hour cap.
The rate needs to reach about 23,000 records per second if the starting count is 430 million.
The model predicts bigger index directories while the lookup trees keep their depth.
The successor drill erased a protected value across both eras, including views held before the move.

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

The SDK build, source parsing, rate and count tests, and historical log join completed. The small SQL-backed gates used one ordinary heavy token per run. Any Mac timing is diagnostic. [Evidence manifest](P2-SHA256SUMS)

- The larger load-settings arm verified 1,072 saves and 21,436 logical datoms and took a settled per-index census. Its slot, containers and volume were released. `p2-mac-d-fidelity-arms-load`
- The standard arm verified burst and rolling log identity and W1 grouped log identity on the same tape. Grouping kept the logical behavior and increased the log count to 28,135. Its slot, containers and volume were released. `p2-mac-g-fidelity-arms`
- The exact SCALE1 loader seeded 9,690 facts for 80 people in ten accounts. The adopted copy started with 26,385 native records. It matched 120 product saves, 2,400 added native records, current and pinned reads at six cuts, history, receipts and feed pages. Its slot, four containers and one volume were released. `p2-mac-k-adopted-fidelity`
- The successor drill moved 14 accounts and verified 84 pinned and 28 current row comparisons, two held cuts and the feed before and after an interrupted erasure. It confirmed both sets of keys were gone and both stores still held ciphertext. Its slot, containers and volume were released. `p2-mac-f-erased-successor`
- Retained failures cover the missing W0 build, an unavailable PostgreSQL image, the grouped revision-retraction census, the opaque-token probe, a misread reverse-index claim, a same-catalog restore collision and an integral timestamp in the raw-row oracle. Setup and oracle failures remain distinct from completed comparisons.

## Part 3 integration

Merged INT1 at `51d0aff35` into the AGE1 candidate. The only conflict was the shared heavy runner. The merge uses the INT1 implementation, and AGE1 uses ordinary tokens. The native gate mounts the exact merged source and compiles the server rung against it. Previous Mac attempts were compressed with entry-by-entry byte checks, and the older manifests refer to paths inside the archives. [Archive checksums](EVIDENCE-ARCHIVES.sha256)

The 1B seal exports the exact roster, database identity and original and final replay ledgers. The queued revision can use the exporter after sealing. The export binds the exact hashed seal, immutable checkpoint, roster, restore readback, manifest, attempt and source. The preflight checks live count and clocks, both cuts, fixed row and feed witnesses and the final receipt from a fresh tagged peer. The Mac fixture checks that the old head is refused and exercises the positive comparison only at small size. The v0.1 driver still has to select this input. [Scorecard handoff](SCORECARD-HANDOFF.md)
