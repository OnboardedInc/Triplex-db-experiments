# Guarded Reach and save changes

Reach now reuses a protected reference only at the same data position, native cut, entity revision and erasure sequence. An older SDK receives inline guarded replies. The new SDK checks the sequence before resolving a reference, checks it again after waiting for another response, and requests a full page if a repair crosses the cut. Guarded writes verify the authority once inside the existing writer lock. The native sequence comparison and cross-scope delivery lock still apply.

The native gate verified all thirteen route checks on the candidate, including the held handle, replica history, feed resume, import replay, Publish and staging, notices, the erased-SSN rule and a real restore. The separate HTTP tests verified six cache cases, including late replies, a sequence change during repair and compressed replies. [Raw evidence hashes](P3-GUARD-SHA256SUMS)

The byte comparison used the same synthetic pin and separate fresh Reach sessions. The unguarded and guarded cold bodies matched exactly, as did their warm bodies. Both digests also stayed identical after erasing another person's assertion. Cold replies were 28,979 B. Warm replies were 1,428 B with 23 references in 32 entries. The first attempt wrongly required every entity to have a reference. The corrected gate still requires exact body equality and at least one reference.

| Ordinary-token Mac diagnostic | Save p50 / p99 (ms) | Pinned read p50 / p99 (ms) | Median read reply (B) |
| --- | ---: | ---: | ---: |
| Control before | 19.29 / 85.95 | 4.00 / 22.29 | 1,377 |
| Guarded, before any erasure | 30.92 / 160.61 | 4.99 / 47.18 | 1,377 |
| Control middle | 16.44 / 75.34 | 3.25 / 20.00 | 1,377 |
| Guarded, bystanders after erasure | 16.36 / 78.26 | 3.23 / 17.21 | 1,377 |
| Control after | 13.31 / 41.17 | 2.78 / 13.16 | 1,428 |
| Control without concurrent readers | 10.46 / 65.63 | | |
| Guarded without concurrent readers | 9.33 / 57.08 | | |

Each block had 500 exact save receipts. The pinned reader loops used four bystanders and checked each reply against the held pin. The pre-erasure guarded block's save ratios against both controls were 1.60–1.88× p50 and 1.87–2.13× p99. Read ratios were 1.25–1.54× and 2.12–2.36×. After erasure, save ratios were 1.00–1.23× and 1.04–1.90×. Read ratios were 0.99–1.16× and 0.86–1.31×. Without readers, save ratios were 0.89× and 0.87× at the end of the run. The controls drifted by 31% at the save median and 52% at save p99. The quiet server comparison is still needed for the 1.05× and 1.10× bars.

The direct byte check is independent of the tail timing. Timed reader loops begin after the checked warm-up pulls. Different matched blocks may have different mixes of the same four roots. The save request and reply sizes ranged from 7,442–7,447 B and 366–368 B, respectively, across these blocks.

## Evidence audit

- `reach-parity!` checks actual serialized reply bodies at a single verified Datomic pin and frontier. The diagnostic runner binds the fresh sessions and same attempt scope, then compares both digests again after verifying the actual selected identity's `ErasedValue` and erasure receipt.
- `Fixture.write` checks every save receipt against the exact offered facts and successor position. `traffic` checks each reader's pinned bytes, reads the last save back and checks the actual command claim. `ledger-match` records the route bytes and both surrounding controls.
- The six HTTP fixtures use fresh listeners and assert cache hits, full retries, exact decoded markers and the request count. `regression-cases.json` groups the thirteen native checks described in [LEDGER.md](LEDGER.md#evidence-checks). `local.mjs` binds the driver outputs and cleanup to the source and compiled bytes, reservation, image and nonce. Both completed stacks were removed, including the restore container and both owned volumes in each attempt.
- No timing verdict is emitted. No acceptance file or pinned path changed.
