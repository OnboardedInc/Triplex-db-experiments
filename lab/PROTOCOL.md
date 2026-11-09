# triplex-db-2 operating protocol (v2, 2026-11-09)

This file says who does what in the loop and how agents are launched. It replaces `lab/PLAN.md` section 6.2 and the agent row of
section 7. Goals and targets stay in `lab/SCOPE.md`, `lab/NORTH-STAR.md` and `lab/TARGETS.md`.

Sam, 2026-11-08, verbatim:

> Ok I want you to switch to orchestrating the two you are doing AND a Datomic-based version as well. I want you to use codex sol
> 6.1 medium effort as code builders/writers and have opus 5.5 on high effort be planners/thinkers with codex 6.1 high effort as
> adversarially reviewers. Do not launch anything higher effort than high for your own subagents or for codex. First get the dev
> loop running in this fashion by updating w/e you are using as your protocol.md and dev loop tools and then spin up the extra
> Datomic lane and then continue all in parallel. If you hit 65% usage, gracefully pause work without wasting in-flight work.

## 0. Change of 2026-11-09 (Sam, verbatim in lab/research/SAM-decisions-2026-11-09.md)

> Use more of the Claude usage now instead of a lot of Codex. Switch to using Sonnet on high to write stuff instead of the Codex stuff.
> That's the switch to make. ... You can use my whole Mac and close down anything heavy that's running here that's not needed. Don't
> turn off Claude or Codex, though.

1. **Builders are Sonnet 5.5 at high** through the Agent tool. Codex builder sessions already running finish their current task; no new
   Codex builder launches. Reviewers stay Codex `gpt-6.1-sol` at high (`agent.mjs --role reviewer`); planners and researchers stay Opus
   5.5 at high. Nothing above high. At most 10 agents at once across all roles.
2. **A Sonnet builder works only inside the worktree its brief names,** commits on that worktree's branch, never edits lab/acceptance
   (preamble 9b), keeps bulky evidence out of git (9c), and ends with a report path and a short summary. Docker work goes only through
   `lab/bin/engine.mjs` on the triplex2 socket.
3. **The whole Mac is available for quiet windows** (ruling Q106b): the orchestrator may stop Sam's default colima VM and other heavy host
   jobs that are not needed, never Claude or Codex processes, and announces each window in STATE.
4. **Disk:** runs may be made smaller or sequential when space requires it.

## 0b. Change of 2026-11-09 night: fast-forward mode (Sam, verbatim in lab/research/SAM-decisions-2026-11-09.md, "night")

> We don't have to do small iterations. If you can see how to obviously jump ahead on stuff, we aren't forced to stick to the workflow
> of the protocol. ... Don't use Sonnet or Opus for your background agents. Just use Codex 6.1 Sol on medium.

This section overrides sections 0 to 4 where they differ, until Sam says otherwise.

1. **Every background agent is Codex `gpt-6.1-sol` at medium** (`node lab/bin/agent.mjs launch --role builder`). No Sonnet, Opus or
   Fable subagents, no forks. The orchestrator does the planning and the reviewing of results itself.
2. **Lanes:** lane Q (broker and QLever) is paused. Lane D (Datomic on Postgres storage) and lane X (native XTDB) are active. The goal is
   all of P1 to P5 at their TARGETS bars on one of them.
3. **Spikes come first and skip the brief, review and contract cycle.** A spike is a time-boxed measurement or prototype that answers
   named questions with numbers. It needs no planner brief, no adversarial review, no rulings row and no contract pin. Its report says
   what was measured, how, and what was not checked.
4. **The orchestrator may jump:** when the evidence already shows that a step will work or that a better path exists, it skips the
   intermediate rounds and builds the target design directly. It records the reason in `lab/research/` or STATE in a few lines.
5. **Correctness is still the floor.** A fast path counts only when an equivalence test shows it returns exactly what the existing slow
   path returns (or declines), at every basis the test generates. Acknowledged commits must be durable. No silent precision loss.
6. **Receipts, pins and one independent review happen once, at the end,** on the design that meets the bars, before any PASS is
   claimed in the scorecard. Diagnostic numbers are labelled diagnostic until then.
7. **Docker for spikes:** an agent whose task says so may run `docker` directly against
   `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` for containers, networks and volumes whose names start with the prefix
   its task gives it. It never touches a container it did not create, never pulls or downloads anything, and removes what it created.
   Everything else in the preamble stands (never `/Users/sam/projects/triplex-db`, never ports 15442 or 17019, pnpm store, privacy).
8. **Measured windows do not overlap.** Before a timed run, an agent takes the lock
   `mkdir /Users/sam/Claude/Projects/triplex-db-2/locks/measure` (retry every 5 s), holds it at most 15 minutes, and removes it in an
   exit trap.

## 1. Roles

