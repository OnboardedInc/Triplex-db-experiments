Use this branch's Part 4 command for the new ladder. Keep the original stopped volume and its verified prefix.
The first server run wrote 5,284 records per second. The loader waited mainly inside Datomic submission.
The old archive cannot split that wait between applying saves, writing to disk, and indexing.
The new ladder gets two complete index jobs before trusting an arm's rate.
The ladder tries one, eight and twenty-four saves per transaction and takes at most one hour.
If the best rate cannot finish at one billion within the sixteen-hour loading budget, the command stops.
The scorecard still receives its original handoff at the sealed cut.
The server must verify the rate. This branch has no one-billion seal yet.

# DX-AGE1 Part 4

- [Archive attribution, predictions, and exact driver commands](BULK-LOAD.md).
- [Scorecard handoff](SCORECARD-HANDOFF.md) and [archived Mac evidence](EVIDENCE-ARCHIVES.sha256).
- The held prefix remains at 431,778,659 records before this ladder. Synchronous SQL durability remains on.
- Grouped history changes native t, index mix, and log geometry. The application-visible rows, logical cuts, clocks and feed use the W1 representation. Timed product saves are solo.
- No server has been contacted for Part 4. Mac timings are diagnostic. No acceptance pins changed.

## Evidence audit

- The held-prefix admission compares the archive's exact checkpoint and population SHA-256s, the verified seed manifest, source and live scope/t/head. Its first proof binds the archive and current machine. A resume verifies every newly stored native record from the admitted pending range.
- Bulk acknowledgment and recovery compare the complete native log multiset, independent owner identity, physical t and unique datom count to the authored tape. They bind to the current adopted population, attempted group range and committed native report or exact pending cut.
- Ladder rate selection checks the fresh process attempt and SQL durability, verified native record counts against the settled census, and two same-scope native job starts/ends adopted during the arm. The log inode is opened by the pinned transactor. The artifact hashes bind the rates to the exact inputs and process evidence.
- Bulk-loaded evidence requires the fresh phase's verified indexed 1B count and SHA-256s of the calibration, checkpoint and attempt logs. The original seal independently checks current and pinned bytes, feed, the native backup and restore, and the exact cut of the scope.
- The Mac fixture binds an archived source, active lab slot and native DB identities. It compares the mixed-format cut with the exact SCALE1 product path and passes the live bundle checks against expected history, scope, pinned reads and feed.
