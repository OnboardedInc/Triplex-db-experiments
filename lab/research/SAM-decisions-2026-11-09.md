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

## 2026-11-10 13:50 UTC: standing permission to download, with a disk budget (verbatim)

> Yeah you can download anything from here on out. You can take up to half of my remaining disk space. You have standing permission to download anything up to that amount as you need. Please go do that and that's for any lane not just the lanes that you wanted. Not just for the XTDB lane but for any lanes. You can use up to half of my remaining space on my disk as of right now.

Orchestrator reading:

1. Downloads no longer need a per-item approval, for any lane.
2. **Budget: 19.0 GiB in total.** The Mac's data volume had 39,917,840 KiB free (38.07 GiB) at 2026-11-10 13:51 UTC
   (`df -k /System/Volumes/Data`); half is 19.03 GiB. Every download is logged with its size in
   `~/Claude/Projects/triplex-db-2/evidence/ORCH-downloads/` and summed in `lab/DOWNLOADS.md`.
3. Unchanged: no email, name or other personal detail goes to any website or registry (pulls are anonymous); nothing under
   `/Users/sam/projects/triplex-db`; the VM stays at 8 CPUs.
4. The Mac has only 38 GiB free in total, so data the lab generates (seed volumes inside the VM's disk image) must also stay
   small. That is not part of the download budget but it is the same disk.

## 2026-11-10 about 15:30 UTC: storage size per subject (verbatim)

> "- Disk is a hard limit. A 1,000-subject seed is 654 MB, so 100k would be about 65 GB, and your Mac has 38 GiB free." As a question is 100k subjects being 65 GB not scalable? How does that work? Compared to other triple stores or how we're storing it, is there some way we could work on that? That seems way too big. Can we brainstorm ways to think about that or can you do some of your own research to figure out ways to attack that problem? I think that might need to become another priority: disk size per subject or something, with some way to measure that.

Orchestrator reading: storage footprint becomes a measured quantity now (spike DX-S4, script `s4/footprint.sh`). Whether it is a
ranked sixth priority, and its bar, is Sam's to confirm; the orchestrator proposes a definition and a provisional bar and treats
it as a guard metric until he does. `lab/NORTH-STAR.md` is not edited without his word.

## 2026-11-10 about 17:35 UTC: shrink the VM's memory (verbatim)

> Yeah I guess we can shrink the VM. As long as it's not going to hurt your testing and it actually improves the testing, then that's fine. I think it's okay as long as it's not going to mess with us too much.

Orchestrator reading and choice: **20 GiB to 16 GiB, not 14.** The engine's containers peak at roughly 11.5 to 13.5 GiB of
resident memory (transactor heap 3 GiB, two gateways with 2 GiB heaps, Postgres, the load generator at 2 to 4 GiB). At 14 GiB
the guest would have almost no page cache left at peak, which would hurt Postgres and so the testing; 16 GiB keeps 2.5 to 4 GiB
of cache. The VM process held all 20 GiB on the host, so this returns 4 GiB to macOS. CPUs stay at 8, disk at 100 GiB. Done with
the measurement lock held so no agent's containers were running.

## 2026-11-10 about 20:15 UTC: no QLever work; storage size is a guard metric (verbatim, pasted by Sam)

> Don't do anything with Qlever. That doesn't need to be measured. We're just working on XTDB and the Atomic. I think this should be a sixth priority. That's the goal but we can do it later and it should be something that we optimize for last. Everything else should be a higher priority than it.
>
> Maybe then you don't put it as a sixth priority but I think it could be a sixth-priority-something. You shouldn't sacrifice any of the other metrics for size. We just need to keep the size the same or go down while the other ones get better. Maybe that should be a guard metric.
>
> Sounds good though. It's good to know. It seems like it's not important to keep going smaller because it says that a maintained Atomic is about the same level as a bare Postgres table, which is great. Sounds good to me for now.

Orchestrator reading ("the Atomic" is Datomic):

1. **No QLever work of any kind, including measurement.** Only lane D (Datomic) and lane X (XTDB).
2. **Storage footprint is a guard metric, ranked below P1 to P5.** Rule: it must stay the same or go down while the five
   priorities improve; no priority is ever traded for size; it is optimised last. It is not a sixth ranked priority and
   `lab/NORTH-STAR.md` is unchanged. Definition and today's value are in `lab/TARGETS.md`, "Guard metric: storage footprint".
3. No further size reduction work for now: maintained Datomic is about level with a bare Postgres table.

## 2026-11-10 about 20:40 UTC: keep going on Datomic; skip the 2,000 rung; a Linux machine (verbatim, pasted by Sam)

> Okay yeah, then let's keep going on Datomic. It looks like we are really close. [...] We basically are just missing on P5. P2 and P1 were really close, right? We're very close. What do you think is missing? What are the most risky things to check next? I can get you back the machine in a little bit but just answer me that first.

> Also I kind of wanted to maybe skip to 100,000 or, I guess, skip to the 10,000 per second and skip the 2,000 per second. Then IDV would be the best thing.
>
> I have a Linux machine we can maybe use later to test this. Or is there a cheap way to get a Linux machine in the cloud that I can get via an API and a credit card to run these tests?
>
> I think I'd rather skip beyond 2,000 to go straight to 10 and see how we can fix that. If I could get you a Linux machine in the cloud, like an ideal one, what do you think I should do? How fast can we get it if I have a credit card?

Orchestrator reading: (1) lane D continues; (2) **verdict runs go straight to the 10,000-subject rung; the 2,000-subject rung is
no longer a step** (agents may still use small scopes for alternating-arm diagnostics); (3) "IDV" is XTDB (Sam, 2026-11-09), read
here as XTDB being next after Datomic; (4) Sam is willing to provide a Linux machine, his own or rented; the orchestrator's
recommendation is in the chat reply of the same time and nothing is rented without him doing it.

## 2026-11-10 about 21:40 UTC: end the native mode; be more ambitious (verbatim)

> No no, let's not do the no-VM mode. I don't care about that. You can end that. I just want to keep experimenting. If you're not doing giant jumps towards getting this to work on Datomic, you need to figure out how to be more ambitious to get us there. No small iterations unless you're super confident in them.
> Or you're trying to do measuring to figure out new experiments. That's fine too.

Orchestrator reading: DX-N1 stopped, its branch `exp/DX-N1-native` is not merged, its downloaded tools and run directories under
`~/Claude/Projects/triplex-db-2/native/` are removed, no process of its is running. Work is either a large design jump for lane D
or a measurement that decides the next jump. Small iterations only where the outcome is near certain.

## 2026-11-10 about 22:25 UTC: activation design, concurrent ontology edits, publication size (verbatim)

> But in our world I've seen that multiple people are making changes to the ontology and they have different previews going at once. It means that if it takes minutes, then when someone else makes a change in those same minutes, things that are

(The message ended there. The orchestrator answered that stored previews go stale when the ontology changes and proposed a
feed-maintained local copy of current facts in the runtime, so that any release is evaluated from nothing quickly.)

> Yeah I don't think it's about publishing 100,000 results at once because we're not going to be publishing that much probably. The publishes won't be huge chunks. I think that's understandable. If you're adding a giant amount of things at once, that could be tough. Yeah this sounds great. You got exactly what I was going to say.

Orchestrator reading:

1. **P5 design direction, confirmed by Sam: the runtime keeps a compact local copy of every subject's current facts, kept
   current by the change feed, and evaluates a release from that copy.** Several candidate releases can be evaluated at once.
   Stored previews of outputs are not the mechanism.
2. **Publication is not required to push 100,000 results in one go.** The activation bar is about re-evaluating up to 100,000
   subjects without hurting live traffic; what gets published is what changed, in ordinary-sized commits, and a very large
   publish being slower is acceptable. `lab/TARGETS.md` P5 item 5 ("wall time includes evaluation and publication") is read as:
   evaluation of all subjects plus publication of the changed outputs.

## 2026-11-11 about 15:40 UTC: keep `nohlt` on; build the 100,000-subject seed as fast as possible; the Mac is free

Sam, verbatim (dictated; "no HLT" is `nohlt`, "the other way penalty" is the wake penalty, "Build the C" is read as "build
the seed"):

> Yeah I'm good with the no HLT thing being on. That works for me. Removing the other way penalty works for me.
>
> What's the durable commit on this test bed? Is it not power-loss durable? It will not carry over. I don't get what you're actually saying there. I don't think we should switch off the no HLT. You can keep that on to keep testing. That's fine.
>
> Build the C as fast as you can so we can start to do it. That would be great. I'm not using this computer at all so you just need to get it all done.

Orchestrator's reading:
1. `nohlt` stays on as the standing test condition. The queued switch-off was cancelled before it ran.
2. Sam is not using this Mac, so the VM's eight busy cores and long holds are acceptable, day or night.
3. The 100,000-subject seed is the top job; run it as soon as the corrected procedure is proven.

## 2026-11-12 about 14:50 UTC: pause the work gracefully; remove XTDB experiment data and downloadable Docker images

Sam, verbatim:

> I actually want you to pause. Don't stop anything that's already kind of working but I want you to pause work gracefully. I need to use my Claude usage and my Codex usage for something else this week. And yeah get rid of the XTDB experiment data and the downloadable Docker images as well. That looks good to me.

Orchestrator's reading:
1. No new agents (Claude or Codex) and no new orchestration from now on. What is already running may finish.
2. Remove what was proposed just before: the two finished XTDB experiment data volumes (`tx2-xtdb-s1-data`, `tx2-xtdb-s2-data`)
   and the downloadable images the Datomic lane does not use (Kafka, MinIO, SeaweedFS, the tracing image). Not the XTDB
   images, not `tx2-xtdb-dev-data`, not any seed, nothing of QLever.
3. Leave the state written down so the work can resume from files.

## 2026-11-12 about 15:10 UTC: on resume keep iterating at 10,000 subjects; focus on P2 (and P4); 100,000 only as a reading

Sam, verbatim:

> In the future let's keep iterating on 10,000 and get that to pass. I think that you're correct that we should do 10,000 first actually but we should just get a read on current stuff on the 100,000 subject 1. If that doesn't require a lot of usage to run the 100,000 subject result, then you should try that just to measure the reading. I think that'd be fine.
>
> When we pick back up we can keep iterating. I really only care about getting the all-commit P99 down or I guess the P2 stuff down. Sounds good to me, as well as, I guess, P4 unless it's not important. Do all that and then confirm back to me what you're going to do and what you understand about the current state. And make sure everything is committed and pushed, etc., for where we are now so we don't lose any data.

Orchestrator's reading:
1. The 10,000-subject rung stays the gate; iterate there until every bar passes. 100,000 subjects is measured once now as a
   reading (the unattended `k100` pair), not as a gate.
2. On resume the work is P2 (all-commit p99 first, then burst p50, commit p50 at 256 readers, the queue) and the P4 history
   flatness miss if it is real. P1 and P3 passed in q8 and are to be kept, not reworked.
3. Everything committed; pushed where a remote exists. This repository has no git remote configured, so a push needs Sam
   to name one; a bundle of every branch is written to `~/Claude/Projects/triplex-db-2/backups/` meanwhile.

## 2026-11-12 about 17:40 UTC: on resume, tracing and measurement come first and stay in the code

Context: Sam asked whether TypeScript is the bottleneck and whether to rewrite in Rust. The orchestrator answered that the
evidence does not point at TypeScript and that the stalls are not located yet. Sam then wrote, verbatim:

> Okay I would like you to, very first thing, add all of the analytics, all of the tracing and stuff. That's the first thing you do: add tons of tracing, tons of logging, tons of measurement and observability stuff everywhere, and keep that in the code. Don't get rid of it so that when you make a run it's super easy to see a picture of the trace of what took everything so long. That's super important for us.
>
> If there isn't a lot of space for those, you should store them somewhere else. You can store them in my drive after you've used a few, if you need to. I don't want to have to keep trying to locate stuff.
>
> Really set up the tracing and the debugger essentially first so that we can trace all this stuff, using whatever best practice would be for this. Don't do that yet but that should be the first thing you do and then you can continue along with what you would say.

Orchestrator's reading:
1. Still paused. Nothing is built now ("Don't do that yet").
2. On resume the first piece of work is tracing, logging and measurement across every layer of a commit and a read (the
   TypeScript client and replica, both gateways, the transactor, Postgres, the VM and the host). It comes before the P2
   work and the P2 work then uses it.
3. The instrumentation is permanent. It is not removed after a diagnosis. Every run produces a picture of where the time
   went without extra steps.
4. Trace files live in one known place. When disk space runs short, older raw traces move to Sam's drive rather than being
   deleted. Open question for Sam at resume: whether "my drive" means Google Drive or a disk attached to this Mac.
5. After the tracing is in place, continue with the order already agreed (P2 at 10,000 subjects, then P4 history flatness).

## 2026-11-12 about 17:45 UTC: stay in TypeScript; the tracing must measure the TypeScript share

Sam, verbatim:

> And I agree. Let's not do anything inside of Rust. Let's just stay in TypeScript. We don't have to specifically look for a TypeScript problem but I want to be able to measure that so you should include that in your visibility in the future. Include that in the tooling that you're going to add.

Orchestrator's reading:
1. No Rust rewrite. The Triplex layer stays in TypeScript.
2. No separate hunt for a TypeScript problem.
3. The tracing built first on resume must report, for every commit and read, how much of the time was spent in TypeScript
   (the Node process: Triplex code, event-loop waits, garbage collection) against the gateways, the transactor, Postgres
   and the network, so the TypeScript share is a number in every run.

## 2026-11-12 about 18:05 UTC: resume; build only with Codex sol agents at max effort; save Claude usage

Sam, verbatim:

> Can you resume, but only use codex sol agents on max effort to build things? you should not use claude for things I want to save your usage

Orchestrator's reading:
1. The pause is over. The order of work is the one recorded above: tracing and measurement first, kept in the code and
   reporting the TypeScript share; then P2 at 10,000 subjects; then P4 history flatness.
2. Every agent is Codex `gpt-6.1-sol` at reasoning effort `max` (`lab/bin/agent.mjs` now passes `max` for builders and
   reviewers). No Claude agent of any model is launched.
3. The orchestrator (Claude) keeps its own usage low: it writes briefs, launches agents, waits for them to exit without
   polling, reads their short reports and records results. It does not read large files or run analyses an agent can run.

## 2026-11-13 about 16:20 UTC: keep a file of the hardest problems; on Sunday run one Fable 5.2 agent at extra-high effort to write a deep menu of radical ideas

Sam, verbatim:

> Can you keep track of some of the hardest problems that you would want to take a look at? Even though you're having Codex look at them, if you could just keep tracking some of the hardest things that are required, like creative technical solutions potentially and stuff. Keep those in a file somewhere.
>
> I think the usage for this account resets on Sunday sometime. I want you to schedule a trigger then to run when I get back to full usage. I want you to run a Fable 5.2 agent on extra high, looking for radical ways to leapfrog ahead to the results that we need to pass our bars. Just generate a bunch of candidate ideas.
>
> It doesn't have to build them but it should just create a bunch of things that we could do by carefully reading the code, carefully thinking through it, looking at all of our research, and thinking about it. Really have it come up with a bunch of possibilities that then you can pick from as a menu afterward and have Codex on Max go explore after. Does that make sense?
>
> And actually since you're just having Fable create the menu (and I think it'd be a deep menu with details, evidence, research, and whatever), you can actually run that Fable agent on extra high and tell it to be thorough.

Orchestrator's reading:
1. `lab/HARD-PROBLEMS.md` is the file. The orchestrator updates it whenever an agent report changes the picture.
2. One Fable 5.2 agent at extra-high effort, read-only, thorough, writes a deep menu of candidate ideas with evidence. This
   is the one exception to "no Claude agents"; building stays with Codex `gpt-6.1-sol` at `max`.
3. Scheduled for Sunday 2026-11-15 at 23:07 local time, late in the day because the exact reset hour is not known. Brief:
   `~/Claude/Projects/triplex-db-2/agents/prompts/LEAPFROG-fable.md`. Output:
   `~/Claude/Projects/triplex-db-2/research/2026-11-15-leapfrog/MENU.md` and `SUMMARY.md`.
4. Afterwards the orchestrator picks from the menu and hands the picks to Codex at max effort.

## 2026-11-13 about 16:45 UTC: no XTDB; reverse engineer the transactor

Sam, verbatim, after reading the list in `lab/HARD-PROBLEMS.md`:

> I don't care about XTDB. Don't go back to that. That's not one. Don't do that one.
>
> For H6 can we reverse engineer it to understand what's happening? That'd be the best way to do it. If we can reverse engineer how it works from the code, then we should be able to better reason about how to work with it, like how to better write stuff that will work well on the transactor.
>
> Otherwise this looks good.

He also asked for the open design decisions to be explained with examples (answered in chat the same day).

Orchestrator's reading:
1. The XTDB lane is closed. The goal is every priority met on Datomic. No XTDB work, comparison or reading.
2. Reverse engineer the Datomic transactor and peer library from the shipped binaries, to learn how a transaction is
   processed and written to storage, and from that how Triplex should write to it. First step of that work: read the
   licence that ships with the distribution and confirm it permits this; keep decompiled code out of the public repository
   and commit only our own notes.
3. The rest of the hard-problems list stands.

## 2026-11-13 about 17:00 UTC: the reverse engineering is done by an Opus agent at extra-high effort, using the "reverse-engineer anything" skill

Sam, verbatim:

> have an opus agent on xhigh do the reverse engineering, have it use the "reverse-engineer anything" skill that is on the internet, pull that and use it

Orchestrator's reading:
1. DX-RE1 (the transactor study) runs as one Claude Opus agent at extra-high effort, not as a Codex agent. This is an
   exception for this job; building stays with Codex `gpt-6.1-sol` at `max`.
2. The skill is `reverse-engineer-anything` from `github.com/morluto/rea` (MIT), cloned at `cdc4541e` outside the
   repository and logged in `lab/DOWNLOADS.md`. The orchestrator read it first. It is written for native binaries,
   Android, JavaScript and .NET targets; it has no direct route for JVM jars of compiled Clojure, so the agent uses its
   evidence method and its archive tools where they apply and a JVM decompiler for the classes.

## 2026-11-13 about 18:10 UTC: Sam answers the five open design decisions

The orchestrator had listed five decisions with a recommendation each (record-time backdating, who assigns record time,
the split-read rule, the CPU split, acknowledging before the engine applies). Sam, verbatim:

> Open design decisions:
> 1. Can we have it be so that we maintain both paths and at query time and can tell which path we need to go? I don't think we can do strict, I think it needs to be bitemporal.
> 2. Yes let server assign it.
> 3. Explain this more, so I understand the tradeoffs, show examples.
> 4. Yes to your recommendation
> 5. Not yet, this seems risky, agree with your recs

Orchestrator's reading:
1. **Record time.** Not strict everywhere. The store stays bitemporal, both read paths (local copy and engine) are kept,
   and each query is routed to the path that can answer it exactly. Open point put back to Sam the same day: strict record
   clocks do not remove valid-time backdating, so whether backdated *record* time is needed in live scopes is still to be
   confirmed; until then the existing rule stands (a per-scope `strictRecordClocks` flag; time-pinned reads are answered
   locally only in strict scopes and by the engine elsewhere).
2. **Record time is assigned by the server.** Decided. Needs the `packages/core` contract change; queued for a builder.
3. **Split-read rule.** Not decided; Sam asked for a fuller explanation with examples.
4. **CPU split.** Decided: judge on the whole 8-CPU machine (P4 becomes at least 4,400 pulls per second in total, which is
   1,100 times the four engine cores the bar assumed) and let the split between engine and runtime be tuned freely.
5. **Acknowledging before the engine has applied a commit.** Not now; Sam agrees it is risky. Revisit only with numbers.

## 2026-11-15 about 14:00 UTC: audit disk use across all Triplex work; archive to Google Drive; focus Datomic, then maybe XTDB

Sam, verbatim:

> Also across all of the Triplex, like the Triplex-DB and Triplex-DB-2, etc., I feel like we're taking up a ton, ton, ton, ton of space. Can you have a background agent go and look at all that stuff and figure out what we don't need anymore or what we could zip up and put in my Google Drive folders?
>
> I really only want to focus on Datomic right now and then maybe XTDB. The rest, I feel like, as long as we have the code, place the code as is in GitHub. Anything else that could be useful, we should just zip and store in Drive and get off the disk.
>
> Since you know the most about all of it, can you just have a background agent be prompted to go find that, audit it, and help with a plan to do that?

Orchestrator's reading:
1. One background agent (Codex `gpt-6.1-sol` at `max`, id ORCH-DISK1) audits every place the Triplex efforts use disk,
   including `/Users/sam/projects/triplex-db`, read-only, and writes an inventory and a plan under
   `~/Claude/Projects/triplex-db-2/disk-audit-2026-11-15/`. It changes nothing; the plan is carried out after Sam has seen it.
2. Priorities for classifying: Datomic now, XTDB maybe later (this softens the 2026-11-13 "don't go back to that": XTDB
   data is archived, not thrown away, and no XTDB work is started); other lanes keep only their code, on GitHub.
3. "My drive" means Google Drive. No Drive folder is mounted on this Mac today; the plan says how to get archives there.

## 2026-11-16 about 13:30 UTC: no keep-warm; find why the commit path goes cold; yes to the clock boundary, 500-commit bars and small history-growth commits

The orchestrator had asked four things: (1) a commit ends when the receipt reaches the caller, 0.4 ms before the test
stops its clock; (2) bars computed over at least 500 commits; (3) the store may keep its commit path warm with requests
that write nothing; (4) the test's history-growth step writes in small commits. Sam, verbatim:

> I don't want to do number 3. As you stated, to force it to keep warm, I'd rather deep dive into why it's not warm. Could you have a Fable agent, like a background agent on Mac's effort, go and try to figure out why that's happening so that we can fix it?
>
> The drive is on stream files but otherwise, I agree with 1 through 4. Do we have other ideas, though, to keep going? What would be the next stuff to go and understand? Before all of that what's the current status of our performance and scalability and all those goals against what we've currently been able to do? How far are we from those things?

Orchestrator's reading:
1. **No keep-warm mechanism.** Find the cause of the cold path and fix the cause. One Fable 5.2 agent at maximum effort
   ("Mac's effort" is dictation for max effort) investigates in the background.
2. **Decided yes:** the verdict's clock stops at the acknowledgement handed to the caller; bars are computed over at least
   500 commits; history growth is written in small commits. ("I agree with 1 through 4" is read as agreement with the
   list apart from number 3, which he declined in the sentence before.)
3. Google Drive for desktop is on Stream files.
4. The disk plan's go-ahead (steps 0 to 5, the 100,000-subject seed, the `default` VM) is still not given; asked again.

## 2026-11-16 about 14:30 UTC: Opus analysts on the other open questions while the cold-path investigation runs; is it time for 100,000 subjects

Sam, verbatim:

> How much disk space do we need? I think I got rid of enough stuff that you could run now. Can you check?
>
> For the other things that you want to analyze while the Fable agent runs, can you have other Opus agents on High Go look at those other things that you want to understand? Don't have them test in big amounts yet because of the Fable run but it is interesting. Unless Fable's doing giant runs, I guess you can wait for it to be done and investigate some of that stuff.
>
> What more do we need to do and what more can I help you to do to test at this size and get ready to test at the next size? Do we have to do more at this size or do you think it's time to actually go up to the 100,000-subject lot?

Orchestrator's reading:
1. Disk checked: 14.9 GiB free, below the 15 GiB floor; what Sam removed did not raise free space on this volume.
2. Five Opus agents at high effort, read-only (no containers, builds, tests or benchmarks, because the cold-path runs are
   timed), each writing one report under `~/Claude/Projects/triplex-db-2/research/2026-11-16-next/`: per-fact commit cost,
   the writer's garbage collection, the plan for 100,000 subjects, the specification of the three verdict-rule decisions,
   and the steadiness of the test bench (virtual disk flushes, CPU cores, a verdict protocol).
3. The orchestrator's answer on size: finish the 10,000-subject work in two short steps (apply the verdict rules and
   confirm; fix the cold path if its cause is found) and start the 100,000-subject reading as soon as disk allows, without
   waiting for a perfect pass at 10,000.

