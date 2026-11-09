# CHECKJS round 2 evidence

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-CHECKJS/round2/`.

- `initial.txt`, `resolved.txt`: complete exploratory diagnostics (exit 2), with full per-diagnostic triage in `triage-initial.jsonl` and `triage-resolved.jsonl`.
- `2026-11-09T07-30-11-862Z/`: checker and six regression tests pass; broader lab/scenario suite fails 1/134 on the unchanged O-REPLAY helper pin. Retained as a failure.
- `2026-11-09T07-35-45-049Z/`: completed static-only attempt; checker, plain tsc and six tests pass; source, compiler dependencies and actual heavy grant rechecked. No broad-suite or engine PASS claimed.

Each attempt retains source/dependency hashes, coverage, printer comparisons, exact command outcomes and raw stdout/stderr. Final `printer.json` identifies the newly changed pin. `SHA256SUMS` paths are relative to the durable root; verify from that directory with `shasum -a 256 -c /absolute/path/to/this/round2/SHA256SUMS`.

The reason-comment file list is `annotated-files.json`. Coverage exclusions are exclusively in `lab/checkjs-exclusions.json`; the TypeScript files list is regenerated with `node lab/bin/checkjs.mjs --update-files` after staging new JavaScript. See the appended report for the complete audit and limits.
