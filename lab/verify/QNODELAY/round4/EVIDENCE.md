# Round 4 reviewer evidence

Candidate `4e235a1d2b7ec5e1360144cab05357a79ee127ad`; reviewer merge `fcbece734e5fe6ddf513da264f9f57663daa2713`. Verdict and limitations: `../VERIFY-round4.md`.

- `review.mjs`, `result.json`, `review.log`: fresh candidate-only suite/type check, exact parser mutation observations, default checks and historical sample replay. Successful heavy label `CX-VQNODELAY-R4-review`.
- `builder-tests.stdout.index.md` links the exact raw stdout at the durable root, with its digest. `builder-tests.stderr.log`, `declarations.{stdout,stderr}.log` retain the other child output; 42 tests and declaration check exited zero. Empty stderr/type-check logs are retained as empty files. Raw TAP stdout has trailing spaces in two original test names; it remains unchanged durably.
- `reader-unit.mjs`, `reader-unit-result.json`, `reader-unit.log`: full-body unit of the omitted retained-event report. Controller and IO are synthetic; terminal marker `SYNTHETIC-FIXTURE-NOT-VERIFIED`. Two cases; no engine or real qualification state.
- `extra.mjs`, `extra.log`: queued extra bulk audit failed at the <5 GiB preflight, exit 1. No result exists and its subsequent checksum traversal did not run.
- `metadata-audit.json`: lightweight Git diff and acceptance-JSON pin metadata inspection; no changed pin intersections, no acceptance or transport-source delta for the comparisons recorded there.
- `pin-audit.py`, `pin-audit-result.json`, `pin-audit2.log`: also checks path-keyed SHA256 dictionaries and text references in all 43 tracked acceptance files. No changed pinned path. The first helper's list-valued-field error is retained in `pin-audit-attempt1.py` and `pin-audit.log`; only the corrected second execution completed.
- `data-search.txt`: retained data/path/percentile search matches across lab/packages/qualification, including reviewer files; matches alone do not establish a reader finding.
- `PREIMAGE-SHA256SUMS`: 936 Git candidate preimages already verified unchanged at the end of the successful suite, its fresh reader audit, the omitted report's independently hashed source copy, and raw TAP stdout. Absolute durable paths; no dependency caches.
- `SHA256SUMS`: compact committed evidence, tools, preimage manifest and review report bytes. Verify from this directory with `shasum -a 256 -c SHA256SUMS`. Hashes do not certify engine correctness.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round4/`. `source-attempt1/` contains the candidate-only preimages and `reader-audit.json`; `omitted-reader/` retains the omitted report preimage. The node_modules symlink references existing installed dependencies and is excluded from the manifest. Source preimages remain durable rather than being committed as bulky evidence.

Successful suite/replay command (repository root):

```sh
node lab/bin/heavy.mjs --label CX-VQNODELAY-R4-review -- \
  node --import ./lab/verify/QNODELAY/round2/bootstrap.mjs --experimental-transform-types \
  lab/verify/QNODELAY/round4/review.mjs > lab/verify/QNODELAY/round4/review.log 2>&1
```

The runner intentionally requires a new durable source directory and uses exclusive result/log creation: preserve this attempt and change paths for another run. It invokes the exact candidate's `node --test lab/receipts/parser.test.mjs lab/receipts/readers.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit -p lab/receipts/tsconfig.json` inside that copy. The existing round-2 bootstrap resolves the installed Undici dependency; no network request is issued.

Tiny reader-unit command:

```sh
node --experimental-transform-types lab/verify/QNODELAY/round4/reader-unit.mjs \
  > lab/verify/QNODELAY/round4/reader-unit.log 2>&1
```

All timings in mutation/unit fixtures are synthetic. Historical result-file paths and digests, source hashes, observed outputs and attempt timestamps are in the JSON results. This round is offline and provides no new latency/transport/semantic qualification.