## 2026-11-16 about 15:00 UTC: two short steps at 10,000 subjects, then 100,000, without waiting for a perfect pass

Sam, verbatim: "explain the 1-5 help things for me in much more detail ELIF. And I agree with your two short steps @ 10k and then going up, not waiting for perfect pass"

Decided: (1) apply the three verdict-rule decisions and confirm with two full runs; (2) fix the cold path if its cause is
found; then go to 100,000 subjects without waiting for every 10,000-subject bar to pass.

## 2026-11-16 about 18:00 UTC: disk plan approved; nightly window 7 pm to 7 am; durability option A; valid time only; a cloud machine is acceptable

The orchestrator had listed five ways Sam could help (the disk plan, quiet windows, the durability question, backdated
record time, a reading on another machine). Sam, verbatim:

> Regarding your earlier 5 questions a few messages ago:
> 1. For disk plan, I feel like you ahve much more space you are takign up if you look carefull at what you're doing. But yes you can zip things up and save them, but why do we need the old evidence in the first place? Isn't the results recorded? And you can just remove the older default VM completely, but zip up it and save it for now.
> 2. The mac is yours every night at 7pm. You can close all that stuff and have it until 7am the next day, when you should reopen those for me.
> 3. recommendation A is fine
> 4. Yes lets do your recommendation, I love that one.
> 5. Ok what is the easiest way to get that machine in the cloud for you? I can pay
> also is there anything else I need to answer now?

