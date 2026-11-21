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

16a. **Full-size capacity and fairness (state at 2026-11-21 01:00 local).** Ordered writer, ten accounts of 100,000
    people in one database: 361.51 saves per second delivered at 394 offered with the transactor on three cores and
    16 GiB (7 percent expired); the transactor used 1.1 to 1.5 of its three cores, so the limit is elsewhere
    (gateway preparation, the six-credit fair turns, about 0.75 to 1.1 storage reads per save for a person's own
    rows). To do: attribute it; two write gateways now that the serial step is cheap; a 32 GiB cache; the person's
    current rows on a dense record; fair-turn credit size. Quiet account: best 2.29 times at full size, 1.36 on
    the small seed with the combined settings (bar 1.25); the six remaining slow appends in the combined arm are
    unattributed. Each treatment ran once: repeat the key arms.
16b. **Two-server failover measurements (priority 9)** were not run this weekend: server 2 was occupied and server 1
    was released. Needs both servers for 17 to 30 minutes plus setup, and Sam's A, B or C choice.
16c. **Erasure full stage on server 1** stopped after both fixtures were sealed because a shutdown check still
    reached a listener (tooling); the 128-person check verified.
16d. **Memory-matched G1 against ZGC** (G1 with 37 GiB reserved) to separate the collector from the memory.

16e. **Publish with priority under load (server 1's last run, 2026-11-21 02:05 local, `origin/exp/DX-BM1-bare-metal`
`d767ae051`).** At 25,000 deep people, one account in one database, old settings (Java 21 G1, one core per JVM): all
90 Publishes gave a correct first answer inside one second; first-answer p99 36.72, 112.20 and 84.21 ms at 3.5, 23.5
and 39.4 offered saves per second (30 Publishes per rate). Open: (a) **the same at 100,000 people** was not measured
(a fresh 100k seed needs about 3.25 hours); (b) **at 39.4 offered the account's saves were acknowledged at only
25.39 per second, 2,527 were still pending one second after the window, and save p99 including queueing was 119.67
seconds**, with one Publish every five seconds: find out whether Publish priority starves saves at that Publish rate
or whether the one-core settings were the limit, and repeat on the `server` profile; (c) what a realistic Publish
rate is for the deepest account (ask Sam or measure from production).

16f. **Where the product writer's limit is at full size (reading from the aging ladder, 2026-11-21 02:46 local,
`origin/exp/DX-SCALE1-deep-accounts` `93e49dfb0`).** One loader with 256 saves in flight put 762 to 988 solo saves
per second (20 records each) through a three-core transactor on the full-size database, with a 24 GiB heap, 16 GiB
object cache, 128 MiB memory-index threshold, 2 GiB maximum, index parallelism 2. The product writer delivered 346
to 365 saves per second at full size on a similar transactor the same night. Compare the two paths step by step
(gateway preparation, fair-turn credits, per-person row reads, reads per save 0.74 to 1.1, memory-index settings:
the `server` profile's values against the ladder's) and measure the product writer with the ladder's transactor
settings.

16g. **TOP ITEM. Release fair-turn credits one at a time (reading of the fresh full-size scorecard, 2026-11-21 04:43
local, `origin/exp/DX-PREP1-parallel-prepare` `e7a977908`, `prep1/SCORECARD-FRESH-READING.md`).** The six-credit
writer waits for the slowest durable ACK of a turn before it releases any credit. At 394 offered it must turn over
every 15.23 ms; it averaged 16.88 ms on the headline setup (18.68 ms on the default), which caps delivery at 343
(297). Over 99% of turns used all six credits. At 235 offered, 97.3% of the time beyond 50 ms was waiting behind
earlier turns; own native queue, apply and append together were about 1.3%. Proposal: rolling credits released per
durable ACK (compare 6, 8, 12, 16), one reserved quiet opportunity, a cap on already-submitted neighbour saves
ahead of it, the existing per-person order fence kept. Builder's forecast: 390 to 440 per second at 620 offered
with 12 rolling credits; quiet loaded p99 35 to 55 ms at 235 and 394. Asked Sam on 2026-11-21 whether to build it
this weekend while server 2 is still rented (one 80-minute rerun, about USD 1.45).

16h. **Settings candidate from the same reading (not applied; the 1 billion card keeps the measured headline
setup so the two cards compare):** PostgreSQL on two cores, `max_wal_size` 4GB, `min_wal_size` 512MB; write gateway
on three cores. Forecast 350 to 365 at 394 offered and 335 to 350 at 620. Rejected if 394 stays at or below 345
with turns still at 16.7 ms or more. Needs per-role CPU, checkpoint logs and index job events on one clock, which
the fresh card's archive does not have. Measurement added 2026-11-21 06:36 local, during the 1 billion load (not the scorecard's save path): PostgreSQL's
single core was 49 to 65% busy with 4% I/O wait and no throttling, the transactor used 1.7 of six cores and no core
was over 50% busy, so a second PostgreSQL core is not supported by that sample for the load. Take the same sample
during a scorecard window before trying the candidate.

16i. **Scorecard windows start cold and are 90 seconds long.** Offers in the first 30 seconds account for 96.8% of
the time beyond 50 ms at 235 offered on the headline setup; sender wait p99 fell from 2,447 ms to 132 ms between
the two halves; at 394 delivery was 302.4 per second in the first half and 383.4 in the second. The card should
report the halves separately and run longer windows. The archive cannot separate cache state, maintenance and
workload phase as the cause.

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
