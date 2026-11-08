# EXP-X02 round 3 — CX-X02-R3

Result: **F1-R2 repaired for independent review.** All six parenthesized subqueries answer through the public provider exactly as XTDB 2.2.0 does. Earlier reviewer probes retain their expected behavior. This is a builder hand-back, not independent verification or promotion.

North star: correctness floor for P1 exact-cut reads and P4 current reads. Goals and targets come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Task scope is the remaining F1-R2 in `7873fea:lab/verify/X02/VERIFY-round2.md`, against branch baseline `6cd68dc`; Q79a's supported-subquery distinction remains the repair requirement.

## Repair

`packages/xtdb/src/native/ReadOnlySql.ts` indexes matching parentheses on the existing comment/literal-aware token stream. Before classifying a quantified operand, it unwraps complete balanced leading layers whose closing token immediately precedes the enclosing layer's close. The resulting query must still begin SELECT, VALUES, WITH or FROM. Bare arrays, wrapped arrays and incomplete operand layers remain refused. The index and scan use the existing tokens; quoted parentheses and comments do not become syntax.

The outer quantifier loop still visits every token, including the entire admitted subquery body. It does not jump over a classified operand, so a safe outer query cannot hide a nested unsafe ANY/SOME/ALL. No SQL AST rewriter, engine change, schema change, public export change, dependency change or arithmetic/routing change was introduced.

Public-provider unit tests cover all six ANY/SOME/ALL × comment-gap forms, extra comment-bearing VALUES layers, wrapped arrays, incomplete layers and unsafe comparisons inside wrapped subqueries. These tests check provider dispatch and typed refusal; live probes below establish engine answers. The private XTDB package does not require a publishable-package Changeset.

## Fresh evidence

All paths below are relative to this experiment's `round3/`.

| Check | Result | Evidence |
| --- | --- | --- |
| G0 | **960 executed / 960 pass / 0 fail / 130 expected skips / 0 unexpected skips** | `G0-receipt.json`, `G0-raw/`, `G0.log` |
| F1-R2 regression | **6/6**: baseline accepts, repaired envelope accepts, public rows equal raw engine rows `[{"v":"x"}]`; no Die | `subquery-regression.json`, `subquery-regression.log` |
| Reviewer SQL variations | **22/22** expectation matches; all 11 nested/comment-bearing unsafe array comparisons still refused; parenthesized safe subquery now answers | `delta-live.json`, `delta-live.log` |
| Earlier SQL/compiler probes | All **13 records** retain expected behavior: four envelope/public refusals, three raw cast controls, two typed compiler refusals | `source-hazards.json`, `probe-source.log` |
| Earlier sum controls | **20/20**, both languages | `source-sums.json`, `probe-sums.log` |
| Expanded sum controls | **30/30**, including recovery from all 18 overflow evaluations | `delta-sums.json`, `delta-sums.log` |
| Earlier offline controls | Both inventory recoveries, 100,000/100,001 edge-count boundary, canned default-depth refusal, mixed default routing; **13/13** build-source-map matches | `offline-source.json`, `offline-source.log` |
| Expanded offline controls | **10** inventory boundaries, **120** exact-compute/input checks, **213** default-routing executions pass | `delta-offline.json`, `delta-offline.log` |
| Formatting/lint/diff | oxfmt on both changed files; oxlint: zero warnings/errors; `git diff --check` passes | Source patch and command record below |

`exec-outcomes.json` records seven actual probe-process exits (all zero); `collect.py` separately asserts semantic records and G0 counts, checks G0's modified-source hashes against final source, and indexes retained bytes in `manifest.json`. `summary.json` retains counts. `reviewer-inputs.json` preserves the original six reviewer input/result records from `7873fea`. `source.patch` preserves the exact product/test delta. No product/test edits occurred after the passing G0.

The raw DECIMAL-to-BIGINT probe deliberately still returns `1000000000000000000` for `1000000000000000004`; text controls preserve the value. The generated exact Datalog compute path still refuses with typed `DatalogValidationError`. This repair makes no claim about precision safety of arbitrary authored SQL arithmetic.