Orchestrator's reading:
1. **Disk plan: go.** Archive to Google Drive and remove locally. Old raw evidence is not needed on the disk because
   results are recorded in the committed reports; it is zipped and saved, not kept. The older `default` colima VM is
   archived to Drive and then removed completely.
2. **Standing nightly window:** every night from 19:00 to 07:00 local time the Mac is the project's. The orchestrator may
   close Chrome, Slack, Paste and similar apps at 19:00 and must reopen them at 07:00.
3. **Durability:** option A. The VM's best-effort disk sync is the accepted test condition; commits hit by a proven
   disk stall are reported on a separate line.
4. **Record time:** backdated valid time only in live scopes (strict record clocks there, fast local reads); a separate
   import scope type accepts backdated record time for migrations.
5. **Another machine:** Sam will pay for a cloud machine; the orchestrator proposes the easiest setup.

## 2026-11-17 about 23:40 UTC: Codex agents run on gpt-6.2-sol from now on

Sam, verbatim: "When you run the Codex agents from now on, make sure you use Codex 6.2 Sol instead of just 6.1. It's new!"

Done: `lab/bin/agent.mjs` passes `gpt-6.2-sol` (effort still `max` for both roles). A one-word test confirmed
codex-cli 0.169.0 accepts the model.

## 2026-11-18 06:42 local: Sam asks for progress the morning after the first night window

