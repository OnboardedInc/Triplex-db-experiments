# CX-VK01 round-12 offline evidence

- `run.json`, suite logs: 468 tests, exact inputs, TAP counts and statuses; source hashes checked after execution.
- `final-checks.json`: builder/runtime equality, merge tree identity, acceptance immutability, 504 build output hashes.
- `source-and-stale-inventory.json`, `stale-refusals.json`: old/new runtime hashes and three actual historical manifest refusals.
- `build.json`, build logs, `reviewer-types.json`: successful local public builds and extra strict reviewer typecheck.
- `setup-attempt-1.json`, `build-attempt-1/`, `stale-audit-attempt-1.json`: retained setup/tooling/reviewer-assertion failures; none is an engine observation.
- `SHA256SUMS-RAW`, `RAW-INDEX.md`: durable raw reviewer cases, outside git. No volume or slot evidence is claimed.

The completed suite command was `node lab/bin/heavy.mjs --label CX-VK01-R12-offline-2 -- node lab/verify/K01/run-review-round12.mjs`, after a 5 GiB free-space preflight; the runner checks again after acquiring the heavy token. Existing output paths deliberately refuse reuse. Use a new attempt/path for any future rerun.
