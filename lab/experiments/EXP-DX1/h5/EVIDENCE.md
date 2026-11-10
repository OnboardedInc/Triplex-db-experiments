# DX-H5 durable evidence index

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5/`. All bulky raw outputs and source/build preimages stay there. [REPORT.md](REPORT.md) interprets results and limitations; this index grants no verdict. Zero outer exit alone is not semantic success.

| Attempt directory       | Outer exit | Disposition                                                                                       |
| ----------------------- | ---------: | ------------------------------------------------------------------------------------------------- |
| `tx2-dxh5-equivalence1` |          0 | Uncapped200-subject/two-cut row equality;8 actual single-request pages                            |
| `tx2-dxh5-equivalence2` |          0 | Bounded-cache200-subject/two-cut equality;8 actual single-request pages                           |
| `tx2-dxh5-history1`     |          0 | Complete history row bytes and counts match at two cuts                                           |
| `tx2-dxh5-probe1`       |          1 | Logger failure; zero completed commands                                                           |
| `tx2-dxh5-probe2`       |          0 | All four diagnostic concurrency runs; reordered positions remain unqualified                      |
| `tx2-dxh5-seed10000a`   |          1 | Deadline stop;293761 captured ACKs; no G0/seal; no10k sweep                                       |
| `tx2-dxh5-seed1000a`    |          1 | Missing host build; no population seeded                                                          |
| `tx2-dxh5-seed1000b`    |          0 | Fresh independent G0; stopped/cloned/sealed1k                                                     |
| `tx2-dxh5-smoke1`       |          0 | Forensic shell-parse failure; misleading outer zero is not adopted                                |
| `tx2-dxh5-smoke2`       |          1 | Architecture-specific library-copy failure before stack                                           |
| `tx2-dxh5-smoke3`       |        124 | Canceled before admission                                                                         |
| `tx2-dxh5-w1a`          |          1 | OS OOM in64-reader baseline; RUNNING receipt is interrupted, not active; no sweep metrics         |
| `tx2-dxh5-w1b`          |          0 | Complete1k activation/coverage; original receipt PARTIAL, acceptancefalse; G4/G6/G8 gaps retained |
| `tx2-dxh5-w4a`          |          1 | OS OOM in64-reader baseline; RUNNING receipt is interrupted, not active; no sweep metrics         |
| `tx2-dxh5-w4b`          |          0 | Complete1k activation/coverage; original receipt PARTIAL, acceptancefalse; G4/G6/G8 gaps retained |
| `tx2-dxh5-w8a`          |          1 | OS OOM in64-reader baseline; RUNNING receipt is interrupted, not active; no sweep metrics         |
| `tx2-dxh5-w8b`          |          0 | Complete1k activation/coverage; original receipt PARTIAL, acceptancefalse; G4/G6/G8 gaps retained |

Each attempt retains original arguments, head/source/build hashes, local image/stack/cpuset/memory identities, driver bytes, gateway/transactor/Postgres logs and cleanup inventories as applicable. Older source/HEAD manifests remain untouched. `source-*` directories contain timestamped source and generated-build preimages with per-file CAPTURE manifests, not node_modules or caches. Later captures are not retroactive proof for earlier attempts.

Important raw paths:

- Successful sweeps: `tx2-dxh5-w{1,4,8}b/driver/receipt.json`, `activation-pages.ndjson`, page oracle frames, actual stored journal, live traffic NDJSON and cgroups.
- Seed: `tx2-dxh5-seed1000b/driver/{receipt.json,seed.ndjson}` and `seal.log`.
- Seed concurrency: `tx2-dxh5-probe2/driver/probe.json` plus per-scope complete command/ACK logs.
  -10k failure: `seed10000-final-prefix.json`, `seed10000-transactor-thread-{dump,dump-2,cpu}.json/log` (use actual filenames), guest pressure/stats, `tx2-dxh5-seed10000a/driver/seed.ndjson`, `deadline-guard.json`, original RUNNING receipt and nonzero outer exit.
- `sweep10000-launch-exit.json` proves the queued launch refused after seed failure. `unadmitted-10k-selection.json` retains cancellation of its earlier four-worker predecessor.
- `analysis.json`, `MEASUREMENTS.md`, `PAGES.md`, `cgroup-windows.json` are derived from retained bytes.
- `source-types-final.json/log`, focused test logs and offline install/build logs retain validation; no root-suite or release acceptance claim.
- `final-inventory.json`: no own containers/networks; only qualified1k sealed volume retained,653885440bytes at sealing. `pin-audit.json`: no package/acceptance edits and no modified pinned paths.

Keep **`tx2-dxh5-seed-1000-pg-data`** for reproduction. No10k sealed volume exists. Raw first failures are retained.

The full raw checksum list is `SHA256SUMS` at the evidence root. The identical records are split into committed `SHA256SUMS.part-*` files (<750KB each); committed `SHA256SUMS` hashes those parts. Verify parts from this h5 directory, then raw bytes from the evidence root:

```sh
shasum -a 256 -c SHA256SUMS
cd /Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5
shasum -a 256 --quiet -c /Users/sam/projects/triplex-db-2/.claude/worktrees/dx-h5/lab/experiments/EXP-DX1/h5/SHA256SUMS.part-*
```

`CHECKSUM-VERIFICATION.json` records the observed native check exits after generation. Hash verification binds content only; it grants no G0/P5/production verdict.