Sam, verbatim: "any other progress?"

Orchestrator's reading: a status question, no decision. Answered with the night's outcome (one arm of four completed)
and started the day's work without waiting, as agreed on 2026-11-17 ("I will start step 1 in the morning").

## 2026-11-18 about 07:15 local: Latitude.sh is connected, with a $100 budget

Sam, verbatim: "ok I connected to latitude and added $100 in credits, please go and run things there as needed, be
careful with the credits though, test things that really matter and teach you things and progress our goals"

Orchestrator's reading: standing permission to order and run Latitude.sh servers without asking each time, inside the
$100 of credit. This replaces my earlier condition of showing the price and waiting for a "go" before each order. I
still state the hourly price and the running total each time I report, delete every server when its run ends, and send
nothing personal to the machine (public repository clone only, the bench SSH key only).

## 2026-11-18 about 12:30 local: Sam's local dev stack

Sam, verbatim: "can you get my local running again?"

Orchestrator's reading: his local Onboarded development stack (the colima default profile, five containers) was
stopped. Started the VM and the five containers and checked each service answers. The nightly runner now stops that VM
at the window's start and restarts it with its containers at 06:58, and puts the docker context back as it found it.

## 2026-11-19 about 09:00 local: Codex Astra 6.2 for building; size a large real account

Sam asked for three things (verbatim text is kept in the private project folder under
`research/2026-11-19-sizing/ACCOUNT-SIZING.md`, because it names a customer and this repository is public):
1. "Can you start to use Codex, Codex Astra 6.2, on things when you build with it, as opposed to Sol? That would be good."
2. A full account of where the work stands.
3. To look at production data for a named large account and reason out how many entities and subjects that account
   would hold if the product were built on this store, "Because I just don't know how big it'll be, you should figure
   that out."

Orchestrator's reading: (1) the launcher now uses `gpt-6.2-astra` at max effort for new launches and resumes (checked
against the CLI); the agent already running on Sol finishes its job. (2) and (3) answered in chat; the sizing table
with customer names stays private. The sizing changes one working assumption: the largest single account is not near
1 million subjects but already above 4 million thin ones, and the deepest account has about 100,000 subjects with
about four times the facts per subject of the test's population.

## 2026-11-19 about 11:30 local: scale is the goal; keep the server working; four xhigh idea agents

Sam, verbatim (customer name replaced by "[the deepest account]"; this repository is public):
- On my plan to delete the bench server tonight: "Why do you need to delete it? Can you just pause it?"
- "And yes you sohuld do 1,2,3 and you can plan a second cloud session ASAP whenever, we need this to be at scale ASAP.
  How would we handle 10 [of the deepest account]? We're growing rapidly so that is the scale we need"
