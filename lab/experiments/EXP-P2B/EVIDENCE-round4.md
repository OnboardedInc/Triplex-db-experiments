# EXP-P2B round 4 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4/`.
No raw database or large gate directory is committed. `SHA256SUMS-round4-*.txt`
indexes actual regular files; `LINK-TARGETS-round4.json` declares dependency
symlinks, which the manifest does not recursively follow. The checksum index is
byte-preservation evidence, not database acceptance or a power-loss receipt.

- `review-original/`: unaltered copied review schedules, worker and baseline config
  from `171c71ed276b0ea162f91f17587beb73a1f11b59`.
- `baseline.log`, `baseline2.log`: retained resolution setup failure and fresh
  original six-schedule defect reproduction on base candidate `ba10ebb9`.
- `regressions1.log`: first corrected attempt retained the fixture-resolution
  failure and unhandled cleanup rejection after a newly enforced WAL refusal.
  Later attempts explicitly checkpoint/retry that known refusal and attach the
  delayed-read outcome immediately. `regressions2.log` and `regressions-final.log`
  retain successful intermediate checks.
- `gates-*/`: exact source/test/runtime-JS/lock/native input hashes and preimages,
  build/test logs, fresh regression observations and completion records. The
  first gate refused completion because rebuilt declaration union order changed;
  the second refused because the copied config changed during its source window.
  Both failures remain, despite passing their semantic tests. The final gate
  is named in `ROUND4-RESULTS.json` and binds fresh fixture bytes/UUID observations.
- `snapshot/`: actual frozen broker source/build, lockfile and executing long-run
  harness bytes. It reuses the installed broker dependency directory by declared
  link; later root helper style changes are not substituted for those bytes.
- `long-pin-29284db8-0724-4679-b6e0-6fbcf627304f/`: real 600-second pin attempt,
  raw per-write/read/WAL samples, exact frozen-input identities, native proof,
  continuing source database and completed result.
- `long-pin-attempt1.log`: actual long-run launch/summary. `bound-gates-final.log`
  selects the final fresh gate. `ROUND4-RESULTS.json` binds their result/log/source
  identities and retains the important observed counts/limits.
- `unit-fixtures/` and `unit-fixtures-retention.json`: this round's 104 completed
  upstream fixture directories (312 files, 7,494,596 bytes) moved from ignored
  worktree output after all owning test subprocesses exited. The retention map
  preserves original paths and checks each file's hash/device/inode across the
  atomic rename; earlier rounds were untouched. `retention-runner.py` is the
  executed move/check preimage. The separately retained unused postamble variant
  arrived after the Python child had loaded its program; it was not used as a
  completion receipt. Final indexing/readback runs through the committed
  `round4/finalize-and-check.mjs` instead.
- `SOURCE-CHANGES-round4.json`: original-base and final source hashes, including
  the copied fixture changes. No acceptance pin was moved.

See `REPORT-round4.md` for interpretation, explicit timing/resource limits and
the PASS audit; `COMMANDS-round4.md` has the exact execution commands.
