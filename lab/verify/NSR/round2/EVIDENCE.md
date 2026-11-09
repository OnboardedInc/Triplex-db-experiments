# CX-VNSR round 2 evidence

Target: `76e6efd0ce3977bb21b3628df00ef4512a7f5265`.
Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VNSR/round2/`.
The local `SHA256SUMS` is relative to that root; raw evidence stays outside git. The original round-1
evidence and report remain unchanged.
The manifest indexes **211 files / 4,518,197 bytes**. Every copied file was read back; 18 target-source files
were checked against the reviewed commit before retention.

| Evidence                                                       | Meaning                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `probes-1.log`, `probes-b7481fea-4d0a-49bb-b6c8-1ae15a2d305f/` | Independent four-loop RPC baseline (124 reads) and mutant (121 reads). Exactly one unsampled loop-3 mutation is rejected by the independent digest oracle. Current nine-file bundle loads. Four direct loader controls refuse; destructured constructor still executes a candidate omitted from the manifest. |
| `checks-1.log`, `check-results.json`, `step-0.*`, `step-1.*`   | Fresh host JS/declaration build; actual command exits.                                                                                                                                                                                                                                                        |
| `step-2.stdout`, `step-2.stderr`                               | Eight source tests pass, including four original builder controls and four independent file-mount/hard-link cases.                                                                                                                                                                                            |
| `step-3.stdout`, `step-3.stderr`, `nsr-fresh/`, `p3m-fresh/`   | Fresh 12/12 original NSR/P3M regression tests. Existing OFFLINE-PASS receipts are diagnostic fixture artifacts.                                                                                                                                                                                               |
| `F3-target-calibration-*.json`                                 | An explicit modeled DB-target fsync returns EIO; admission still succeeds after only parent-directory calibration calls, while reporting the other device.                                                                                                                                                    |
| `F3-sidecar-barriers-*.json`                                   | Main DB admits a same-type WAL mount with `nobarrier`.                                                                                                                                                                                                                                                        |
| `tmpfs-file-mount-refused-*.json`, `durable-hard-link-*.json`  | Tmpfs file-mount negative control and actual same-inode hard-link positive control, using explicit Linux classification mocks.                                                                                                                                                                                |
| `source-control-2.log`                                         | Final source controls after adding the direct-WAL-path refusal assertion. Earlier `step-2.*` remains retained; the final source check uses the committed test bytes.                                                                                                                                          |
| `audit-1.log`                                                  | Independent readback of the builder round-2 manifest and source comparison to the exact target; final outcome below.                                                                                                                                                                                          |

Final source control: **8 passed, 0 failed**, including direct refusal of the WAL filename on the same modeled
`nobarrier` mount admitted when checked as a sidecar. Builder audit: **268 files, 7,950,747 bytes** verified;
all 16 listed sources match the exact target. Changed pinned paths: **none**. The acceptance contract is unchanged.

`retention-summary.json` binds target-source hashes, exact reviewer-tool copies and rebuilt host artifacts.
Every copied raw/tool/build file is read back and its source rechecked for changes during the copy. The hash
manifest asserts preservation only.

All runtime evidence is offline and fresh for this review. A manually authored canonical answer string supplies
the digest oracle. Full request keys, per-loop sampling flags, wire hashes, HMAC chains and the seal are checked
independently. The loader candidate writes only a harmless local marker. Linux mounts/cache/fsync failures are
modeled on this Mac; no actual Linux bind mount, tmpfs/device calibration, engine slot or Docker lifecycle was run.

Reproduction with Node 24.18.0 and the already installed frozen dependencies:

```sh
node lab/bin/heavy.mjs --label CX-VNSR-r2-repro-probes -- node lab/verify/NSR/round2/probes.mjs
node lab/bin/heavy.mjs --label CX-VNSR-r2-repro-checks -- node lab/verify/NSR/round2/checks.mjs
node lab/bin/heavy.mjs --label CX-VNSR-r2-repro-source -- node_modules/.bin/vitest run --config lab/verify/NSR/round2/vitest.config.ts
node lab/bin/heavy.mjs --label CX-VNSR-r2-repro-audit -- node lab/verify/NSR/round2/audit.mjs
```

TCP/clock probes need the local socket and sysctl permissions unavailable in the default sandbox. The fixed
parity directories in `checks.mjs` are single-attempt paths: use a fresh worktree or change the reviewer-owned
evidence directory strings for a rerun; do not overwrite or adopt an earlier attempt. Probe directories and
source-observation JSON names are fresh UUIDs. No full G0 or release/consumer acceptance is claimed.
