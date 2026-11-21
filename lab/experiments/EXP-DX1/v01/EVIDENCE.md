# DX-V01 evidence

The [checksum index](SHA256SUMS) is relative to the lab vault's `evidence/DX-V01/` directory. Native timings are diagnostic. The vault keeps the raw campaign evidence, including the first failures.

| Evidence in the vault | What it records |
| --- | --- |
| `packages-51.log`, `package-build-51.json` | Latest clean source and eight package tasks with 711 hashed files. |
| `packages-31.log`, `package-build-31.json` | Fresh checkout and eight clean package tasks with 711 hashed files at the split-read fix. |
| `image-build-14.json`, `image-build-14.log` | Exact engine build receipt for the image reused after comparison of its pinned inputs. |
| `read-regressions-31.log` | Split fallback regression and four reader error tests. |
| `fixture-02.log`, `fixture-03.log`, `native-10/` | Original syntax, Mac output mount and start barrier failures. |
| `fixture-12.log`, `native-12/` | First verified zero-reader arm and the loaded arm's first typed read error. |
| `fixture-13.log`, `native-13/`, `diagnostic-card-13-44wRLK/SCORECARD-v0.1.md` | Loaded fixture without local samples and its partial diagnostic report. |
| `fixture-17.log`, `native-17/`, `diagnostic-card-17-nhwkIt/SCORECARD-v0.1.md` | Stable catalog witness, 50 exact local samples, 91 independent samples and two split read errors. The card prints all 13 rows and the verified zero-reader receipt count. |
| `packages-38.log`, `package-build-38.json`, `image-build-39.json` | Clean joined INT1 package and image build. |
| `fixture-39.log`, `native-39/scorecard/SCORECARD-v0.1.md`, `native-39/campaign/` | Verified frozen pair, field offer expirations, and the native partial diagnostic scorecard. |
| `field-regression-45.log`, `fixture-45.log`, `native-45/` | Matched short field geometry check and a repeated local-sample shortfall. |
| `reader-retry-51.log` | Bounded exact-cut retry and protection refusal checks. |
| `fixture-51.log`, `native-51/scorecard/SCORECARD-v0.1.md`, `native-51/campaign/` | Final 13-row diagnostic card, two verified frozen arms, one missing field publication, and cleanup. |


## Part 2 SCALE1 adoption

- `part2/packages-a3.log` and `part2/package-build-a3.json` identify the clean native package build.
- `part2/image-build-a3.log` identifies the pinned compact image. The original build and launcher failures are preserved in `part2/image-a1.log` and `part2/fixture-a2-1.log`.
- `part2/fixture-a3-1.log` and `part2/adoption-a3/campaign/` contain both native arms, exact loader receipts, observations, writer settings and cleanup.
- `part2/adoption-a3/recalculated/SCORECARD-v0.1.md` is the current diagnostic renderer applied to the retained native evidence.
- `part2/publish-p5a/` retains the original ACT1 producer and collector outputs. `part2/fixture-p5a-1.log` records engine ownership and cleanup.
- `part2/quiet-p6a/SCORECARD-v0.1.md` and `part2/quiet-p6a/campaign/p6-*/` retain the quiet pair and exact arm observations. `part2/fixture-p6a-1.log` records engine ownership and cleanup.
- `part2/idle-p7a/SCORECARD-v0.1.md` and its arm archives retain the P7 first exact pulls, residency and thread counts. `part2/fixture-p7a-1.log` records engine ownership and cleanup.
- `part2/import-p8b/SCORECARD-v0.1.md` and `part2/import-p8b/campaign/p8/` contain the exact suffix verification and its independently replayed offer log. `part2/import-p8a/` and the fixture logs retain the missing bulk-grant failure, the corrected run and both cleanups.
- `part2/recovery-p9a/fault/` and `part2/recovery-p9a/move/` contain the separate ten-account HASYNC1 diagnostics. Their attempt records, receipt audit, read tapes, recovery events and cleanups bind the two owned slots.
- `part2/import-p8b/final-render/SCORECARD-v0.1.md` is the final formatter applied to the same retained native campaign. `part2/final-card-checks.log` records renderer, loader and recovery tests and verifies the card rows and evidence links.
- `part2/packages-final.log` and `part2/package-build-final.json` contain the final server revision’s clean package build and exact output hashes.

## Part 3 writer preview

- `part3/preview-a/SCORECARD-v0.1.md` contains the 14-row Mac card. The campaign archive contains both configurations, the reference import, both retired-ID probes and the grouped history witness.
- `part3/preview-a/campaign/PREP1-MIXED-TEST.log` contains the exact published native test. The two PREP1 unit logs capture 6 and 11 focused tests.
- `part3/fixture-preview-a-1.log` records both admissions and volume removals. The package and image receipts bind source and build bytes.
- `part3/preview-card-checks.log` contains the four formatter tests, both command forecasts and failed replays of a stale witness and a changed historical value.