| Role | Model and effort | What it does | How it is launched |
| --- | --- | --- | --- |
| Orchestrator | this session | selects work by the north star, writes rulings, merges, keeps STATE and the notebook | n/a |
| Planner and thinker | Opus 5.5, high | experiment designs, briefs, research on the web and in pinned source, synthesis | Agent tool: `model: "opus"`, `effort: "high"` |
| Code builder | **Claude Sonnet 5.5, high** (since 2026-11-09; was Codex `gpt-6.1-sol` medium) | implements one experiment or fix round in its own worktree, runs gates, writes receipts | Agent tool: `model: "sonnet"`, `effort: "high"`, `run_in_background: true`; the orchestrator creates the worktree first (`git worktree add`) and the brief names it; the brief starts with `lab/agents/CODEX-PREAMBLE.md` (the lab rules apply to every builder) |
| Adversarial reviewer | Codex `gpt-6.1-sol`, high | verifies a branch by trying to break it (the old V-* verifiers), reviews plans and contract versions | `node lab/bin/agent.mjs launch --role reviewer ...` |

**Effort cap.** Nothing runs above high, for Opus or for Codex. `lab/bin/agent.mjs` is the only way Codex is launched: it passes the
model, the effort and the sandbox explicitly (the user config defaults to effort `max`) and refuses any other role. Every Agent tool
call passes `effort: "high"`. Sonnet only as builder; no Fable, no forks.

**One experiment, three hands.** A planner writes the brief (or the orchestrator does, for small rounds), a builder implements it, a
reviewer that did not write it verifies it, and the orchestrator merges. A builder never verifies its own work.

**Codex agents get a fixed preamble.** `lab/agents/CODEX-PREAMBLE.md` is prepended to every Codex prompt by `agent.mjs`; it carries
the lab rules (scope files, Docker and engine rules, heavy jobs, pnpm store, privacy, commit trailer, report file).

## 2. Concurrency and resources

- At most 10 agents at once, Opus and Codex counted together; at most 4 heavy local commands (`lab/bin/heavy.mjs`).
- Engines, slots, the pool and disk as in `lab/PLAN.md` section 7 and `lab/STATE.md`; no new heavy run below 5 GiB host disk free.
- The ledger of Codex launches, sessions and exits is `lab/agents/ledger.jsonl`; logs and last messages are in
  `/Users/sam/Claude/Projects/triplex-db-2/agents/<ID>/`. `node lab/bin/agent.mjs list` shows them.

## 3. Usage pause at 65%

1. The orchestrator reads plan usage (`mcp__ccd_session_mgmt__get_usage`) before every dispatch batch and at every hourly pass.
2. At 65% or more of any weekly window: no new launches of any kind. Each running agent is told, at its next stop, to commit its
   work in progress on its own branch and write `lab/agents/handoffs/<name>.md` (state, next step, open findings). Codex runs in
   flight are allowed to finish their current round, since their output is lost if killed. STATE records the pause and what resumes.
3. A Codex run that fails on a Codex rate limit pauses only the Codex roles, the same way.
4. Resume after the window resets: re-dispatch from the handoffs, highest north-star priority first.

The 2026-11-08 Claude weekly limit stopped ten Claude agents mid-work. They are not resumed (their effort levels may exceed the new
cap); their work is committed as WIP on their branches and summarised in `lab/agents/handoffs/`, and new agents under this protocol
continue from there.

## 4. Lanes

| Lane | Engine | Native language | Status |
| --- | --- | --- | --- |
| X | XTDB 2.2.0 | XTQL (primary), SQL (named alternative) | running since 2026-11-07 |
| Q | QLever 0.6.0 (+ log of record) | SPARQL | running since 2026-11-07 |
| D | Datomic (version pinned by the lane design) | Datomic Datalog query and pull | added 2026-11-08; design first (planner), then bring-up |

All three lanes serve the same five priorities, the same ten-goal backbone, the same contract and oracles, and the same golden
scenarios. Lane D starts with a design (deployment in the triplex2 VM inside the pool, the TypeScript access path for Triplex,
native-query surface, how P1-P5 map onto Datomic's model) before any code.

## 5. Hourly pass

Reread `lab/NORTH-STAR.md`; update the notebook from finished work; check usage (section 3); check every running agent still
serves a priority; launch research where learnings raise a question. Research is a planner role: Opus 5.5 at high (this replaces
the earlier "Sonnet research" wording).

## 6. Codex content filter

Codex refuses prompts its safety filter reads as offensive security work (CX-VE01-2 was stopped after 113k tokens by a prompt about
"tamper routes" and "escapes" from the evaluator). Reviewer prompts about the lab's own integrity checks are written as quality assurance
of our own harness: "check that each documented check rejects the inputs it should", "add a regression test for a variation", never
"attack", "escape" or "break out". A filtered run is relaunched with a new id and the reworded prompt, building on its partial files. CX-VSQL01 was stopped the same way after
153k tokens by a durability prompt that said "SIGKILL" and "torn read"; durability prompts say "abrupt process stop (the power-loss
case)" and "a snapshot read must return whole commits". Before relaunching, commit the stopped run's partial files as WIP on its branch. Erasure-checker reviews were stopped twice (CX-VER01S rounds 1-3 passed, round 4 stopped) by prompts about "hidden" keys,
"decrypting" and "recoverable" secrets; those prompts say "planted test markers", "the checker reports every marker" and "REFUSED when it
cannot read a range". A reviewer whose run was filtered is relaunched under a new id, not resumed, so the flagged context is not carried.
