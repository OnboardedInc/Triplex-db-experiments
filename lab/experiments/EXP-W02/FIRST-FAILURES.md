# EXP-W02 first failures

These are builder notes from the tool outputs, not reconstructed raw command receipts.
The final offline runner saves its own raw stdout, stderr and exits in `evidence/`.

- Initial W0 generator used W0's integer-only canonical serializer for microsecond trace offsets.
  It rejected `607.371` as a non-integer number. Fixed by hashing the deterministic event JSON bytes;
  W0 input and output still use W0's exact canonical serializer.
- Initial same-process admission test passed the population CLI's compact stdout to G0.
  `requireW0Fingerprint` refused it with `G0 oracle binding invalid`: stdout omits rung, seed,
  source hashes and invalid-world inventory. Corrected both test and live entry to pass `--out`
  and read that full, fresh oracle artifact. No refusal was promoted to a PASS.
- Live-path typecheck cannot resolve this worktree's unbuilt `packages/xtdb/dist/index.js`.
  The two resulting implicit-any errors in inherited P5 `w0-public.ts:37` remain unverified
  until the lane package is built. Offline generator and expectation typecheck is separate.

## Round 2 attempt 1

Raw logs are retained in `evidence/offline-2026-11-09T02-33-16-151Z-e4cfec`.

- pnpm 10.11.0 accepts `--store-dir` for install but rejects it for the run/build
  command parser. The build exited before generating the missing XTDB dist.
  `build-public.mjs` now runs the exact pinned local tsdown/tsc recipes directly,
  in dependency order, without changing pnpm configuration or using sibling builds.
- One lane-adapter fake returned `recorded_position: basis.position` even though
  the adapter correctly supplies `recordedPosition`. The fake yielded NaN; the
  test failed (46/47 unit checks). Corrected the fake and added rejection of
  invalid observed row positions and invalid source heads.
- Three GS20 case members failed their boundary witness. W0 treats passports as
  expiry-exempt, so the fixture's passport produced no expiry task on either side.
  The scenario generator and executable fixture now use an EAD. This changes the
  generator source hash and starts a new comparison series; the old golden is not
  adopted retroactively. Goldens are explicitly regenerated before final checking.

The first captured round 2 attempt also records `sourceUnchanged: false` and
`buildsUnchanged: false`; it is unqualified, not an accepted partial result.

A later focused unit check of the stronger outcome comparison initially assumed
EXPECTED-ONLY O-REPLAY outcomes contained a committed `position`. They carry only
the committed/rejected decision. The probe now derives its independent dense
ordinal from those oracle decisions and explicitly accepts only the offline
memory composition. This focused console failure is noted here, not presented
as a reconstructed raw receipt. A new regression checks that a rejected valid
command fails even when a read at the old source position would still match.
