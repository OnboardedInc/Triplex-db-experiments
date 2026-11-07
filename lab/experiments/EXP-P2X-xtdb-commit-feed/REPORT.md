# EXP-P2X per-subject commits and a log-ordered feed on XTDB: report (saved by the orchestrator, 2026-11-07 23:05Z)

**Bottom line:** the candidate (`commitPath: "subject-stamp"`, default `"scope-counter"` = A0 unchanged) removes cross-subject contention
(0 conflicts against thousands for A0) and, after about 20k commits of history, cuts commit service time 6 to 8x. The feed is gap-free,
ordered and resumable in every audited run. Not met: feed lag (steady p99 2.9 s against 250 ms, because the consumer's durable write queues
in the same serial indexer as the writers) and the 100k-commit rung (about 250 KB of slot volume per commit; 100k would need about 25 GB).
The TARGETS 2.1 burst (55/s on a 2-CPU node) overloads both arms; the hot subject (20% of commands) turns optimistic per-subject CAS into a
retry storm that a per-subject driver queue removes. Branch `exp/P2X-xtdb-commit-feed` final fb6681a (code e6d165c); slot s1 released.

## Design (lab/experiments/EXP-P2X-xtdb-commit-feed/DESIGN.md on the branch)
- Order: the engine stamps the position in the transaction from its own system time (2.2.0 gives each transaction a system time later
  than the latest completed one, +1 µs when the clock has not moved, TxResolver.kt:204-246; DML runs with currentTime = systemTime); 320/320
  concurrent commits had stamp = `_system_from` = `xt.txs.system_time`, strictly increasing in tx-id order.
- Coordinates (Q31c): stream = the database's source log; epoch and offset = tx id ((epoch << 48) + offset, MsgIdUtil.kt:12-15); ordinal =
  the Triplex transact inside one engine transaction; packed (stamp_us - 2020-01-01Z) * 8 + ordinal (8 ordinals, exact until 2055,
  refused 30 days before).
- CAS per subject: no `tx_heads` row newer than the source cut for every entity read or written; unconfined reads escalate to the scope
  head; claims, identity, attempts, receipts are `_id` lookups; 8 statements per commit (same as A0).
- Feed: METADATA plus a `tx_feed` row with exact tuples in the same transaction; one source-log tailer; watermark = fully resolved prefix
  (stops at appended-unresolved, lists aborted, never crosses an epoch, at most 8 MiB per poll, torn tail not yet readable).
- Consumer: keyed effects (consumer, position, subject) and checkpoint in one transaction, fenced by an ASSERT on the previous checkpoint.
- ACK after `COMMIT SYNC` plus one receipt point read; read-your-own-write by routing to the same node with the await token (Q31e).

## Falsifiers (Q31c): all PASS (packages/xtdb/test/subject-stamp.test.ts 13/13)
F1 nested cuts (3 transacts at one stamp get p, p+1, p+2; rolled-back nested transact frees its ordinal); F2 abort gap (5,313 aborted
resolutions in the candidate trace, 0 gaps); F3 crash between append and resolution (writer side; blocked polls 882/134/288, never a
resolution past an unresolved one; engine kill untested because engine.mjs has no kill); F4 resume at an abort gap.

## A0 against the candidate (same slot s1, 2 CPU, 3.5 GiB; host load 8-19 on 12 cores; reported, not judged)
16 writers, 16 distinct subjects, closed loop, 30 commits each (committed/480, typed conflicts, CAS rejections, commits/s, p50/p90/p99 ms):
| History | Arm | Committed | Conflicts | CAS rej. | c/s | p50 / p90 / p99 |
| --- | --- | --- | --- | --- | --- | --- |
| fresh | C | 480 | 0 | 0 | 32.6 | 401 / 900 / 1,041 |
| fresh | A0 | 258 | 222 | 3,376 | 6.6 | 297 / 1,027 / 2,118 |
| fresh | A0 + admission queue | 480 | 0 | 0 | 17.2 | 52 / 90 / 19,409 (unfair) |
| ~20k | C | 480 | 0 | 0 | 21.0 | 695 / 1,039 / 1,461 |
| ~20k | A0 | 282 | 198 | 3,657 | 1.1 | 3,777 / 10,088 / 15,686 |
Service time, 1 writer, 10 facts (p50/p90/p99 ms): fresh A0 57.0/81.8/125.4 and 56.2/70.1/87.5, C 42.6/58.1/93.1 and 79.7/155.7/245.3;
~13k A0 641/909/1,416, C 84.9/142.9/246; ~20k A0 484/759/1,420 and 611/1,578/1,834, C 74.7/97.6/147 and 77.9/113.2/254.4. A0's asserts scan
`scope_key` over every scope's rows; the candidate's reads stay about 5 ms. A0 receipt scan 39 ms against 3 ms over 24,454 attempt rows (p12).

