# CX-P3M durable evidence

Builder-only offline harness evidence. No engine or slot, no lane promotion or NS.P3 closure.
The committed `lab/experiments/EXP-P3M/REPORT.md` is the final narrative; `report-draft.md` and
`timing-review.md` are retained working notes, not verdicts. Paths below are relative to this root.

- `f2811683-36d6-4bed-90be-02f0076a8e01/`: frozen final-source standalone attempt; exact source hashes,
  command statuses and raw output; six tests pass, source unchanged. `fixtures/` retains real worker
  runs, failed-control receipts and synthetic delay falsifiers.
- `4d1ae5f6-3afe-441a-b1da-94afdcba3c44/`: timing correction; five tests pass, source unchanged.
- `4fd57bae-b3b1-4fa9-811e-eddcf1bbb103/`: initial four-test success, source unchanged.
- `e76e0a62-d164-41fe-923a-d7149c96d615/`: first failed test attempt, boot-clock access refused;
  actual raw failures retained. No substitute clock or skip.
- `g0-closed-worker-fixtures/`: final G0's per-run fixtures and observations; final-source worker closure ordering.
- `g0-final-fixtures/`: preceding five-test G0's fixture observations (timing-corrected source).
- `g0-fixtures/`: earlier G0 fixture runs, with UUID-isolated real worker receipts/databases. The
  convenience synthetic-delay summary filenames are reused across those earlier invocations;
  individual producer DBs and real worker attempts remain separate. The standalone attempts
  above retain per-attempt synthetic summaries without this reuse.
- `g0-*.log`, `g0-console.log`: actual G0 console outputs. `g0-raw/`, `g0-receipts/` and `objects/`
  archive complete raw runs, immutable gate receipts and content-addressed gate preimages.
- `bin/pnpm`: owned-store wrapper used for successful G0 runs. It preserves an existing store
  argument rather than duplicating it. Earlier wrapper failures are retained in gate receipts/logs.
- `install-owned-cache.log`: successful frozen offline install; `setup-first-failures.md` is a
  manual index of earlier setup failures whose full raw output remains in the agent transcript.
- `final-code/`: final executing bench/bin sources, lockfile and standalone verifier (no dependency caches).
- `final-lint.log`, `final-format-check.log`, `final-diff-check.log`: changed-code checks.
- `source-hash-changes-draft.json`: old/new SHA256 for the two changed preexisting tracked files;
  the identical final manifest is committed as `source-hash-changes.json`.

The 100/249/251/400 ms samples use synthetic durable-known offsets from newly captured producer
records. They verify arithmetic, source/clock binding, pooling and the bar; they are not wall-time
performance samples. Other fixtures execute real publication capture, SQLite durability, separate
workers and observed read loops, against fake data only. Native event placement and TARGETS P1
query mix remain the lane integration/provider owner's responsibility.

`SHA256SUMS` covers every file under this durable root except itself. The committed copy uses
paths relative to this root. Recompute with SHA256 and compare; no raw evidence is reconstructed
from a verdict or changed to improve a failed outcome.
