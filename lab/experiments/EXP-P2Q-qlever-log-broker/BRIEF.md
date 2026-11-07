# EXP-P2Q QLever lane: log of record plus broker as the source of truth (P2, P3; includes CF01 for QLever)

**North star:** P2 (small atomic idempotent per-subject commits, low latency) and P3 (ordered resumable feed) for the composition where
QLever serves reads. Measured as TARGETS 1.1 P2 (open-loop offer-to-published-ACK per size band, full accounting, progress) and P3 (lag
from durable publication to the consumer's durable record, three crash points, zero visible duplicate effects).
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md v2 (1.1, 2.1, 4.1). Evidence: lab/research/R17-qlever-northstar-fit.md (sections
0.2, 0.3, 2, 3), lab/research/R13-log-of-record.md, lab/research/R8 (QLever write probes), EXP-002 report. Rulings: Q31c (coordinates),
Q31d (eligibility), Q31e (ACK after source publication, read-your-own-write by routing), Q34b, Q36a. PLAN C2 and C3.

## Commander's intent
Make QLever a first-class read layer behind a durable, fast source of truth on the host, so the all-QLever composition can meet P2 and P3
instead of failing by orders of magnitude as the delta grows (EXP-002: 7 ms fresh, seconds later; R17: ACK p50 129 ms at 500k delta).
When this lands, the QLever lane has a measured commit path whose ACK latency does not depend on the delta, an exact feed from the host
log, and read-your-own-write that holds by routing.

## Point of view (the technique to pursue: R17 option A, under Q31e)
1. **The source of truth is the host log plus a broker** (C2, R13): each command is one framed record (header with CRC32C, pure quad
   frame: the broker's own record of the terms it writes, never a read-back from QLever), appended and fsynced (`fs.fsync` is
   F_FULLFSYNC on macOS, about 3 ms). Positions are (stream, epoch, offset, ordinal) per Q31c; the broker publishes a durable watermark
   after each fsync. Idempotency claims and per-subject CAS (subject's last position) are decided by the broker from its own record.
2. **ACK after the durable frame** (Q31e: the source of truth's publication). Publishing to QLever is asynchronous: one applier takes
   everything queued (up to 64 commands) into one guarded update (`DELETE {old, marker=P} INSERT {new, ledger quads, marker=P+n,
   claims, outbox} WHERE {marker=P}`), on a new HTTP connection per request (QLever sets no TCP_NODELAY: keep-alive adds about 40 ms).
3. **Read-your-own-write by routing.** A pull at basis B is served by the QLever replica if its marker has reached B; otherwise the
   kernel merges the broker's overlay of unpublished frames (positions between the replica's marker and B) into the replica's answer.
   That composite reader is eligible for B only if the overlay is complete for that range; otherwise route to the broker's own record.
4. **Bound the delta** with an online `rebuild-index` triggered by delta size, and measure what the trigger costs live reads (R17: a 54 s
   rebuild took read p50 from 108 ms to 1.4 s). The ACK path must not depend on it.
5. **Feed from the host log** (R17 section 3): consumers read frames up to the durable watermark only (a tailer sees frames about 3 ms
   before fsync returns); checkpoint (LSN, offset) written tmp + fsync + rename; effects keyed (consumer, position, subject); three crash
   points; count replay attempts apart from visible duplicate effects.
6. **Filter temporal predicates in the kernel,** never `FILTER(?rp <= P)` or `VALUES` of transaction IRIs against the ledger (R17: 8.5M-row
   scans).
7. **Two arms on one trace:** A0 = today's QLever adapter (ACK after publication); candidate = points 1 to 6 behind an option, default off.

## Predictions (falsifiable)
- Candidate ACK p50 ≤ 6 ms and p99 ≤ 20 ms for the 5-10 fact band at delta 0, 100k and 500k (A0: 11 / 34 / 129 ms p50 per R17).
- Read-your-own-write 100% at the returned position, with the overlay serving every pull issued before the replica catches up.
- Feed: zero gaps, zero per-subject order violations, lag p99 ≤ 250 ms, zero visible duplicate effects over 100 injected crashes (a control
  arm without keyed effects shows at least one duplicate).
- The four Q31c falsifiers pass (nested cuts in one frame, an abort gap, crash between append and resolution, resume at an abort gap).

## Boundaries
- Worktree branch `exp/P2Q-qlever-log-broker`. Files: a new `packages/qlever/src/broker/**` (host broker, log, overlay), the QLever
  adapter's read routing behind an option, tests, and `lab/experiments/EXP-P2Q-qlever-log-broker/**`. Stay out of packages/xtdb and
  packages/core/src/entity (other agents).
- Engines: develop against the shared `tx2-qlever-dev` resident with graph names unique to EXP-P2Q (never down or recreate it); measure on
  an exclusive slot (`engine.mjs up --lane qlever --slot s2`) when the pool admits it (EXP-X05 has priority for pool memory; poll
  `engine.mjs status`). Release what you start. Never ports 15442/17019; Docker only via DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock.
- The broker runs on the macOS host (node), writes its log under `runs/broker/EXP-P2Q/` (gitignored), never in /tmp.
- The host is loaded: judge relative A0 versus candidate on the same slot and window.

## Report
Commit hash; design note (frame format, positions, watermark, overlay eligibility, rebuild trigger); A0 versus candidate tables (ACK per size
band per delta level, RYOW, feed lag, gaps, duplicates, replay attempts, falsifiers); prediction verdicts; receipts; open questions.
