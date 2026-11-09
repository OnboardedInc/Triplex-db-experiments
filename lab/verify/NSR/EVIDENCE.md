# CX-VNSR evidence index

Review target: `05c26355dfc653520067bfb1006e07475187c813`. Branch: `verify/NSR`.
Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/`.
`SHA256SUMS` is relative to that root. Raw evidence is retained outside git.
It indexes 156 files totaling 3,464,698 bytes; every copied file was read back before publication.
`retention-summary.json` binds checked target-source hashes and copied review-tool hashes. Every copied
file was read back, and its source was rechecked for changes during the copy. The retained tools include
formatting applied after some executions; candidate runtime source stayed byte-identical to the target.

| Evidence                                                           | Meaning                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `probes-1.log`, `probe-16ae8990-bacc-494b-871b-90db1109acf4/`      | Independent copied-bundle loading, two executable import-check false negatives, five rejecting import controls, clock/reader negative controls, fresh TCP response captures and HR events. One changed unsampled reader answer; both attempts diagnostic. |
| `source-tests-3.log`                                               | Three passing source tests: two original clock/volatile-filesystem tests and the review's modeled-Linux database symlink counterexample.                                                                                                                  |
| `build-3.log`                                                      | Seven packages built from their exact declared build commands using installed local binaries; CLI JS/declarations/executable generated.                                                                                                                   |
| `offline-1.log`, `offline-1/`, `p3m-1/`                            | Fresh 11/11 original NSR/P3M tests, including isolated candidate role processes, 256 fixture loops, accounting/feed parity, RPC fuzz/caps and planted delays.                                                                                             |
| `changed-feed-1.log`                                               | Unchanged split feed/accounting recomputes equally; one changed RPC feed attribute is rejected. Identity/timing controls are deliberately aligned to isolate feed content.                                                                                |
| `pack-cli-1.log`, `cli-pack-d67c3b18-2d12-4bac-8d24-a5a0101dc051/` | Original builder CLI tarball is missing its unbuilt entry; the declared build plus offline npm archive includes the required JS/declarations/executable. Targeted presence check only.                                                                    |
| `historical-evidence-1.log`                                        | 519 builder files (16,194,622 bytes) and all 44 final G0 CAS objects verified. Counts 1,220/0/71 expected skips are historical, not a reviewer rerun. No changed pinned paths.                                                                            |
| `format-1.log`, `lint-1.log`                                       | Review-tool formatting and lint; no candidate implementation edits.                                                                                                                                                                                       |

First attempts retained:

- `install.log`: interrupted this review's own waiting wrapper before installation began, then retried at the lab-supported 100 ms polling interval. `install-2.log` records the successful offline frozen install with ignored lifecycle scripts and the owned store.
- `source-tests-1.log`, `build-1.log`, `build-2.log`: pnpm 10.11 rejects `--store-dir` on `exec`/`run`. Later attempts use installed local binaries and the exact declared build commands; no package-manager config was changed.
- `source-tests-2.log`: two original source tests passed, review test failed because its modeled tmpfs path used `/var` while `realpath` returned `/private/var`. The model now canonicalizes its fixture root. `source-tests-3.log` records all three passing. The production code was untouched.

Reproduction from this worktree, with Node 24.18.0 and installed frozen dependencies:

```sh
node lab/bin/heavy.mjs --label CX-VNSR-repro-probes -- node lab/verify/NSR/probes.mjs
node lab/bin/heavy.mjs --label CX-VNSR-repro-source -- node_modules/.bin/vitest run --config lab/verify/NSR/vitest.config.ts
node lab/bin/heavy.mjs --label CX-VNSR-repro-build -- node lab/verify/NSR/build.mjs
node lab/bin/heavy.mjs --label CX-VNSR-repro-history -- node lab/verify/NSR/audit-evidence.mjs
NSR_EVIDENCE="$PWD/.cache/verify-nsr/repro-offline" P3M_EVIDENCE="$PWD/.cache/verify-nsr/repro-p3m" node lab/bin/heavy.mjs --label CX-VNSR-repro-parity -- node --test lab/bench/test/nsr.test.mjs lab/bench/test/p3.test.mjs
node lab/bin/heavy.mjs --label CX-VNSR-repro-feed -- node lab/verify/NSR/mutate-feed.mjs .cache/verify-nsr/repro-offline
node lab/bin/heavy.mjs --label CX-VNSR-repro-pack -- node lab/verify/NSR/pack-cli.mjs
```

The probes require local TCP sockets and macOS kernel boot identity (`sysctl`), which the default sandbox blocks.
Use fresh evidence directories for each rerun; the HR event writer refuses reuse. `VERIFY.md` gives the verdict,
scope limits and content/freshness/binding audit. No Linux host, engine, Docker, live qualification or full clean
consumer verification is implied by these artifacts.