- "if you need more ideas on how to get to that scale, launch up to 4 astra 6.2 agents on XHIGH effort to brainstorm in
  repeated waves to do research and think about things in areas you want to optimize and then think of how we could
  build/test those experiments. Go for big swings, this is early project"

Orchestrator's reading and what I did:
1. Items 1 to 3 are approved: a test population with the deep account's shape, a read path where a never-touched
   person costs almost nothing, and the driver tail fix. DX-SCALE1 and DX-THIN1 launched (Codex gpt-6.2-astra, max);
   the driver comparison is running on the bench server.
2. The target is ten deep accounts on real hardware (1 million people at about 160 facts each) plus the wide thin
   accounts. Plans are judged against that.
3. The bench server is not deleted tonight. It stays while it has queued work and a watcher; it is deleted when the
   queue is empty. A powered-off bare-metal server is assumed to keep billing, so "pause" saves nothing.
4. Four idea agents (Codex gpt-6.2-astra, xhigh, new `thinker` role in the launcher): write path, read path and
   memory, tenancy and topology, activation and bulk movement. Three waves each; output in the private project folder
   under `research/2026-11-19-scale-ideas/`.
5. My own change, not asked for: no Mac night run tonight. Three nights produced no judged pair, the bench server gives
   cleaner numbers, and without the window the agents can work and watch the server through the night. Sam's apps stay
   open. The nightly permission stands and can be used again.

## 2026-11-19 about 13:50 local: one database or many; priorities 6 to 9 approved

Sam, verbatim: "Wait so we're going to have more than one Datomic database handling these things? Aren't atomic
databases supposed to be able to handle hundreds of millions of records or am I crazy? Yes to the other proposed
priorities. You should add all of those and let's work towards them."

Orchestrator's reading:
1. Priorities 6 to 9 are added to `lab/NORTH-STAR.md` (his approval quoted there), unranked among themselves, with
   provisional bars in `lab/TARGETS.md` section 1.2.
2. His question is a fair challenge to an assumption I inherited and never tested: one scope, and so one Datomic
   database, per account. A single Datomic database is built to hold far more than our whole fleet (the vendor's
   guidance is in the billions of datoms; recalled, not re-read today). One database per account buys independent
   commit queues, moves, deletion and failure per account, and costs fixed overhead per database that Datomic is not
   known to carry in the hundreds. The layout is now an open question to be measured, not a decision: one scope
   holding 1,000,000 deep subjects against ten scopes of 100,000, and one hundred small scopes against the same
   accounts pooled in one scope.

## 2026-11-19 about 14:00 local: Sam leans to one database; questions on routing, cross-account queries, the priority 9 bar, activation, and what a traditional database would give

Sam, verbatim:
- "Okay the gist is that I get that you said it's a mix. That makes sense. If it's a mix then you'd put some kind of
  request router in front of it, kind of like Nginx or something, and that would route it to the right place. Is that
  the way I should think about it?"
- "Although how would I query across two different accounts? How would that work if I wanted to do a query across all
  of our customers using the same triplex thing? Is there a way to do interwoven stuff on it or something or I don't
  know. I don't think we should be using multiple hard databases in one process. It feels like we should be figuring
  out how to do one. That's my guess."
- "For Priority 9's time bar what do you think? What do other production giant enterprise companies do for Priority
  9's time bar? When does activation happen? When would I need to be doing activation in the normal usage of stuff?"
- "Yeah and then based on that same kind of search for the high availability, high whatever, high performance,
  whatever, what are the benchmarks that people expect at the scale that we're talking about, right? If you're just
  using a traditional database or something, right, what would you be thinking about?"

Orchestrator's reading and actions:
1. **Lead design changes to one database holding many accounts** (his guess, stated as a guess; the measurement
   decides). One database per account becomes the comparison. DX-SCALE1's campaign is reordered: ten accounts inside
   one scope, one hundred small accounts pooled in one scope, then one scope of 1,000,000 deep subjects; each against
   the per-scope layout. "Many databases in one process" is not pursued as a design.
2. When one database is full the next step is a second large database with a router from account to database, not a
   database per account. Cross-account reads are native inside one database; across databases they are a
   fan-out-and-merge or a feed-fed read model.
3. Priority 9 provisional time bars, my recommendation pending his confirmation: writes resume within 60 s of losing
   the active transactor with no acknowledged write lost and pinned reads continuing throughout; a planned move pauses
   one account's writes for at most 30 s.

## 2026-11-19 about 15:40 local: a second $100 of credit, the last for a while

Sam, verbatim: "I added more credits. I added another 100 but that's going to be the last for a bit so make that worth
it."

Orchestrator's reading: the budget is $200 in total and there is no more after it for now. A third server was refused
by the provider (the team is capped at two bare-metal servers), so the plan is two servers kept continuously busy
through Saturday midday (about $132 in total) and about $68 held back for a follow-up run on what the results show.
Server hours are the scarce resource: every hour goes to a test that decides something for priorities 1 to 9 or for
the one-database question, and an idle server is deleted.

## 2026-11-19 about 16:00 local: priority 9 bars confirmed; activation across accounts may be sequential; writes are the focus

Sam, verbatim:
- "the targets for your bar for parity 9, by the way that you said, were provisional. Make those be marked as not
  provisional. I confirm them."
- "I think for a regular update across all accounts, they don't all need to update in the same 100 seconds. They can
  finish one after another."
- "It just seems like the rights are the problem, huh? Let's definitely focus on getting those fixed because it looks
  like activation is super important." (dictated; "rights" is "writes")
- He also asked how activation and Triplex work; answered in chat.

Orchestrator's reading: (1) priority 9's bars are fixed: no acknowledged write lost, writes resume within 60 s of
losing the active transactor, pinned reads continue throughout, a planned move pauses one account's writes at most
30 s. (2) Priority 5 is per account, accounts in sequence when a release goes everywhere. (3) The write path is the
focus: everything that turns many writes into few (page guards, the release selector, group commit, the import lane's
pacing, the one-lookup identity check) goes first on the servers, and activation gets its valid 100,000-subject
measurement before anything else that is not a write-path test.

## 2026-11-19 about 16:10 local: activation in under one second; is there a way without the mark

Sam, verbatim:
- "Wait if we don't do the mark at all, is that the expensive part? Is there some other way to prevent the leftover
  calculations or leftover things, or some other way to do it besides the mark, since this is the hard part? He said
  that that's the expensive part so is there some other way to do it?"
- "Can you have an Astro agent on Macs? Have three Astro agents on Macs go brainstorm three different directions of an
  approach to make activation be way faster. I want it to be sub-1 second. That's what we're looking to do."
  (dictated: Astra agents on max)
- "And what do you mean, 'built today for one kind of change where only visible people the change can reach'? What
  does that mean? What do you mean that it was built for only one kind of change? How many different kinds of changes
  would we have to build it for?"

Orchestrator's reading: the activation target is now under one second (written into `lab/TARGETS.md`; the 100 s bar
stays as the floor until a design says what "activated" means within that second). Three Codex gpt-6.2-astra agents
at max effort (`deepthinker` role) each take one direction: ACTV-A prepare the new release in advance and switch;
ACTV-B no sweep and no mark, results derived on demand and admitted only if what they read is still current; ACTV-C
compute only the difference from indexes over rule inputs. Output in the private folder
`research/2026-11-19-activation-sub1s/`. The selector built today covers one parameter of one rule out of seven
parameter kinds in the test world; a general mechanism derived from each rule's declared inputs is direction C's job.

## 2026-11-19 about 16:45 local: the one-second definition accepted; no prepared releases; what a notification is

