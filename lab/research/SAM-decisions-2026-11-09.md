# Sam's decisions, 2026-11-09 (verbatim, then what each means)

Sam, in chat, 2026-11-09, verbatim:

> Yes to everything you recommended. If you have to turn off my onboarded stack or anything, I'm not going to be running that, so that's
> fine to turn it off. You can use my whole Mac and close down anything heavy that's running here that's not needed. Don't turn off
> Claude or Codex, though.
>
> Otherwise, yes, I will let you know if I have to use my machine. Otherwise, I'm not using it. Use more of the Claude usage now instead
> of a lot of Codex. Switch to using Sonnet on high to write stuff instead of the Codex stuff. That's the switch to make.
>
> You can put those down in your protocol and continue. It's fine if you put it in a smaller thing as you need. If you need to run one at
> a time to get more space, you can do that too. As you do that, also tell me how much disk space would be good to get back, and I can try
> to find a way to reclaim that for you so you can test larger datasets.

## What "everything you recommended" approves (the recommendations as given to Sam the same day)

| Pending item | Approved as |
| --- | --- |
| Q99-S1, the NS rung | NS acceptance and calibration at the largest W0 rung each composition fits on one exclusive slot within the 50 GiB pool disk limit; year-one reported as a projection, never a pass; NS.P5's scoped release stays at 100k |
| Q94a, the GS rung | The same rule for the 20 golden scenarios |
| Q100-S1 (Q60's host half), quiet windows | Acceptance windows may pause Sam's default colima VM (his Onboarded stack) and other heavy host jobs, announced in STATE; Claude and Codex are never turned off. Sam: "You can use my whole Mac" |
| Q98j, lane X P3/P2 arms | XTDB behind the broker counts as lane X's candidate; the native arm is reported beside it |
| Q95-S, erasure S1-S4 | R38's recommendations: S1 option A, S2 accepted with R = 15 min, S3 option A, S4 option A. Counsel must confirm GDPR Article 17 before Triplex calls crypto-shredding compliant |
| Q89g, public position token | An opaque position token added to the public TemporalBasis (R33) |
| Q78e, lane D tenancy | Tiered tenant isolation (R32); dev storage stays diagnostic only (Q88a) |
| Q86g, VM hardening | H1 (narrow the triplex2 VM's mounts from writable $HOME) and H2 (block outbound traffic from tx2 containers to Mac services, including ports 15442 and 17019) |
| Pre-commit hook | Install a git pre-commit hook that runs build_contract.py --verify on commits that touch lab/acceptance |

Not decided (no recommendation was made): whether P1 needs a p99.9 or max read bar so reads cannot bunch within 100 ms.

## Operating changes

1. **Builders are Claude Sonnet 5.5 at high effort** (Agent tool), replacing Codex medium. Reviewers stay Codex gpt-6.1-sol at high; planners
   and researchers stay Opus 5.5 at high. Nothing above high. Codex builder sessions already running finish their current task.
2. **The whole Mac is available:** heavy processes that are not needed may be stopped, never Claude or Codex. Sam will say when he needs
   the machine.
3. **Smaller or sequential runs are fine** when disk or memory requires it.
4. **Sam asks how much disk to reclaim** so larger datasets can be tested; the answer goes in chat and STATE.

## 2026-11-09, later: bpftrace image download

Sam, verbatim, answering "May I download the pinned Ubuntu bpftrace image (about 90 MB) into the triplex2 VM?":

> Yes, download it

Scope of the approval: one local image built inside the triplex2 VM from ubuntu:24.04 (arm64 digest
19cad59657037cffa0ac9a48107019b768900ff1071140965827513ac866bd5e) plus the R49-pinned Ubuntu archive packages (bpftrace
0.20.2-1ubuntu4.3, LLVM 18 1:18.1.3-1ubuntu1, libbpfcc 0.29.1+ds-1ubuntu7 and their dependencies), about 90 MB. Nothing on the Mac host.

## 2026-11-09, evening: Q107-S and the triplex2 VM size

Sam, verbatim:

> I want to stay with C for everything. If C is not working, then it doesn't work, and we'll figure out a TODO, but we need to keep way 2 to be doable today. For the VM size, let's go with your recommended one, and I can go find some disk space for you. I got to go find it.

| Item | Decision | What the lab does |
|---|---|---|
| Q107-S | **Option C on every lane.** `:_tx/change` and `:_tx/changed-entity` stay stored and queryable as ordinary triples; raw queries (Datalog, match, native XTQL/SPARQL/Datomic) over them keep working as documented today ("way 2"). | No lane stops storing them. The broker-internal one-record journal (HS01 round 3, R47 option B-store) stays OFF by default and is never used for an acceptance claim; its measurements are informational. Where a priority misses because of the journal's cost, the miss is reported as a miss with a TODO, not worked around by dropping way 2. |
| VM size | **8 CPU, 20 GiB RAM, 100 GiB disk ceiling** (the orchestrator's recommendation). | Resize triplex2 after the OBS01 live witness window (round 15) finishes and before calibration. |
| Host disk | Sam is finding disk space. | Keep archiving settled evidence; P5 at 100k waits for the reclaimed space. |

## 2026-11-09, afternoon: lanes and slots

Sam, verbatim:

> Can you continue using the broker for QLever? That makes sense but I want to go back to XTDB as native and iterate on it there for the built-in commit path. We need to try to get that faster, or if it's going to be slightly longer, seeing as 33 ms versus a 10 ms bar, that's barely anything.
>
> Can you just help keep going on that? The broker can be the path for QLever, which is great because then we'll get the broker for free if we want to bring it over to XTDB in the future.
>
> For Datomic, we can move to Postgres. That makes sense. We can get rid of QLever native. I think I like exactly what you're saying for the slots. I think you could even put a second slot on XTDB native as well, so there are six going. I think it locked up because I was doing something else on the computer, so you can go back to using six.
>
> The broker on QLever, Datomic, and XTDB native each get two slots, and I agree with what you're saying you're going to do with them.

| Decision | What the lab does |
|---|---|
| Lane Q = QLever behind the broker | The broker (log of record, feed, H1 reads, activation) stays lane Q's path; P4N and P5N continue there. QLever-native write/feed work is dropped. |
| Lane X = XTDB native | Iterate on XTDB's built-in commit path (fresh commit p50 33 ms vs 10 ms bar), its native feed lag (2.9 s vs 250 ms) and native P4/P5. Aim to meet the bars; if a number lands slightly above a bar, report it plainly with the gap so Sam can judge. The broker remains available to bring to lane X later. |
| Lane D = Datomic on Postgres storage | Move off dev storage (can lose acknowledged commits, R32) to Postgres storage, then the first lane D P1-P5 measurements. |
| Capacity | Six agents at a time: two per lane (broker/Q, Datomic, XTDB native). The lock-up was attributed to other activity on the Mac. |

## 2026-11-09, night: fast-forward lanes X and D, pause lane Q, Codex medium for all background work

Sam, verbatim (the `/goal` he set after upgrading the CLI and switching the orchestrator to Fable 5.2):

> Okay I want you to think: you're a new model. I was using Opus but now you're like Fable 5.2. I want you to think about what we're trying to get done with the lanes that we're doing.
>
> Before we go and build anything next, before we do our next round of experiments, I would like you to do some thought experiments and think about what we're doing wrong already to try to hit the priorities that we've listed.
>
> Specifically for Datomic and XTDB I think we can get rid of the Q lever lane for now or just pause our work on it. Focus on XTDB, the native one, and Datomic. What are we doing wrong? Can you see a way to jump to what we need, approaching it by thinking about super high performance and super high levels of efficiency to get to all of our performance goals as fast as possible? What did we miss and what's the way to actually do it?
>
> Can you propose using sauna agents on medium effort to run spikes for you if you need, or Codex 6.1 Sol agents? On medium, actually, that's what we actually use to build stuff. Don't use Sonnet or Opus for your background agents. Just use Codex 6.1 Sol on medium to do what you're saying.
>
> Again they're much less intelligent than you are so you have to make sure that you really set the commander's intent, the constraints, and the objectives for what you want (so that they really do the thing that you're asking them to do). You should be extremely clever and have a lot of foresight and I want you to use that to get XTDB native and the kind of Datomic lane as fast-forwarded as possible.
>
> We don't have to do small iterations. If you can see how to obviously jump ahead on stuff, we aren't forced to stick to the workflow of the protocol. You should make that more flexible I guess. That says: if you can see a way to jump ahead or not have to check something (because you're sure that it's going to work or that you found a better path based on the evidence), then you should go and do that.
>
> Yeah pick back up where you were but do what I'm saying and really think about how you can jump ahead.  Your goal is complete when we get to all the priorities done for either Datomic or XTDB. If I said IDV I meant XTDB.

| Decision | What the lab does |
|---|---|
| Lane Q paused | No new work on the broker or QLever. P4N round 2 (`f090925b`) and P5N round 2 (`c3a0be40`) stay checkpointed with their `ROUND2-STATUS.md` files. G03 round 7d review, contract 0.4.1 and the W4 window wait. |
| Focus: lane D (Datomic) and lane X (native XTDB) | Done means every one of P1 to P5 meets its bar on one of the two. |
| Background agents | Codex `gpt-6.1-sol` at medium only (`agent.mjs --role builder`). No Sonnet or Opus subagents. |
| Protocol | Fast-forward mode: `lab/PROTOCOL.md` section 0b. |
| Diagnosis and jump design | `lab/research/R51-fast-forward-diagnosis.md`. |

## 2026-11-10 about 12:00 UTC: Kafka image and VM size (verbatim)

> You can do the kafka image download, don't add more cores to vm for now

Orchestrator reading: one Kafka image may be pulled into the triplex2 VM to test XTDB read replicas (lane X). The VM stays at
8 CPUs, 20 GiB, 100 GiB. No other download is covered.