Open-loop TARGETS 2.1 trace (seed p2x-a, 10k subjects, 300 s with a 60 s burst at 55/s, ~20k history; 3,554 offered + 110 re-sends, 39 lost
ACKs, 41 corrections; generator c93f3064c771..., trace 58b41e2300e0...; 180 s drain cap):
| Measure | A0 | C | C + per-subject driver queue (diagnostic) |
| --- | --- | --- | --- |
| committed in window / 3,554 | 105 | 569 | 2,987 |
| commits/s | 0.35 | 1.9 | 9.96 |
| CAS rejections | 5,900 | 4,982 (all same-subject) | 0 |
| typed failures | 2,031 read deadlines, 768 unknown, 12 conflicts | 394 deadlines, 2,374 unknown, 216 conflicts | 12 unknown |
| pending at cap / unaccounted | 657 / 0 | 0 / 0 | 573 (469 + 104 on the two hottest subjects) / 0 |
| steady ACK p50 / p99 ms | 2,444 / 12,554 | 615 / 218,641 | 294 / 256,003 |
| feed gaps / order / dup | 0/0/0 | 0/0/0 | 0/0/0 |
| feed lag steady p50/p90/p99 ms | 955 / 2,149 / 7,965 | 928 / 2,199 / 2,910 | 829 / 3,276 / 6,319 |
| feed lag burst+60 s p50/p99 ms | 6,140 / 7,951 | 1,238 / 3,545 | 3,131 / 9,727 |
Per band (5-10 / 11-25 / 26-50, committed only, p50/p90/p99 ms (n)): A0 1,845/7,054/309,466 (73), 2,764/10,901/290,121 (25), 2,988/8,594/8,594
(7); C 78,420/265,574/319,379 (328), 132,502/239,030/317,905 (181), 53,802/218,090/279,321 (60); C+queue 175,779/290,885/334,825 (1,779),
167,389/291,128/335,254 (895), 170,521/291,229/338,925 (313). Re-send and lost-ACK receipts matched in every arm.

Feed under saturation (5,000 commits, 16 writers, uniform subjects): 5,000/5,000 at 10.3 c/s, 0 CAS conflicts, 0 gaps/extras/order/dup,
lag p50/p90/p99 1,160/2,437/3,758 ms; writer submit p50 1,377 ms and consumer write p50 971 ms (same indexer). Crash injection, 100 per
variant (34 before effect, 33 between effect and checkpoint, 33 after): keyed-atomic, unkeyed-atomic and keyed-split 0 visible duplicates;
unkeyed-split control 99. Either protection alone suffices.

## Predictions
1. Zero cross-subject conflicts: MET. 2. Service p50 at least 4 ms lower at 100k commits: MET at ~20k (409-533 ms lower, 6.5-7.8x), 100k not
reachable. 3. Feed: gaps/order MET on all audited runs (not over 100k); lag NOT MET (2.9 s steady p99, 3.8 s saturated); duplicates MET.
4. Absolute P2 bars: neither arm comes near them on this node.

## Defects found and fixed
Stamp expression per VALUES cell exhausted XTDB's 2 GiB heap (each cell compiled as its own projection, operator/table.clj:106-113): fixed by
INSERT ... SELECT over a parameters-only VALUES source. Source-log upper bound at the epoch end returns no rows: windows end at epoch start +
2^47. Keyed effects without `_valid_from` opened new valid-time slices on replay (caught by the keyed-split control). Order audit miscounted
replays (harness fix). Measured cost: candidate writes 3.5x more source log than A0 (95,364 against 27,581 bytes per 10-fact commit, p10),
likely the always-NULL second parameter column per stamped column.

## Gates and receipts
G1 xtdb at bd187d9 fresh engine: option off PASS 88/88 (G1-xtdb-20261107T225224Z-4c5452), on PASS 88/88 (G1-xtdb-20261107T225349Z-235fec;
234 tx_feed rows across 85 scopes). A G1 run on the history-heavy engine hit Datalog read timeouts (both arms scan `scope_key` over ~900k
rows) and wrote no receipt. One A0 test ("lost acknowledgement through the operation marker") fails on the history-heavy engine: its 1 s budget
covers COMMIT SYNC, which now takes ~500 ms. Receipts in lab/experiments/EXP-P2X-xtdb-commit-feed/receipts/ on the branch; raw samples in
/Users/sam/Claude/Projects/triplex-db-2/EXP-P2X-xtdb-commit-feed/; probes p0-p12 and the bench harness under the experiment directory.

## Open questions (ruled Q51)
1. Hot subjects: per-subject queue in the runtime's command router plus same-subject group commit (up to 8 via ordinals). 2. Feed lag: move
the consumer's checkpoint and effects to a separate log. 3. Core hands out positions before commit (adapter placeholders and `bindPositions`).
4. Log bytes 3.5x. 5. The 100k rung needs a 25 GB slot. 6. Untested: engine kill between append and resolution; mixed-path scopes; xt.txs and
METADATA cost at 1M+ transactions.
