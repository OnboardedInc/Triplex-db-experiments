# Work logged for next week (not launched over the weekend)

Sam, 2026-11-20: launch only what the weekend's server runs need; log everything else here. Each entry says what it
is, why it matters, and what it is waiting on. Newest decisions and results are in `STATUS.md`; version 0.1 is
defined in `lab/V0.1.md` on main.

## Waiting on a decision from Sam

1. **Failover after a machine loss: A, B or C** (`origin/exp/DX-HASYNC1-sync-failover`, `hasync1/OWNER-DECISION.md`).
   B is the default until he answers. C needs a third machine and a provider that allows three servers.
2. **Which Cloudflare account holds the playground's test data, and may it be publicly readable.** Nothing is
   created or uploaded until he answers.
3. **Playground data size** once DX-PLAY1's measured tier table exists (largest that fits 5 GB; full population with
   history for active people; full population with full history).
4. **Broad journal queries on the compact layout:** leave as is, add a journal index (3 to 7 records per save), or
   store journal entries as full facts (21 to 49) (`origin/exp/DX-W1-commit-tail-reads`, `w1/QUERY-SUPPORT.md` when
   written).
5. **Deadline for physically removing sealed values after erasure**, if DX-ERASE1's `OWNER-DECISION.md` asks.
6. **Java version and memory cleaner** after the three server arms: Java 21 with G1, Java 25 with G1, or Java 25
   with ZGC (13 GiB more reserved memory in the trial).
7. **Continuous compliance scenarios for the playground:** Sam will explain what he wants.

## Follow-ups from results already in

8. **Import interference in one database.** Small frames reach the rate (2,002 to 3,983 facts per second) and slow
   a quiet account's saves 3 to 7 times (bar 1.5). After DX-HA1's attribution: build the fix it points to (import
   on its own gateway process or capped pool, a rate that backs off on live p99) and rerun.
9. **Quiet-account isolation with the present writer fails by about ten times** at 235 offered saves per second
   (server 1, four Java arms). After the per-person writer comparison: either harden that writer (fair-turn arm,
   two and four gateways) or, if it does not close the gap, write the options for Sam with the evidence.
10. **Memory per untouched thin person:** read gateway 72.48 B against 64 B at one million people; find the 8 B.
    Deep accounts: read gateway 322 B per person and transactor growth, as scorecard rows.
11. **Why deep saves queue inside Datomic** (12.61 storage segment reads per deep save against 0.55 thin): after
    the two cache arms, attribute the remaining tail with the per-event recording.
12. **Paged query without an explicit cut can miss a just-stored save** (both layouts): fix in progress in
    DX-W1 part 7; confirm merged and add to the scorecard's correctness rows.
13. **Erasure (DX-ERASE1 stopped 2026-11-20 16:20 local by the provider's content filter for the second time that
    day, at `1d6e9afcc`; not resumed under the weekend rule; two modified files are uncommitted in its worktree).**
    Landed that afternoon: parallel saves and deferred Publish work stay safe across a removal (`9fdad4ed2`),
    removal records and sealing material kept outside data backups (`dec122118`), a measurement of folding removed
    bodies into scheduled index work (`1d6e9afcc`). Still open: finish and report those three, merge onto
    `exp/DX-INT1`, the server arms. Start it in a fresh session with a summary, not a resume: the filter has now
    ended the same session twice. Original list: durable home for the erasure sequence and keys (survives losing a gateway host), a protected save
    within 0.3 ms of a plain one, cleanup neighbours do not feel, protected values as references in layout K.
14. **Publish:** thirty or more Publishes per rate under load with Publish priority on a server; background writing
    time and the notification sending rate reported; bars for both are Sam's to set later; same-database
    settlement price (the existing producer put the live neighbour in a different database).
15. **Aged reads:** the isolated installer held 100 and 98 percent on a server with two reused old cuts; repeat with
    many distinct old cuts and on the 1 billion record database.
16. **Java 25:** eight unexplained failures in the broad SQL suite; resolve before any default changes.

## Not started, deferred past version 0.1 or past the weekend

17. Aging beyond 1 billion records (2, 4, 8 billion) when there is budget; the growth model's predictions are the
    hypotheses to test.
18. Three-machine failover (option C) on real servers.
19. Moving every account to a successor database, on servers.
20. Production key custody and rotation for erasure (15 minute rotation window).
21. Playground: full data tier build on a server, upload, clean-clone workflow run, erasure switched on, larger
    load panel, continuous compliance scenarios.
22. Version 0.1 write-up: README for the merged branch, the scorecard at both ages with every failing line's cause
    and next step, known limits (query support lists, failover policy, import).
23. Housekeeping: archive older DX-BM1 evidence bundles (18.7 GB in 44 files) to the Drive archive; remove
    worktrees of finished builders; make the lease switch part of the tooling on the merged branch.
24. Reviews by a second reader of the parts merged this week (per-person writer, erasure sequence, failover
    fence), as was done for the write path on 2026-11-19.
