# CX-VOBS7 round 13 evidence

Reviewed source: `b167510f0890e68b803288573228119073738784`. Offline review under Q109a; no VM or real compiler output.

- `RUN.json`: exact commands, exits, source/log hashes, attempt times and replay transformations. Runner exit zero means capture completed, not acceptance.
- `*.stdout`, `*.stderr`: raw command output. All listed builder and prior reviewer suites pass; the new reviewer suite exits 1 with three passing tests and two failed source-refusal assertions.
- `independent/source-controls.json`: actual pinned-source control and nine undecorated source negatives.
- `independent/url-string-source.json`, `independent/block-string-source.json`: exact mutated source text/hashes, lexer findings and proof/W0 outcomes. Two lexical fixtures establish one finding; dump structure does not contribute to the verdict.
- `independent/gate-controls.json`: valid/failing diagnostic outcomes with the same gate success; the source fixture also exercises status/hash/version/token failures.
- `independent/btf-controls.json`: 273 passing refusal cases (ENUM/ENUM64 aliases/empty enums, all 255 nonzero flags bytes, ten reserved bits). Input construction is in the hashed reviewer source; each constructed blob has its hash recorded.
- `prior-round9/` through `prior-round12/`: fresh prior-fixture outputs, preserving historical evidence.
- `fixture-edit-audit.json`, `reviewer-fixture-builder.diff`: exact round 13 reviewer-fixture changes and hash binding.
- `SHA256SUMS`: every other file in this directory. Check here with `shasum -a 256 -c SHA256SUMS`.

Full findings, scope and verdict/receipt audit: `lab/experiments/EXP-OBS01/VERIFY-round13.md`.
