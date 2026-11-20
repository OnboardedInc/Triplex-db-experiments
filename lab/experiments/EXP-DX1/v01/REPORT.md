The readiness table and merge order are on the scorecard branch.
Version 0.1 still needs both physical runs on INT1.
The scorecard reports nine priorities and four correctness checks.
It uses one Datomic database with all accounts in each arm.
The two frozen arms take 197 minutes before restore and checks.
The clean Mac clone built its packages and started Datomic.
The Mac card contains diagnostic numbers and records gaps.
Both server runs need compatible sealed inputs.

## Readiness and replacement

[READINESS.md](READINESS.md) preserves each source head, commit count, exact trial conflicts and the ordered merge list. Four outstanding sources trial-merged cleanly and four conflicted at the original INT1 snapshot. The later trials add the scorecard and playground and refresh every source against INT1 `0196b9952`, which includes the opt-in per-person writer and permanent Publish. Only the scorecard branch was pushed from this worktree.

`lab/SCORECARD.md` and `lab/bin/scorecard.mjs` now describe and run the Datomic v0.1 scorecard. Their 2026-11-07 multi-engine versions are in Git history.

The Mac lease marker patch is `5c874bd26`. INT1 took the same tooling and tests as `a79267191`. The normal all-token behaviour remains available without the marker. With the marker, compatibility callers use one ordinary token, reusing the direct parent's token when present, and print one diagnostic line. PAIR records a departure from its measurement conditions. Four focused tests exercised marker present and absent, wrapper reuse, ordinary admission and release.

## Verdict and receipt audit

- **Physical priority rows.** The native saved-output collector reopens the original ready, armed and start records, both offer ledgers and the independent oracle. It checks actual writes and returned bytes and compares offered offsets to the frozen plan. The fresh nonce, source, slot, held seed and matched baseline bind the two arms. The renderer requires the physical plan and pinned seal, checks source, campaign binding, case, arm identity and timestamps and hashes each published raw report again. It uses the verified P1 checks and the P2 size-band checks. For P4 it compares the measured pulls per quota core to 1,100 and leaves the row open when the engine-byte witness is missing. The older aggregate throughput and supplemental P2 percentiles cannot decide these rows. Missing measurements and the Mac diagnostic path emit no verdict.
- **Receipt row.** Exact captured durable receipts, immediate readback, duplicate and lost-ACK witnesses come from the same verified loaded arm. The renderer requires all three named witnesses, counts matched receipts and checks capture completeness. It reports journal queryability, erasure and machine-loss recovery as unmeasured in this campaign.
- **Held seal validation.** The operator-pinned manifest and streamed dump are checked against the held SHA-256 and expected roster, scope, logical seed position and command readbacks. Each arm restores a disposable copy. The named held-arm path keeps the producer's source identity while binding the new run to its own source. Normal INT1 restores still require exact source equality.
- **Build record.** The builder checks an exact clean commit, an unmodified index and tracked image inputs. The receipt identifies all generated package files by SHA-256 and records the resolved local image IDs. Server startup reopens those bytes and checks the mutable PostgreSQL and Node tags against the pinned references while holding the campaign exclusion. The native bootstrap checks the committed Node and Datomic archive digests and stages Datomic from the selected source.
- **Mac fixture.** Engine admission owns a unique compact slot and volume, checks pinned build inputs and starts the existing INT1 proof. The partial report accepts only recorded toy arms, checking plan, case, source, timestamps, report digest and arm identity. It retains the fixture failure as a nonzero exit. Every Mac number is diagnostic.

No files under `lab/acceptance/` changed, and none of the changed paths are covered by its SHA-256 pins.

## Verification

The renderer tests covered all 13 rows, source/time/digest refusals, physical and diagnostic status, and incomplete diagnostic archives. The CLI forecast and help, clean source and dirty checkout refusals, ignored image-input refusal, TypeScript compilation, shell validation and the literal image-reference expansion passed. Ten INT1 plan and profile tests, three retention regressions, the split-read test and four reader-error tests passed. Both Linux Node archive hashes matched the vendor release manifest. [Node release checksums](https://nodejs.org/dist/v22.23.2/SHASUMS256.txt)

Fresh Mac clones built eight package tasks and checked the resulting 711 files. The engine manager built the pinned image and started PostgreSQL, Datomic and its gateway. The 40-person fixture seeded all ten accounts in a single database, with 4,890 facts. The first native module and output-mount failures were fixed. A subsequent start barrier failure exposed differing hash input order between the native controller and driver. The corrected controller uses the driver's campaign input order. Each admitted retry used an ordinary token and its own volume. The later fixture evidence records admission as `mac-diagnostic`.

The first post-fix frozen zero-reader arm verified its archive. Its loaded arm returned 208,939 exact reads, zero wrong results, one TypeError and 90 exact independent samples. The retry returned 4,859 exact reads, zero errors and 42 exact independent samples, all routed through the source. The collector refused both loaded arms. The later INT1 verifier now binds historical samples through the placement identity when a cut has no visible stamp. The pooled legacy following reader now opens from a stable catalog witness. The local replica sample requirement remains in force.

The stable catalog witness retry served 50 checked local replica samples and compared 91 exact reads through the independent oracle. Two split reads recorded TypeErrors and the gate refused the loaded arm. A targeted reproduction found that split reads assigned to read-only fallback metadata when combining their exact halves. The fixed reader constructs the result with the combined descriptors in one step and preserves the lazy row getter. Error traces now retain bounded repository-relative code locations without exception text.

The retained archives produced diagnostic cards with nine priorities, four correctness rows and 39 exact zero-reader receipts. They contain no verdicts and label unverified loaded observations as unavailable. [Evidence index](EVIDENCE.md) locates the native logs, cards, build records and checksums.

## Server handoff

[SERVER.md](SERVER.md) pins the runnable revision, build and two invocation commands. Each age has 197 minutes of frozen tape and a 235-minute ceiling. At USD 1.09 per hour the forecast is USD 3.58–4.27 per run, excluding build and seed preparation. Physical duration and cost are unverified.

The held SCALE1 decision image has a different layout and operation identity scheme. INT1 needs compatible sealed fresh and 1B inputs. If aging uses the same measured Triplex journal, the driver also needs a starting-state and oracle replay adapter for the aged logical head. P3 fanout, P4 engine bytes, P5/P6/P8 field coverage, the P7 census and the P9 two-machine drill still need separate or integrated measurements.
