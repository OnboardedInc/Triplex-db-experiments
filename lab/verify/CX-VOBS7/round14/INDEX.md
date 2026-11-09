# CX-VOBS7 round 14 evidence

Reviewed source: `c121780e7e00ae795690f4d37d91d13807171160`. Offline R13-F1 review under Q109a; all listed suites pass.

- `RUN.json`: exact commands/exits, source/log hashes, attempt times and output-only replay transformations. Runner completion is not itself an acceptance verdict.
- `*.stdout`, `*.stderr`: fresh raw outputs for all twelve successful commands.
- `independent/pinned-and-literal-controls.json`: actual pinned program and 30 harmless literal/comment controls, with lexical and pure proof/W0 results.
- `independent/active-read-cross-product.json`, `seeded-arrangements.json`: 8,100 cross-product and 10,000 seeded active-read checks; deterministic recipe in the hashed reviewer source, input/observation stream digests, and empty mismatch lists.
- `independent/active-read-gate-controls.json`, `token-gap-controls.json`: exact source, lexical results and proof/W0 controls for forbidden reads.
- `independent/unterminated-controls.json`: 270 lexical-error refusal cases, stream digests, exact recipe and retained samples.
- `prior-round9/` through `prior-round13/`: fresh unchanged reviewer-fixture results; previous attempts remain untouched.
- `unchanged-fixture-audit.json`: byte equality and SHA256 for all five original reviewer source files against the round 13 review commit.
- `SHA256SUMS`: hashes of every other file here; check with `shasum -a 256 -c SHA256SUMS` from this directory.

Full scope, acceptance limits and verdict/receipt audit: `lab/experiments/EXP-OBS01/VERIFY-round14.md`.
