# triplex-db-2: read before doing anything

This checkout is the independent triplex-db-2 effort. Its goals, scope and targets are defined only in:

1. `lab/SCOPE.md`: what is in and out of scope (Sam confirmed 2026-11-07).
2. `lab/NORTH-STAR.md`: Sam's five ranked priorities, the hill-climb fitness.
3. `lab/TARGETS.md`: how each priority is measured, the fixed workload, and the requirements mapped onto the ten goals.

Inherited files (`AGENTS.md` devloop sections, `wiki/goals.md`, `wiki/status.md`, `handoffs/`, `qualification/devloop/`) are
homebase history: use them for facts about code and evidence, never for goals, targets, scale, load profiles, lanes or
procedure. Never touch `/Users/sam/projects/triplex-db` or ports 15442/17019. Docker work uses only
`DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock` through `lab/bin/engine.mjs`.