## Commands, provenance and adaptations

Run from this worktree:

```sh
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-X02-R3-G0 -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-X02-R3 --note 'F1-R2 balanced query layers; unchanged owned-store shim'
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-X02-R3-reviewer-probes -- node lab/experiments/EXP-X02-xtql-parity/round3/run-probes.mjs
node lab/bin/heavy.mjs --label CX-X02-R3-evidence -- python3 lab/experiments/EXP-X02-xtql-parity/round3/collect.py
node_modules/.bin/oxfmt packages/xtdb/src/native/ReadOnlySql.ts packages/xtdb/test/native-query.test.ts
node_modules/.bin/oxlint packages/xtdb/src/native/ReadOnlySql.ts packages/xtdb/test/native-query.test.ts
git diff --check
```

Probe runner outputs use exclusive creation: retain these results and choose new names for reruns. The runner uses one heavy grant and runs its seven probes sequentially. All original reviewer tools were read with `git show 7873fea:lab/verify/X02/round2/<file>`; original/adapted tool hashes are in the manifest. Imports now target this worktree's source/public built exports; outputs remain in this experiment. Original query and arithmetic inputs are unchanged.

Two expectation adaptations are explicit: the subquery regression now asserts repaired public rows equal direct engine rows (retaining the original confirmed-regression calculation); and delta-live's two engine-invalid parenthesized-quantifier spellings expect a typed engine syntax refusal, rather than specifically the envelope's non-subquery error. The reviewer already documented those two as syntax errors rather than product defects. All six safe F1-R2 queries and eleven unsafe array queries retain their actual SQL unchanged.

G0 run `G0-xtdb-20261108T221443Z-a58b01` uses the **unchanged, committed round-2 owned-store pnpm shim**. It runs the unchanged declared build/typecheck scripts in package order and installed Vitest, since pnpm 10.11 rejects store-dir on recursive run/exec; its actual pnpm version call supplies `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. This is a disclosed execution adaptation, not an unmodified root check. There was no install, lockfile change or cache/config change.

G0's optional stash capture printed `error: could not write index`; it continued and passed. The receipt records `dirty:true`, baseline HEAD, tracked patch hash, both modified-file hashes, built package hashes and no stash snapshot. It is a working-source gate, not a clean-commit gate; this report's containing commit preserves the final source and patch. Original G0 receipt remains at `lab/runs/G0/G0-xtdb-20261108T221443Z-a58b01.json`; raw local output also remains under `runs/G0/`.

The first evidence index included its own still-open collection log, and the collector was edited while finishing; its two mismatches are retained in `manifest-initial.json`. A fresh collection excludes collection logs and binds the final collector in `manifest.json` (`collection-final.log`). No product or test change or semantic rerun was involved.

Heavy admission caused waits and was not bypassed. Disk observations in `disk-before.txt` and `disk-final.txt` exceed the 5 GiB floor. Live probes used only shared XTDB `127.0.0.1:5470`, the private Docker host, one connection per process, 15-second query timeouts and virtual relations. Clients close in finally; all wrappers completed and released their heavy grants. No fixture writes, engine lifecycle actions or exclusive reservations occurred. `engine-status-final.txt` records the existing three residents and 9.25 GiB reserved of 11 GiB.

## Open work and limits

Independent review of the committed repair remains required. No promotion, G1/full G2, matched SQL/XTQL packet qualification, exclusive default-depth/dense-graph qualification, complete writer-interleaving suite, Q58a basis contract, root-wide check, pack check, PostgreSQL/FoundationDB integration, performance or golden-scenario qualification was performed. The reviewer's exclusive-slot backlog remains open; this round does not close it.

No main-checkout files were edited, shared resident stopped, agent spawned, merge/push/deploy/publication performed, or prior untracked historical receipts adopted. Only this worktree's two XTDB files and round-3 report/evidence are committed.