Sam, verbatim:
- "I think what must be true one second after pressing publish. I like your recommendation; that feels fine. No we
  can't have any releases prepared in advance, like preparing, because you said 1 million needs 8.5 minutes. If you're
  changing a form and then publish takes 8.5 minutes, it makes no sense. No, there's no preparing state of 8.5
  minutes."
- "Question: What is a notification? ... What does that mean in the speak of this kind of database? Also can you make
  me a Claude artifact that explains Triplex DB? Let's just call it that, which is based on Datomic. You had a good
  explanation of what activation meant but can you define what a subject is in there and then define what a
  notification is in there and stuff? Just short and sweet"

Orchestrator's reading: (1) one second after Publish: every read returns the new release's answers, every changed
output is durably stored, every owed notification is durably recorded; sending follows over seconds (in
`lab/TARGETS.md`). (2) The staged direction is closed: no release is prepared in advance. DX-STG1 was stopped and put
on the owed-notification record and dispatcher, which both remaining designs (LAZY, DELTA) need. (3) The working name
is "Triplex DB". A short explainer page was published as a private artifact; its source is kept in the private
project folder under `artifacts/`.

## 2026-11-19 about 18:45 local: understand first, predict, then run; do not queue analysis behind servers

Sam, verbatim:
- "ok so how is all of this going to affect our runs later? is there more problems then just these 3?"
- "Why is number 9 in the problems list going to be worked on Saturday? It's confusing. Why aren't we doing these as
  fast as possible and using Astro agents on Macs to figure things out? Do we need to run everything on the machine?
  Can we run things here?" (dictated: Astra agents on max)
- "Just keep being proactive about clearing out the problems and understanding them more deeply before we just run a
  thing to test it. Really confirm your hypotheses as best you can."

Orchestrator's reading: a correction to how I was working. I had been treating the servers as the place where
understanding happens and scheduling problems by server availability. From now each open problem has an analyst or
builder on it immediately; what needs absolute timing on bare metal is separated from what is mechanism, counts,
bytes, correctness or a model from saved traces; and every server run has a written prediction before it starts.
Launched at 18:53 local, Codex gpt-6.2-astra at max: PRED-QUEUE (the one commit queue), PRED-GROWTH (what grows with
data), PRED-LOAD (loading and importing), PRED-HA (a second copy and failure at size; the ping between the two
servers is 0.089 ms), PRED-READERS (the judged pair's read-side misses); DX-STG1 was put on explaining the
notification rate before any server run of it. Output: private folder `research/2026-11-19-predictions/`.

## 2026-11-19 about 20:05 local: Codex limit reset; agents move to gpt-6.2-sol at max

Sam, verbatim:
- "I reset the limit but can you switch from using Astra on Max to using 6.2 Sol on Max? If you have a harder problem
  you could use 6.2 Astra on high if you won't need a very creative solution but really only do that for the most
  creative ones."

Orchestrator's reading: every Codex agent runs on `gpt-6.2-sol` at max effort from now. `gpt-6.2-astra` at high effort
is kept for the few problems that need the most creative thinking (launcher role `creative`), and I name the reason
each time I use it. The sentence as dictated says "if you won't need a very creative solution"; I read the second half
("only do that for the most creative ones") as the rule. The launcher change is `a619d4eb4` on `main`.

## 2026-11-19 about 20:25 local: use many agents; only Astra is the thing to hold back

Sam, verbatim:
- "No, no, no, don't treat things as finite. It's fine to launch a max number of agents. That's okay. I just shouldn't
  have told you to use Astra because Astra uses so much more. Don't take this as 'don't use a lot of agents.' You
  should be using a lot of agents because we need to figure this out. It's totally okay, use them. Just don't use
  Astra unless you need to."

Orchestrator's reading: a correction. I had told Sam and the restarted agents that Codex usage is finite and that I
would not add agents beyond eight. That was the wrong lesson from the limit: the cause was Astra, not the number of
agents. From now every open problem gets an agent on Sol at max as soon as it has no owner, with no cap on the count;
Astra is used only when a problem needs it and I say why.

## 2026-11-20 about 06:35 local: one database stays the goal; the receipt question; notices later; Java and Rust

Sam, verbatim, in reply to the overnight summary (which asked whether "the November 9 tiered ruling" stands):
- "1. No I want to keep pushing having it all on one database, I never ruled we'd split it up I ruled that we'd make it
  all one database because datomic can handle billions and billions of records."
- "2. what does permanent record vs. "writing" mean? those seem like the same thing"
- "3. these should go out quickly, but we can deal with that later."
- "what is using Java? would rewriting things in rust anywhere help?"

Orchestrator's reading and correction: (1) **One Datomic database for all accounts is the goal and stays the goal.**
Sam is right about the record: on 2026-11-09 he approved a batch of the orchestrator's recommendations in one
sentence ("everything you recommended"); "tiered tenant isolation" was one row in that batch (Q78e, compiled as Q106f).
The orchestrator presented that row overnight as "your ruling" and built a recommendation on it. That was a
misstatement. His explicit statements (2026-11-19: "It feels like we should be figuring out how to do one"; today)
say one database. Q106f is superseded for layout: no brief proposes splitting accounts across databases as the
answer; the work is to make one database carry the load, and every obstacle found is a problem to solve, reported as
a miss with its cause when unsolved. (2) The durable-record question was put in words he could not tell apart; it
is re-asked with a concrete example. (3) Notifications must go out quickly; the bar is set later. (4) He asked what
runs on Java and whether Rust would help anywhere (earlier constraint: TypeScript only); answered in the reply.

## 2026-11-20 about 07:00 local: Sol agents at xhigh, not max

Sam, verbatim:
- "instead of using max effort sol 6.2, lets go with XHIGH effort instead"

Orchestrator's reading: every Codex `gpt-6.2-sol` launch and resume runs at xhigh effort from now (builders, reviewers,
analysts). The creative role (`gpt-6.2-astra` at high) is unchanged and still only for a problem that needs it. Agents
already running at max switch at their next handover, because a resume takes the launcher's current effort;
interrupting them now would lose measurement slots some waited hours for.

## 2026-11-20 about 07:10 local: the durable record counts as stored (Option A)

Sam, verbatim, answering the question put with the wage-floor example (Option A: one durable record that makes the
release permanent and fixes every answer, each person's values written in the background; Option B: every changed
value written to its own stored row before Publish counts as done):
- "yes for permanent record stuff Option A is totally fine"

Orchestrator's reading: one second after Publish the release must be permanent and every read must return the new
release's answers; the per-person values and the individual notice entries follow in the background, and a reader
who asks first gets the identical answer derived from the record. Written into `lab/TARGETS.md` section 1.2. The
receipt-only path is the path that is judged; the time the background writing takes is reported and has no bar
yet. This closes the question that was open since 2026-11-19 evening.

## 2026-11-20 about 07:25 local: all Java settings; what the Rust candidate actually costs

