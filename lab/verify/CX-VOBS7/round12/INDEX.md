# CX-VOBS7 round 12 evidence

Reviewed source: `806d40b7576b4d41e0e4a59a87a4914bf0271b0b`. Constructed offline fixtures only; no VM or real compiler output.

- `RUN.json`: source hashes, exact commands, exits and raw-log hashes. Runner completion is not an acceptance verdict.
- `*.stdout`, `*.stderr`: immutable command output. All requested existing gate/reviewer suites pass; `review-round12` exits 1 with seven failed refusal assertions and one passing control.
- `independent/*.json`: exact constructed dump text, BTF bytes as base64, proof results and pure W0 stand-ins. Seven failures are grouped into three findings in `lab/experiments/EXP-OBS01/VERIFY-round12.md`.
- `prior-round9/`, `prior-round10/`, `prior-round11/`: fresh prior-fixture results, leaving historical evidence untouched.
- `fixture-edit-audit.json`, `review-round11-builder.diff`: exact fixture edit comparison; assertions unchanged.
- `SHA256SUMS`: hashes of every other file in this directory, including this index. Check from this directory with `shasum -a 256 -c SHA256SUMS`.

Reproduction uses `run_round12.py` through `heavy.mjs`; its output directory must be new. Preserve this attempt rather than overwriting it.