## Part 4 INT1 re-pin

- `part4/runner-b/SCORECARD-v0.1.md` is the 14-row diagnostic card from the server runner commit. The adjacent campaign directory contains the two matched writer archives and the mixed-format witnesses.
- `part4/verify-runner-b.log` records the independent card and archive checks. `part4/runner-b/campaign/PREP1-MIXED-TEST.log` records the 37-assertion SQL compatibility test.
- `part4/packages-runner-b.log` and `part4/package-build-runner-b.json` bind the clean checkout and built packages. `part4/image-build-runner-b.log` records the staged image. `part4/fixture-runner-b-1.log` records the two private slot admissions and volume removals.
- `part4/merged-a/` contains the first paired card after the INT1 merge. The final runner updated the journal wording and replayed the paired fixture. `part4/runner-checks.log` records the focused renderer tests and command forecasts.

## Part 5 prepared PostgreSQL

- `part5/card-a/campaign/PGDATA-FIXTURE.json` records the native PostgreSQL 17 copy check, both SQL values and the wrong-digest refusal for the same source, slot and attempt.
- `part5/card-a/SCORECARD-v0.1.md` is the paired toy card. `part5/verify-card-a.log` checks the 14 rows, both configurations, the PGDATA evidence binding and the mixed-ID results.
- `part5/focused-checks.log` records the six focused tests, shell checks and startup forecasts. `part5/focused-first.log` preserves the initial test path-alias failure. `part5/platform-check.log` records the bare-metal detector regression check.
- The package and image build receipts, slot lifecycle log and image removal result are in `part5/`.

## Part 6 server profile

- `part6/native-card.tar.gz` retains the Mac toy card and source-bound campaign. `part6/SCORECARD-v0.1.md` is the diagnostic view. `part6/verify-server-b.log` records the card, WAL and fair-turn checks.
- `part6/focused-final.log` records the twelve tests, shell checks and 300-minute launch plan.
- `part6/native-first-refusal.tar.gz` and `part6/fixture-server-a-1.log` retain the first attempt that exposed the quiet expiry counter. The final log and package and image receipts identify the replay, cleanup and reused image.

## Part 7 sequential staging

- `part7/focused-final.log` covers the four-arm manifest, refusal cases and active-time accounting. It compares the published prior launch plan to both invocation modes. `part7/assemble-cli.log` records the missing-arm refusal through the public command.
- `part7/native-card.tar.gz` contains the 14-row diagnostic replay on the 80-person toy seed. `part7/SCORECARD-v0.1.md` is its card and `part7/verify-sequential-a.log` records the checks and cleanup.
- The package build receipt, staged image and slot lifecycle logs are in `part7/`. The fixture ran at `f9b7e0c0b`. The server runner adds preflight retry logging to that source.

## Part 8 next-card gates

- `part8/native-card-next-b.tar.gz`, its index and `part8/SCORECARD-next-b.md` retain the two diagnostic native configurations and the PG17 stats witness.
- `part8/unit-next-b.log` and `part8/verify-next-b.log` bind the rendered evidence, the recomputed window counts and the fifteen gate checks. `part8/replay-90.log` binds all eight original offer tapes.
- `part8/fixture-next-b-1.log`, the clean-build logs and image retirement record identify the owned slot, build and cleanup. The first collection refusal and its native inputs remain in `part8/fixture-next-a-1.log` and `part8/native-refused-next-a.tar.gz`.

- `part8/native-card-rolling-six.tar.gz`, its index and `part8/SCORECARD-rolling-six.md` retain the clean candidate's native rolling-width-six card with both writers. `part8/verify-rolling-six.log` confirms actual ticket bounds, correctly filled rows and the exact PG17 readback. The clean build and cleanup logs identify that exact candidate.
- `part8/unit-rolling-six.log` records all 31 focused tests, including the published schedule and negative credit-mode evidence checks.

## Part 9 lean fresh card

- `part9/native-lean.tar.gz`, its index and `part9/SCORECARD-lean.md` contain the pinned Mac toy's two rolling12 headline arms, the ordered barrier6 comparison, and the saved mixed-ID and PostgreSQL 17 checks.
- `part9/verify-lean.log` verifies all fourteen obligations and twelve quiet windows from their offer and ACK clocks. `part9/unit-final.log` records 31 focused tests. `part9/unit-lean.log` retains the earlier test rounding mismatch. The two plan logs record selector precedence, matched core and WAL policy, and opt-in flags.
- The package, image build, fixture and retirement logs identify the exact runner, the two ordinary reservations and cleanup.
