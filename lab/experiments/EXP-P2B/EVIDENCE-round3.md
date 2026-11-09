# EXP-P2B round 3 evidence index

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/`.
All raw observations, database components, native binary identities, source/build
preimages and failed attempts remain outside git. This index and its checksums are builder
execution evidence, not a contract receipt or independent qualification.

- `round3/matrix-*.json`, `sweep-step3.json`, `selected-workers.json`: canonical
  comparison pointers and measured eight-worker selection. The complete set is
  explicitly enumerated by `round3/analyze.py` (81 successful cells).
- `round3/analysis.json`: raw-byte-checked aggregation, stage/CPU distributions,
  all top-ten tails per band with nearest host/disk/process snapshots, and the
  hashes of the matrix/selection inputs. `ROUND3-RESULTS.json` is the smaller
  committed summary and binds the analysis hash and those inputs.
- `round3/r3-*`: UUID attempts, exact offered traces, receipts, raw clocks,
  reports, host samples, source/build identity/preimages and per-attempt checksums.
  Successful bulky files use `ARCHIVE.json` plus gzip; failed attempts remain.
- `round3/snapshots/`: frozen ordered comparison variants, including superseded
  guard/setup versions. Dependency directory symlinks reuse the installed
  workspace; `LINK-TARGETS-round3.json` declares their targets. Recorded execution
  preimages, not a subsequently rebuilt dependency, identify historical bytes.
- `round3/controller-cf542c7c-cda4-44fb-a4ab-9e4201420cfc/`: actual continuation
  controller preimages, source identity and inherited report/pointer bindings.
  Earlier controller directories/preimages are retained separately.
- `round3/pipeline-complete.json`: completed continuation marker, selected pool
  and inherited-input identities. It is not a P2 acceptance verdict.
- `round3/matrix-step4-sync-40-first-failure.json` and
  `r3-pipeline-attempt1.log`: retained witness/snapshot-order failure and the
  preceding positive observations. The corrected nine-cell control is separate.
- `r3-pipeline-attempt2.log`: all corrected maintenance/final-candidate launches.
  Other `r3-*` logs retain setup/build/gate failures and subsequent checks.

Eight manifests, `SHA256SUMS-round3-01.txt` through `-08.txt`, index 25,708 retained
regular files (about 4.31 GB) by
absolute path. Run `shasum -a 256 -c MANIFEST` on this host. They do not follow
external dependency-directory symlinks or assert historical power-loss survival.
Original per-case checksum entries for compressed files are verified through
`round3/archive.py --verify ATTEMPT_DIRECTORY`; see `COMMANDS-round3.md` for
lossless restoration instructions. `SOURCE-CHANGES-round3.json` lists HEAD/base
and final source hashes; no acceptance pin or generated contract was changed.
