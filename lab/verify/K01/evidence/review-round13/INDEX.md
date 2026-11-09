# CX-VK01 round-13 offline evidence

- `run.json`, root suite logs: final attempt 4, 511 tests, exact source hashes, TAP denominators and process outcomes; all rehashed after execution.
- `source-audit.json`: clean pinned XTDB source and numbered excerpts, builder/runtime identity, changed runtime hashes and acceptance snapshot.
- `smoke-replay.json`: all 99 builder raw-file SHA256s verified, five complete wire-row captures replayed through current G0, source layouts compared; diagnostic only.
- `final-checks.json`: final source/log/raw checks, unchanged acceptance and reviewed runtime, exact smoke-to-current differences.
- `setup-attempt-1.json`, `development-2/`, `completed-attempt-3/`: retained setup and reviewer-fixture outcomes; last successful attempt was strengthened and re-executed, not silently adopted.
- `merge-input/`: retained round-12 count-only fixture before its explicit catalog-policy adaptation.
- `SHA256SUMS-RAW`, `RAW-INDEX.md`: durable reviewer raw cases; bulky builder smoke stays at its original external location.

Final suite command: `node lab/bin/heavy.mjs --label CX-VK01-R13-offline-4 -- node lab/verify/K01/run-review-round13.mjs` (disk preflight before admission and again inside runner). Offline replay command: `node lab/bin/heavy.mjs --label CX-VK01-R13-smoke-replay -- node lab/verify/K01/replay-smoke-round13.mjs`. These runners refuse existing output paths; future reruns require new attempt paths.
