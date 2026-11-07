# Temporal Datalog implementation guidance

Scope: this project on dot's cloud computer. Existing user instructions, task authorization, project-data restrictions and stopped-action boundaries take precedence.

## Build against the real engine early

The requested deliverable is working, tested code inside DuckDB. For any implementation lane whose behavior depends on SQL, storage, native callbacks, typed parameter/result conversion, transactions or driver lifecycle:

1. Read [the shared runtime reuse guide](DUCKDB-RUNTIME-REUSE.md) and the current lane checkpoint. Evaluate the existing exact immutable dependency closure before proposing a new installation.
2. Select a small, genuinely independent real-engine slice early, with a concrete driver/API, exact source/input identity, current ownership coordination and fresh isolated target. Do this before growing a reference, mock or synthetic foundation into the principal deliverable.
3. Carry independent oracles and focused pure-component tests alongside the real-engine work. Report their scope honestly. A recording-port ACK is not a database ACK; source review is not SQL parsing or runtime acceptance.
4. Continue to the lane's integrated acceptance criteria. If the engine step is blocked or unsuitable, record the exact action/target, missing fact or API, observed status and next dependency. Do not leave a generic “no fresh runtime” blocker when the actual missing work is selecting a driver/action.

A fresh subject/action is not a demand to install a fresh package. Existing package availability is also not execution admission. Current authority, reviewed exact inputs, immutable ownership, fresh targets and the actual initial terminal outcome remain required.

## Preserve independent boundaries

- Do not import, retry, reopen, repair, rename or adopt a frozen/consumed subject, stopped dependency or uncertain operation. A new lane is not permission to complete a denied pipeline.
- Do not mutate, copy, relocate, overlay, repair or acquire dependencies as an incidental workaround. Keep read-only shared inputs separate from each lane's owned database and capture targets.
- Do not snapshot or inventory the computer. Keep evidence to necessary project source, selected dependency identities, synthetic fixtures and actual project results.
- No Codex, user-computer, deployment, merge, deletion or permission change is authorized by this guide.
- Unknown ownership stays unknown until reconciled. A missing prior worker is not a released lease.

## Handoffs and checkpoints

Every implementation continuation should explicitly include its real-engine slice or exact blocker, concrete driver/runtime candidate, owner and lease state, source/PR, acceptance boundary and next action. Include the shared runtime guide in the handoff when it has not been read. A saved guide alone does not update an already-running lane.

See [the 4 November lane reconciliation](ENGINE-FIRST-CHECKPOINT-20261104.md). Preserve historical results and holds; this guidance changes the building default, not past acceptance.
