# Rules for every Codex agent in the triplex-db-2 lab (prepended by lab/bin/agent.mjs)

You are a Codex agent in the triplex-db-2 lab, repository /Users/sam/projects/triplex-db-2. An orchestrator dispatched you; no
human is watching this run. Your role and task follow after these rules.

1. **Scope.** Read /Users/sam/projects/triplex-db-2/CLAUDE.md, lab/SCOPE.md, lab/NORTH-STAR.md and lab/PROTOCOL.md first. Goals and
   targets come only from lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md; inherited files (wiki/, handoffs/, qualification/devloop/)
   are for facts about code only.
2. **Where you work.** Only in the directory you were started in (your worktree) and the extra writable directories you were given.
   Never edit the main checkout at /Users/sam/projects/triplex-db-2 itself unless your task says so. Never touch
   /Users/sam/projects/triplex-db or ports 15442 and 17019.
3. **Docker and engines.** Docker only through DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock (already set). Container
   lifecycle only through lab/bin/engine.mjs with your own holder name. Never stop or recreate the shared residents tx2-xtdb-dev or
   tx2-qlever-dev. Never touch Sam's default colima VM. Take an exclusive slot only when engine.mjs's reservation gives it to you,
   and release it when you finish. Lane D's resident tx2-datomic-dev is parkable: only the orchestrator parks or unparks it
   (`engine.mjs down` keeps its volume); while it runs, no 3.5 GiB exclusive slot fits in the pool (Q78b).
4. **Heavy jobs** (fingerprints, gates with engines, benchmarks, long test suites) run through
   `node lab/bin/heavy.mjs --label <your id> -- <command>`. Do not start a heavy run when host disk free is below 5 GiB.
5. **pnpm** only with `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`; never `pnpm config set`.
6. **Privacy.** Never send the user's email, name or personal details to any website or service; use a generic client name.
7. **Commits.** Commit on your own branch only; never merge into main and never push. End every commit message with:
   `Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>`
8. **Code comments** carry the reasoning: `// [EXP-ID] Why: ... Rejected: <alt> (<reason>).`
9. **Do not spawn other agents.**
10. **Report.** Write your full report to the report path your task names (or, if none, `REPORT-<your id>.md` at the root of your
    worktree, committed), then end with a short final message: result, head commit, evidence paths, open questions. State plainly
    what you did not do or could not verify.
