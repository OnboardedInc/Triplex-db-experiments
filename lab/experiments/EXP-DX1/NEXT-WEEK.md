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

8. **Import pacing did not protect neighbours (server 1, 2026-11-20 21:01 local, `bm1/HA1-PACING-READING.md`,
   grouped writer):** feedback pacing 1,715.56 queryable facts per second, fixed pacing 2,986.07; quiet save p99
   60.75 and 62.84 ms against controls of 12.73 and 6.61 ms (4.8 to 9.5 times); quiet read p99 1.8 to 3.8 times.
   Even at 32 frames per second every live account's save p99 was 5 to 14 times its control. Next: the same test
   on the per-person ordered writer (import frames as prepared saves with ordered ids), then import on its own
   gateway process. Earlier entry (DX-HA1 finished part 6 at `e1b5d34d2` on 2026-11-20 and is parked;
   `load1/MICRO-ATTRIBUTION.md`, `MICRO-SERVER.md`).** Its attribution of the server run: a quiet save at p99 spent
   18 to 25 ms in the write gateway's queue; gateway pauses overlapped 7 to 10 of the 12 slowest reads in each import
   arm; the archive cannot separate CPU contention from storage wait. Its next server run (15 to 25 minutes, on
   server 1's queue) compares a feedback-paced import with a fixed rate at 32 facts per frame; forecast 2,000 to
   2,880 facts per second with quiet save p99 14 to 24 ms under feedback. If pacing cannot hold both bars, the next
   candidate is import on its own gateway process. Planned-move pause on the Mac was 22.79 and 31.74 s (bar 30 s):
   needs bare metal. Earlier text: Small frames reach the rate (2,002 to 3,983 facts per second) and slow
   a quiet account's saves 3 to 7 times (bar 1.5). After DX-HA1's attribution: build the fix it points to (import
   on its own gateway process or capped pool, a rate that backs off on live p99) and rerun.
9. **Quiet-account isolation with the present writer fails by about ten times** at 235 offered saves per second
   (server 1, four Java arms). After the per-person writer comparison: either harden that writer (fair-turn arm,
   two and four gateways) or, if it does not close the gap, write the options for Sam with the evidence.
10. **Memory per untouched thin person:** read gateway 72.48 B against 64 B at one million people; find the 8 B.
    Deep accounts: read gateway 322 B per person and transactor growth, as scorecard rows.
11. **Why deep saves queue inside Datomic** (12.61 storage segment reads per deep save against 0.55 thin): after
    the two cache arms, attribute the remaining tail with the per-event recording.
12. **Paged query without an explicit cut could miss a just-stored save** (both layouts): fixed in DX-W1 part 7
    (`eb529d629`, zero extra stored records); confirm it is on `exp/DX-INT1` and add it to the scorecard's
    correctness rows. Left open by DX-W1 (parked 2026-11-20 at `25c9eeb79`): converting a scope that already holds
    protected values in clear (the gateway refuses the conversion and leaves the data readable); the
    clean-consumer packaging check; bare-metal timing of the one-request point query.
12a. **A query cannot filter by the value of a protected field** once an account has a removal policy (typed
    refusal `ErasureQueryUnsupported`; a direct read of the field still works). If the product needs "find the
    person with this SSN" or duplicate-SSN detection, that needs a design (for example a keyed digest index). Ask
    Sam whether it does.
13. **Erasure (DX-ERASE1 stopped 2026-11-20 16:20 local by the provider's content filter for the second time that
    day, at `1d6e9afcc`; not resumed under the weekend rule; two modified files are uncommitted in its worktree).**
    Landed that afternoon: parallel saves and deferred Publish work stay safe across a removal (`9fdad4ed2`),
    removal records and sealing material kept outside data backups (`dec122118`), a measurement of folding removed
    bodies into scheduled index work (`1d6e9afcc`). Still open: finish and report those three, merge onto
    `exp/DX-INT1`, the server arms. Start it in a fresh session with a summary, not a resume: the filter has now
    ended the same session twice. Original list: durable home for the erasure sequence and keys (survives losing a gateway host), a protected save
    within 0.3 ms of a plain one, cleanup neighbours do not feel, protected values as references in layout K.
14. **Publish (DX-ACT1 finished part 8 at `9ae32c676` on 2026-11-20 and is parked; code on `exp/DX-INT1` at
    `0196b9952`; server candidate `acc0f5c39`).** Left open by it: the deep settlement run at 23.5 saves per second
    (hit its Mac cap before either end was verified), the full interference trace, the resident-memory bar, pooled
    Publish at both scorecard ages, and whether notices keep protected inputs. Original list: thirty or more Publishes per rate under load with Publish priority on a server; background writing
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
21. **Playground data size (DX-PLAY1 finished part 2 at `c5330503d` on 2026-11-20 and is parked).** Snapshot
    start works and passed the full gate. Its sizing fit (23,018 compressed bytes per retained save) is about
    fifteen times DX-W1's 1,531 settled bytes per save at scale: its three small test databases (350 to 1,050
    saves) carry the index segments each small index job rewrote, and a PostgreSQL dump copies unreachable
    segments too. Redo the sizing with Datomic's own backup (reachable segments only) or after storage garbage
    collection, at sizes of thousands of people, before the tier table goes to Sam. Reference from server 2: ten
    full-size accounts, 162,456,470 facts, 115.4 GB of PostgreSQL data, 710 bytes per fact before any history.
    Then: full data tier build on a server, upload, clean-clone workflow run, erasure switched on, larger
    load panel, continuous compliance scenarios.
21a. **Scorecard rows 5 and 9 on the held seed** (DX-V01 parked 2026-11-20 at `4fece9022`, server commit
    `790d9e96e`): the Publish and failover runners use fixtures the SCALE1 seed does not match, so those rows print
    NOT MEASURED; make them adopt the held seed. Also: the seed verifier on server 2 is single-threaded (about five
    feed positions per second, about 7.5 hours for 87,001 frames at $1.09 an hour); make it parallel or sampled
    before any future full-size seed.
22. Version 0.1 write-up: README for the merged branch, the scorecard at both ages with every failing line's cause
    and next step, known limits (query support lists, failover policy, import).
23. Housekeeping: archive older DX-BM1 evidence bundles (18.7 GB in 44 files) to the Drive archive; remove
    worktrees of finished builders; make the lease switch part of the tooling on the merged branch.
24. Reviews by a second reader of the parts merged this week (per-person writer, erasure sequence, failover
    fence), as was done for the write path on 2026-11-19.
