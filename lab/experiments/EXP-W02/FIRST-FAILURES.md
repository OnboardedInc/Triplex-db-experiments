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