Sam, verbatim (quoting the orchestrator's four bullets on Rust back to it):
- "we're addressing all the java settings too right? to maximize java performance for our use case? and how much time
  does the thing you said we could write in rust actually take up in time/performance cost?"

Orchestrator's reading: (1) Not all of them were being addressed: one builder had the write gateway's collector; no
one had the other flags, the cores and memory per process, or Datomic's own settings for all three JVMs. DX-JVM1
launched for exactly that. (2) The claim "about 100 KB of memory per person the reader has touched" was wrong: that
figure was measured on the compact prototype's reader, not the product's. Corrected in the reply with the numbers
that are measured for the product's reader.

## 2026-11-20 about 11:40 local: 1 billion is the test size for now; work towards a version 0.1; keep the budget

Sam, verbatim:
- "1 billion is probably ok to test with for now, we can go up to 8 billion+ in the future when we give it more budget,
  but lets work towards a v0.1 of this project and keep our budget for now"

Orchestrator's reading: (1) the aging test stops at 1 billion records for now; 8 billion and beyond wait for a
later budget. (2) The cloud budget stays at $200; no request for more. (3) "v0.1" is not defined in his message. My
definition, written to `lab/V0.1.md` on main for him to correct: one merged branch, every account in one database,
one scorecard command run on bare metal at the fresh size and at 1 billion records, every failing line with a cause
and a next step.

## 2026-11-20 about 11:47 local: version 0.1 includes a demo playground dashboard and a local API for agents

Sam, verbatim:
- "v0.1 will also come with a "demo playground dashboard" which should be able to load a bunch of test data we store as
  a blob or w/e in github and then the dashboard helps you query and try to change things and etc to play around with
  it and see times and return records and etc. Also it should expose APIs on a local server that lets your local agents
  call the local server to query and etc"

Orchestrator's reading and the defaults chosen without asking (each is Sam's to change): one command starts the
product on a laptop; the test data is synthetic, generated by us, and committed to the repository as one compressed
file; the dashboard and the API are served by one local process bound to this machine only; the API is plain HTTP
with a machine-readable description, plus a tool server local agents can attach to; every action shows its timings
and the records returned. Added to `lab/V0.1.md` (78d73af74). Builder DX-PLAY1 launched.

## 2026-11-20 about 11:59 local: playground test data: Cloudflare, real Onboarded structure, two large accounts, 2 to 5 GB

Sam, verbatim (one customer's name replaced by "[the reference account]"):
- "is there somewhere else we can put the test data? 25MB isn't that much data right? Somewhere in cloudflare?
  Yes the data is invented, but in the shape of an onboarded account, so use real onboarded account structure, once we
  get further I'll explain what I want, but we are interested in the continuous compliance usecase, put that as a TODO
  for later
  Yes make it several accounts like you said, probably at least two big accounts with deep history (more than 1 month,
  lets do like 2GB-5GB of data), one [the reference account] shaped and scale, one thin and wide but on the scale of
  [the reference account] shaped and scale.
  Yes this machine only.
  Yes those things needing to be installed is fine.
  yes to what its currently built on yeah"

Orchestrator's reading: (1) the full test data set (2 to 5 GB) lives in Cloudflare R2 object storage; a small set of
at most 25 MB stays in the repository for tests and a quick start. The bucket is not created until Sam says which
Cloudflare account and confirms it may be publicly readable. (2) Structure follows Onboarded's own account model;
every value invented. (3) Deep account: about 100,000 people at about 160 facts. Wide thin account "on the scale
of" the deep one: read as the same total number of facts over millions of people (about 4 million at about 4
facts); flagged to Sam as a reading he may correct. (4) More than one month of history: at least five simulated
weeks. (5) Continuous compliance scenarios: TODO for later, recorded in `lab/V0.1.md` (fcfa01b9a).

## 2026-11-20 about 12:22 local: why not ZGC

Sam, verbatim:
- "Why can't we use the memory cleaner ZGC? Do we need to get a newer Java version or something? What's going on there?"

Orchestrator's reading: my message said ZGC was "not usable yet", which overstated the obstacle. Checked against
Datomic's release notes: 1.0.7705 (2026-07-10) added support for Java 25 and for ZGC on Java 25; we run 1.0.7745 on
a Java 21 image. The only thing missing is a Java 25 image and the test. DX-JVM1 resumed to build it, with three
server arms (Java 21 with two-core G1 on the writer, Java 25 with G1, Java 25 with ZGC).

## 2026-11-20 about 16:18 local: fewer agents; keep Codex usage for the weekend's runs; a cap on agents running at once

Sam, verbatim:
- "Okay I think you should not launch as many local agents for a bit. I want you to have Codex usage over the weekend
  when you run things. Why don't you not launch any more agents for now until after the weekend? Don't launch things
  unless they're things that you need to launch to prepare yourself for the runs or to help you get the runs to work,
  etc. Just log all things that you want to do for next week.

  You can switch and use Opus 5.5 on high for new agents. I take it back: you can continue to use Codex as you're
  using them. When that runs out you can switch to using Opus 5.5 as your agents but I want you to cap all agents
  running at one time to 6 agents. Don't turn off any current agents. Let those continue but let's go down to 8 at a
  time for now, like after these"

Orchestrator's reading (two numbers appear in the message; this is my reading, to be corrected by Sam):
1. Nothing running is stopped. Twelve agents were running at the time of the message.
2. From now, an agent is launched or resumed only if the weekend's server runs need it (the two server drivers,
   and builders whose command, fix or merge a run is waiting on), and only while fewer than 8 are running.
3. Codex stays the agent (gpt-6.2-sol at xhigh) while its usage lasts. When it runs out, new agents are Opus 5.5
   at high, capped at 6 running at once.
4. Everything else I would have launched is logged for next week in `lab/experiments/EXP-DX1/NEXT-WEEK.md`.
This replaces the direction of 2026-11-19 20:25 ("It's fine to launch a max number of agents").

## 2026-11-21 about 09:10 local: build the rolling release now; do not wait for next week; six agents in total; playground data on Sam's Cloudflare, public

Sam, verbatim:
- "Yeah we should do the rolling release one for sure. Let's just run that as fast as we can. Are there other things
  you need from me? What's the fullest set of things that you want to build, try, and test? I don't want to wait
  until next week. What are we doing here?

  No I'm saying run a total of 6 agents. Use those, spread in any kind of format across Codex or on Opus, using
  Codex first. Then when that runs out you can switch over and use Opus.

  Where are we at? What's the slowness then? What are our main lines of optimization that we still have to do, etc.?
  You can just put the Cloudflare data on my Wrangler that I have here and it can be publicly readable. It's fine.
  It's just test/demo data. It doesn't matter.

  Can you explain to me the failover behavior one last time? I guess there are other things to do. What's the most
  concerning? I need to fully understand where we're at for the overall project."

Orchestrator's reading:
1. The rolling release of fair-turn credits is approved and is the first priority. DX-PREP1 resumed at 09:14.
2. The restraint of 2026-11-20 ("log it for next week") is lifted: work the backlog now. This corrects my reading of
   that message.
3. Agent limit, corrected: **six agents running at once in total**, Codex first (gpt-6.2-sol at xhigh), Opus 5.5 at
   high when Codex runs out. My earlier reading (8 on Codex, 6 on Opus) was wrong.
