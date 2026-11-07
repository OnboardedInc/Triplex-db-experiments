# EXP-P2X XTDB per-subject commit path and change feed (tiny, 10k rung; includes CF01 for XTDB)

**North star:** P2 (small atomic idempotent per-subject commits, low latency) first, P3 (ordered resumable feed) second. Measured as
TARGETS 1.1 P2 (open-loop offer-to-published-ACK per size band, full command accounting) and P3 (durable affected-set record plus
checkpoint, lag from source publication, three crash points, visible duplicate effects 0).
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md v2 (sections 1.1, 2.1, 4.1). Evidence to build on:
lab/research/R16-xtdb-northstar-fit.md sections 2 and 3, lab/research/R18-read-path-feed-sweep-prior-art.md sections 3 and 5,
lab/research/R14-xtdb-correctness-hazards.md. Inherited homebase files are for code facts only.

## Commander's intent
Commits on different subjects stop contending with each other while the feed stays gap-free and resumable. Today every commit in a
scope asserts `MAX(position) = K` over `tx_meta FOR ALL VALID_TIME` (`packages/xtdb/src/XtdbStorageAdapter.ts:189-196`), so all
commits in a scope serialize on one counter, and that assertion may scan more rows as history grows. When this lands, XTDB has a
measured commit path whose CAS is per subject, whose order and gap-freedom come from XTDB's own log, and whose feed carries
(tx, entity, attribute, valid-time range) to a durable consumer checkpoint, with numbers for both against the A0 control.

## Point of view (the technique to pursue)
1. **Per-subject CAS.** The command asserts the subject's last position (`ASSERT EXISTS (... _id = subject AND pos = n)` or NOT EXISTS
   for a new subject; R16 measured about +5 ms), never a scope-wide maximum. The idempotency claim stays an `_id` row keyed by commandId
   (R16: duplicates rejected 100/100 with P0004, receipt readable by `_id` in 11 ms); read the claim before writing, so a duplicate costs
   a read, not a rejected transaction.
2. **Order and gap-freedom from the log.** XTDB applies transactions in log order and tx ids are strictly increasing log offsets (R16 3.4).
   Use the tx id (or the tx's system time, if you show it is strictly increasing per node on 2.2.0) as the feed position, with a
   high-water mark ("every tx at or below H is committed or aborted") replacing the dense counter. Write a short design note on what
   C1's basis rules need from a non-dense position and keep `recordedPosition` meaning "this commit's place in the total order".
3. **Feed carrier in the same transaction.** `METADATA = {cmd, subj, pos, attrs, vf, vt}` plus a feed row inserted in the same
   transaction (R16 3.4). One tailer on `xt.source_log_msgs` (O(window), 2 ms empty poll), commit status from `xt.txs` or
   `xt.replica_log_msgs`, fan-out in Triplex. Never many pollers on `xt.txs` (R16: 32 pollers stalled commits for seconds).
4. **Durable consumption.** The consumer writes its affected-subject set and its checkpoint (`msg_id`) in one durable write; effects are
   keyed (consumer, position, subject). Inject crashes before the effect, after the effect before the checkpoint, and after the checkpoint;
   count replay attempts and visible duplicate effects separately (the control arm without keyed effects should show at least one
   duplicate, which proves the test can fail).
5. **Two arms, same trace.** A0: today's adapter (scope-wide counter). Candidate: points 1 to 4 behind an adapter option, default off.
   Same seed, same open-loop offer schedule (TARGETS 2.1; use EXP-N01's generator from `exp/N01-northstar-bench` if it is ready, else
   a minimal Poisson generator with the 2.1 parameters and bind its hash in the receipt).

## Predictions (falsifiable; report each as met or not)
- With 16 writers on distinct subjects of one scope: A0 shows CAS conflicts or queueing; the candidate shows zero cross-subject conflicts.
- Candidate commit service time p50 is at least 4 ms lower than A0 at the 10k rung after 100k commits (no scope-wide MAX scan).
- Candidate feed: zero gaps and zero per-subject order violations over 100k commits; lag p99 ≤ 250 ms with one tailer; zero visible
  duplicate effects over 100 injected crashes.
- Host load is high while other agents run, so absolute latency bars are reported, not judged; relative A0 versus candidate on the same
  slot and same window is the verdict.

## Boundaries
- Worktree branch `exp/P2X-xtdb-commit-feed`. Files: `packages/xtdb/src/**` (new behavior behind an option, default off), its tests,
  `lab/experiments/EXP-P2X-xtdb-commit-feed/**`. Coordinate by rebasing: EXP-X02 and EXP-F02 also touch packages/xtdb.
- Engine slot: `node lab/bin/engine.mjs up --lane xtdb --slot s1` (3.5 GiB); release it when done. Never ports 15442/17019; Docker only
  via DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through lab/bin/engine.mjs.
- Correctness floor: `node lab/bin/gate.mjs G1 --lane xtdb` passes with the option on and off before you report.
- Code comments record the reason for each choice (cite R16/R18 sections).

## Report
Commit hash; the design note; A0 versus candidate tables (per size band p50/p90/p99, conflicts, throughput; feed lag, gaps, order,
duplicates, replay attempts); prediction verdicts; receipts; open questions. The orchestrator saves it as REPORT.md.
