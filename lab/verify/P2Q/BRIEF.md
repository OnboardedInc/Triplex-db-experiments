# V-P2Q independent verification of exp/P2Q-qlever-log-broker (head d7c6086)

**North star:** P2 (small atomic idempotent per-subject commits, low latency) and P3 (ordered resumable change feed) for the composition
where QLever serves reads. EXP-P2Q claims the QLever lane's ACK no longer depends on QLever's delta (candidate 4-8 ms p50 against A0's
0.96-7.4 s on the same resident). **Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md v2 sections 1.1, 2.1, 4.1. Rulings Q31c
(positions), Q31d (eligibility, 10 ms wait then fallback), Q31e (ACK after source publication; read-your-own-write by routing), Q38f,
Q47a-c (claims are admitted only on opened and recomputed evidence), and Q50 (held in lab/reviews/plan-v2-round6.responses.md).

## Commander's intent
Decide PROMOTE-AS-CANDIDATE, FIX-FIRST or REJECT for merging the broker composition into main behind its default-off option. PROMOTE
means three things hold: (1) a durable ACK is never lost and never given before the frame is fsynced and the watermark updated; (2) no read
at basis B ever returns an answer that is missing a frame at or below B, or that contains a frame above B, whichever path served it; (3)
with the option off, the A0 adapter behaves exactly as on main. Speed claims come second: a fast commit path that can serve a stale read
as current is a REJECT, not a FIX-FIRST.

## What to check (write tests of your own; do not trust the branch's tests to be the oracle)
1. **Durability and framing.** Read packages/qlever/src/broker/{frame,log,crc32c,position}.ts. Inject torn tails at every byte offset of
   the last frame, a flipped bit in a middle frame, a crash between append and fsync, and between fsync and watermark. Expected: torn
   tail truncated (backup kept), mid-log corruption refused, nothing ACKed that a restart cannot replay, burned LSN reported as an abort gap.
2. **ACK ordering.** Show from the code and from a trace that the ACK follows fsync and the watermark update (Q31e), group commit
   included (up to 64 commands, no timer). A resend of a lost ACK must return the original receipt; a CAS conflict must be typed.
3. **Read routing and eligibility (the main risk).** Build adversarial schedules: replica marker behind B with a complete overlay; overlay
   missing a frame inside (marker, B]; replica unreachable; replica ahead of B; a frame published to QLever while a merge is in flight;
   epoch change. For each, the answer must equal the answer from the broker's own log replayed to B, or the read must fail typed. A
   silently stale or over-current answer is a critical finding. Confirm what native SPARQL and Datalog reads do beyond the watermark today
   (the report says a 2 s wait then an error): any wrong answer there is critical; an untyped error is a finding against Q50b.
4. **Feed.** Re-run the keyed-effects crash test (100 injected crashes) and the unkeyed control; check the checkpoint protocol (tmp,
   fsync, rename), the read bound at the durable watermark, gap recovery, and that replay attempts are counted apart from visible effects.
5. **Q31c falsifiers.** Re-run the four (nested cuts in one frame, abort gap, crash between append and resolution, resume at the gap)
   and add one of your own that a wrong allocator would fail.
6. **A0 unchanged with the option off.** Diff packages/qlever/src/index.ts and any adapter code against main; run the QLever package's
   existing tests with the option off.
7. **Recompute the numbers.** From the raw samples under lab/experiments/EXP-P2Q-qlever-log-broker/receipts/ recompute every p50/p99,
   count and RYOW figure in the report (the orchestrator's copy is lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md on main). Name any
   number you cannot reproduce. Exclude P2Q-trace-C-20261107T221344Z-cad02c (contaminated) and say whether anything else should be.
8. **Write amplification.** Count triples per 10-fact command for A0 and the candidate from the code or a short run (report: about 750 for
   A0 against R17's 94); say where they come from.

## Boundaries
- Worktree branch `verify/P2Q` created from `exp/P2Q-qlever-log-broker` (d7c6086). Write only `lab/verify/P2Q/**` (tests, scripts, a
  findings file). No edits to packages/, lab/acceptance, oracles or the experiment directory. Commit on `verify/P2Q` only.
- Engines: most checks run offline (the broker's offline mode needs no QLever). For checks 3 and 6 you may use the shared `tx2-qlever-dev`
  resident on :7070 through `lab/bin/heavy.mjs`, short runs only, and you must not recreate, stop or restart it. No exclusive slots.
  Docker only with DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock through lab/bin/engine.mjs. Never touch
  /Users/sam/projects/triplex-db or ports 15442 and 17019.
- pnpm only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set`. Python with `python3 -I`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Subagents, if any: Opus only.

## Report (return as text; the orchestrator saves it as lab/verify/P2Q/VERIFY.md)
Verdict and the one-line reason; a table of checks 1-8 (PASS, FINDING or NOT RUN, with the evidence path); findings ranked critical,
major, minor, each with a reproducing command and a proposed fix; the recomputed numbers next to the reported ones.