4. Playground data: use the Wrangler login on this Mac (Sam's Cloudflare account); the bucket may be publicly
   readable; it is invented demo data. Still no personal details in the bucket, its name, or any commit.
5. He asks for: the full state of the project, the cause of the slowness, the remaining lines of optimisation, the
   failover options explained once more, what is most concerning, and what I need from him.

## 2026-11-21 about 10:00 local: answers to the open decisions; concern 4 (realistic data set) sooner; server before playground

Sam, verbatim:
- "For the failover let's go with B until a second copy exists. That works for me and then we'll do C for production.
  I agree. Put that on the roadmap for the future: when you go to 1.0, then we can do that other one. We can go to C.

  Keep your 1-through-6 concern, your 1-through-7 concerns, and make sure that we start to work towards those at some
  point as we continue. Especially in number 4 I want to get that happening sooner rather than later. We're testing
  on a realistic dataset for everything ideally but only add it in whenever it starts to make sense.

  For decisions from me I answered to failover. For number 2 the 50 ms clause works for me. The budget is still fine.
  Let's keep it like that.

  No, Onboard doesn't need to look up people by SSN once an account has a removal policy. No we never need to do
  that. We should have a way to mark data as sensitive or redacted and not let that work.

  I agree with number 4. For number 5 we'll do that later. Let's just get the server as good as we can and then we
  can start to work on the playground after that.

  This is my response to all the questions above in your full thing, your full response above to my last question."

Orchestrator's reading:
1. Failover: option B for version 0.1; option C on the roadmap for version 1.0. Recorded in `lab/V0.1.md`.
2. The seven concerns I listed stay on the list and get worked. Concern 4 (the wide thin account and the hundred
   small accounts in the same full-size database as the ten deep ones) moves up: a builder starts on it now.
3. Priority 6 is met when the ratio is at most 1.25 or the quiet account's loaded commit p99 stays at or under
   50 ms. Recorded in `lab/TARGETS.md`.
4. Budget stays at $200.
5. No lookup by the value of a protected field, ever; the refusal stays; marking data sensitive or redacted must
   exist. NEXT-WEEK item 12a is closed as "not needed".
6. Server work first; playground work after. The playground's server builds are not scheduled now; DX-PLAY1 stays
   parked with its public smoke data set published.
7. Continuous compliance scenarios: later.

## 2026-11-23 about 10:25 local: server 2 stays for the 1 billion scorecard and the memory test, then is deleted

Sam typed "continue" at about 10:13 local after the session had been silent since Saturday afternoon. Put to him as a
question with three options (run the 1 billion scorecard; scorecard plus the 32 GB memory test; delete now), with the
facts: spend at $223, $23 over the $200 budget, because both rented servers sat idle for about 36 hours.

Sam's answer (selected option): "Scorecard plus memory test" (described to him as: also run the 32 GB memory setup on
the 1 billion database; about 9 to 10 hours and $11 more, ending near $234, then delete).

Orchestrator's reading: about ten more hours on server 2 only, for those two runs, then deletion. No other server is
rented. The $200 budget is overspent by my failure, not raised: nothing else is to be spent without asking him.

## 2026-11-23 about 10:35 local: one-time start-up read allowed; run the 1 billion test whenever possible; asks about using two machines at once

Sam, verbatim (quoting the orchestrator's report first):

> "- The remaining latency miss is the first minute after a start. This makes your open decision more important: whether a one-time read of index data at start-up counts as "keep-warm". I recommend allowing it, since it runs once and stops." Yeah you can add the one-time read. That's fine with me. And you can run the test at 1 billion records whenever you can. Can you just run the two machines at once? Would that help to do it both at the same time? We don't need to do them sequentially if we don't have to, right? Can we use server 1 for anything? Is there more to test while we have the server up?

Recorded by the orchestrator:
- **Decided:** a one-time read of index data at start-up is allowed. It is not a keep-warm mechanism. A recurring or periodic warm-up is still not allowed.
- **Decided:** the 32 GiB cache test at 1 billion records runs as soon as it can.
- **Open (a question, not yet an approval of spend):** using two machines at once. Server 1 (bench-3) was deleted at 10:15 the same day, so a second machine means ordering one again.

## 2026-11-23 about 10:45 local: two machines until 23:30

The orchestrator asked: "Server 1 was deleted at 10:15 today, so running two machines means renting it again at $1.09 per hour. Spend is $223 now and ends near $234 on the current plan (server 2 only, deleted 20:30). Which do you want?" with three options (two machines to 23:30, about +$17, ending near $251; one machine to 23:30, about +$3; keep the current plan).

Sam chose: **"Two machines to 23:30 (Recommended)"**.

Recorded by the orchestrator: this approves one more machine and three more hours on server 2, both deleted by 23:30 on 2026-11-23, forecast total $251.19. It approves nothing after 23:30.

## 2026-11-23 about 11:48 local: keep both test databases in Latitude object storage

The orchestrator asked: "Deleting both servers at 23:30 also deletes the two test databases on them: the 1 billion record database (176 GB, took 26 hours and about $28 of server time to build) and the fresh full-size database (126 GB, several hours to build). Any later server test would have to rebuild them first. Keep copies?" with three options (Latitude object storage at about $2.60 per month; Sam's Cloudflare R2 at about $4.60 per month; do not keep them).

Sam chose: **"Keep in Latitude storage (Recommended)"**.

Recorded by the orchestrator: a recurring cost of about $2.60 per month until Sam says to delete the bucket.

## 2026-11-23 about 13:05 local: a local demo against the 1 billion database for Ben; Codex is out, use Opus 5.5 at high

Sam, verbatim (three messages):

> why are they going to run tongith again? And not right now?

> also could you build out just on my local, some way to connect to the latitude.sh server that will hold the 1 billion facts and have examples of what we can query and changes we can apply with an MCP? And then there is an inspector? Also FYI codex has run out of usage so switch to claude for stuff. Opus 5.5 on high is good

> I want to be able to show to ben how this works at the 1 billion facts scale

Recorded by the orchestrator: a demo is to be built (tunnel from the Mac, a local MCP server with example queries and changes, an inspector) to show Ben the store at 1 billion records. "Inspector" is read as both the standard MCP Inspector and a small page to look at a person's facts, history and feed (the orchestrator's reading). When the demo happens is not yet stated.

## 2026-11-23 about 15:10 local: say "subject"; break the 1 billion scorecard down; Datomic on hosted Postgres?

Sam, verbatim:

> Can you not say "person"? Do you actually mean "if a person has not changed as the pinpoint"? Do you just mean "if a subject has not changed" or what do you mean by that?
>
> For the $1 billion scorecard can you break these down for me? What are we at? What is working and what's not working? Can you explain to me? Do we have plans to figure out how to fix these? Also is this possible: that we could run Datomic Pro eventually on a hosted Postgres? Is that how that works, like on Neon or on Supabase, or no?

Recorded by the orchestrator: from now on the unit is called a subject in messages and new documents. The other two are questions, answered in the session.

## 2026-11-23 about 16:45 local: option A on the roadmap for a future version; option B stays for 0.1; is there a dashboard?

Sam, verbatim:

> Lets put Option A for failover for a future version on the roadmap, and keep Option B for 0.1 for now. ALso Is there a dashboard to demo this stuff yet?

Recorded by the orchestrator: `lab/V0.1.md` updated on `main` (option B stays for 0.1 with today's measurement; option A added under what is deferred past 0.1; option C stays the plan for 1.0). The dashboard question is answered in the session: a one-page inspector exists, a dashboard does not yet; one is being built on the demo branch.

## 2026-11-23 about 17:10 local: the dashboard "makes no sense"; redesign it as a Metabase-meets-Firebase app on shadcn, thought through by a Fable agent

Sam, verbatim (pasted):

> This dashboard makes no sense. Can you use shadcn as the design system and have a Fable agent think about what this should actually be?
>
> This should feel a lot more like I'm opening up, like MetaBase, right, and I can query it. It's like MetaBase mixed with Firebase by Google because you can make entities and stuff and I can make your own subjects or entities or whatever. I want to highlight the triplex stuff and being able to build your own entities and things as well.
>
> Can you list them and see what the types are, whatever? Then there should be a clear thing of what you can ask your MCP for: build new entities or use the language of the triplex thing that we can do, and kind of show off the triplex part of it as well as the reads and things. Does that make sense?

Recorded by the orchestrator: the first dashboard is rejected. Sam named a Fable agent for the design thinking in this request (an exception to the standing Opus-only rule, for this request alone). The build that follows goes to Opus.
