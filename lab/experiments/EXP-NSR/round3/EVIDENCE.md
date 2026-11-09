# EXP-NSR round 3 evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-NSR/round3/`.

`SHA256SUMS` binds 1044 read-back files (16,873,104 bytes).
Verify from that root using `shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/nsr/lab/experiments/EXP-NSR/round3/SHA256SUMS`.

- `final-regressions.log`, `final-nsr-3/`, `final-p3m-3/`: 14 passing tests including executable runtime regressions and guarded split/monolith parity.
- `final-binding.log`, `final-probes-2/`: copied bundler metafiles, actual executable/support hashes, guarded baseline and mutation HR, nine loader cases plus intact/changed artifact binding control.
- `attempt-3.log`, `mount-controls-3/`: nine passing modeled storage/clock controls and earlier guarded execution regression run.
- `attempt-2.log`: completed changed host build and nine source controls; retains the overlapping file/directory permission-grant failure.
- `artifact-1.log`, `host-1.log`: first runtime permission and early-mount-read failures, retained unchanged.
- `final-runtime.log`, `final-probes/`, `final-nsr/`, `final-p3m/`: successful 13-test intermediate runtime/source-refusal controls.
- `source-hashes.json`: 21 final source/lockfile hashes, host dist hashes, actual esbuild version, raw metafile hash and actual executable hash; source and copied artifacts checked after tests.

Exact review source copies are `review-probes.original.mjs` and `review-durability.original.ts` beside this index.
Runnable adapted regressions are `lab/verify/NSR/round3/artifact-controls.mjs` and
`packages/host/test/feed/nsr-mounts.test.ts`. See REPORT.md round 3 for the PASS audit and limitations.
No actual Linux mount/startup, full G0 rerun, package release or NS qualification is claimed.
