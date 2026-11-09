# CX-VP3M evidence index

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP3M/`.
`SHA256SUMS` in this directory uses paths relative to that root. Verify with
`shasum -a 256 -c /absolute/path/to/lab/verify/P3M/SHA256SUMS` while in the evidence root.

| Path | Meaning |
| --- | --- |
| `install.log` | Fresh frozen offline install using explicit project store, owned task caches and local Node headers. |
| `archive-first-failure.md` | Manual transcript index for the initial archive helper's duplicate read-only object copy failure; original evidence retained. |
| `85adc068-239a-4c04-8828-a2f4c91a0986/` | Initial successful reviewer builds, six builder tests and reviewer probes; predates additional lock and permanent-stall cases and reviewer-script hash inventory. |
| `1ed160f2-ca9f-42f3-8150-8f354d1fbd7f/execution.json` | Expanded successful execution: exact source hashes, commands, statuses, raw-log hashes and source unchanged check. |
| `1ed160f2-ca9f-42f3-8150-8f354d1fbd7f/review-fixtures/outcomes.json` | All reviewer assertions and explicit surviving invalid-provider observations. |
| `1ed160f2-ca9f-42f3-8150-8f354d1fbd7f/review-fixtures/<case>/<uuid>/` | Actual receipts, independent raw source state, producer and consumer databases, prefix and read/sample observations. FAIL attempts retain their receipts and partial stores. |
| `1ed160f2-ca9f-42f3-8150-8f354d1fbd7f/builder-fixtures/` | Independently rerun builder test fixture bytes; synthetic delay observations are explicitly labelled. |
| `g0.log` | Exact G0 command output, heavy-slot waits and final full PASS/counts. |
| `g0-fixtures/` | Independent G0's P3 fixture bytes. |
| `g0/G0-xtdb-20261109T070913Z-711e06/receipt.json` | Byte-exact diagnostic G0 receipt; also committed in this review directory. |
| `g0/G0-xtdb-20261109T070913Z-711e06/raw/` | Original `runs/G0/G0-xtdb-20261109T070913Z-711e06/` raw outputs. |
| `g0/G0-xtdb-20261109T070913Z-711e06/objects/` | Original receipt-referenced `runs/objects/<sha256>` content-addressed preimages, independently checked during copy. |

No evidence here is a native lane performance result or NS obligation closure.
See `VERIFY.md` for the verdict, surviving trust-boundary cases and R44 seam.
