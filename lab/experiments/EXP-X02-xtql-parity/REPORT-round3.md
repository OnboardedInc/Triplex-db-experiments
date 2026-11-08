# EXP-X02 round 3 follow-up — Q79e — CX-X02-R3

Result: **Q79e implemented for independent review.** The operand classifier now recognizes a small recursive query-expression grammar. All 1,818 generated safe queries match XTDB's own answers, all 1,818 generated unsafe mutations fail typed before answer execution, and all six F1-R3 UNION regressions match the engine. Earlier reviewer probes retain their expected behavior. This is a builder hand-back, not independent verification or promotion.

North star: correctness floor for P1 exact-cut reads and P4 current reads. Goals and targets come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. The dispatch authorizes Q79e in main-checkout `lab/acceptance/RULINGS-PENDING.md`; reviewer finding F1-R3 is at `dc4857b:lab/verify/X02/VERIFY-round3.md`. Baseline is `200d6697bd8e78375f17660c9277bccb00f9dece`.

The previous round-3 report and wrapper-only implementation at `200d669` are superseded by this repair. Their original `round3/` evidence is retained unchanged; the reviewer's finding correctly showed that complete-wrapper peeling did not recognize parenthesized set-operation arms.

## Grammar and implementation

`packages/xtdb/src/native/ReadOnlySql.ts` classifies each quantified operand using:

```text
query   := primary (set-op [ALL | DISTINCT] primary)*
primary := '(' query ')' | SELECT body | VALUES body | WITH body | FROM body
set-op  := UNION | INTERSECT | EXCEPT
```

The parser uses the existing comment/literal-aware tokens and matching-parenthesis index. It recursively validates grouped primaries and every set-operation arm, requires nonempty productions and consumes the entire operand. It does not require a leading group's close to be the operand's final close. Bare/wrapped arrays, missing arms, non-query arms, empty groups and unbalanced boundaries fail classification.

SELECT/VALUES bodies remain opaque balanced SQL for XTDB to parse and typecheck. WITH/FROM preserve the earlier native envelope's entry points; this is not a full SQL AST validator. The grammar separates query expressions from non-query operands; the engine still validates SQL leaf syntax. Existing modification/statement restrictions remain unchanged.

Classification does not advance the outer token scan past an operand. Every nested quantified comparison, including predicates in later set arms, is checked independently. Comments and quoted parentheses remain lexical content, never grammar structure. No schema, engine, arithmetic, routing, dependency or public-export change was introduced.

## Grammar-generated corpus

`packages/xtdb/test/query-expression-corpus.ts` constructs query trees and renders them; it does not enumerate the six failing SQL strings as its acceptance strategy.

- Two leaves: SELECT and VALUES.
- 96 binary productions: both leaf types on both sides × UNION/INTERSECT/EXCEPT × absent/present ALL × independently grouped/ungrouped left and right arms.
- Three compound productions: an operator chain inside grouped left and right query arms, covering recursive compounds and different inner operators.
- Every one of these **101 forms** gets **outer depths 1, 2 and 3**, **with and without comments**, and **ANY/SOME/ALL**: **1,818 unique cases**. Intrinsic arm groups are additional to the stated outer depths.
- Comment rendering places block comments containing parentheses and CRLF-terminated line comments at all rendered token gaps, including group boundaries and between a set operator and ALL.
- Every generated query also receives a new UNION arm with unsafe `SOME/**/ ARRAY[1,2]`: **1,818 unsafe controls**. These run only through the public provider, never directly against the known-hazardous raw engine path.

The unit suite executes every safe corpus member through the public provider with a mock client and separately rejects invalid grammar productions. `q79e/grammar-live.ts` uses the same generator for real-engine comparisons: each safe query executes through the public provider and directly against XTDB 2.2.0, comparing complete decoded rows. Empty ALL and empty-set answers are retained without conversion to positive witnesses. Six exact reviewer UNION inputs are additionally executed with independent ANY/SOME versus ALL expected rows.

## Fresh checks

All following paths are under `q79e/`.

| Check | Fresh result | Evidence |
| --- | --- | --- |
| G0 | **967 executed / 967 pass / 0 fail / 130 expected skips / 0 unexpected** | `G0-receipt.json`, `G0-raw/`, `G0.log` |
| Generated safe queries | **1,818/1,818** public/raw row matches; no engine errors | `grammar-live.json`, `.json.jsonl`, `.log` |
| Generated unsafe set arms | **1,818/1,818** typed non-subquery refusals; no Die | Same grammar evidence, separate `unsafe` array |
| Reviewer F1-R3 UNION forms | **6/6** public/raw matches, including ALL's empty rows | Same grammar evidence, separate `reviewer` array; original records in `reviewer-union-inputs.json` |
| Earlier F1-R2 parenthesized forms | **6/6** public/raw matches | `subquery-regression.json`, `.log` |
| Earlier SQL variations | **22/22** expected outcomes; all eleven unsafe comment/array/nested controls still refused | `delta-live.json`, `.log` |
| Earlier SQL/compiler controls | All **13 records** retain expected disposition | `source-hazards.json`, `probe-source.log` |
| Earlier and expanded sums | **20/20** and **30/30**, both languages; recovery on all 18 expanded overflow controls | `source-sums.json`, `delta-sums.json`, corresponding logs |
| Earlier offline controls | Inventory recovery, edge-count boundary, canned depth refusal, historical mixed default; **13/13** source-map embeddings match final source | `offline-source.json`, `.log` |
| Expanded offline controls | **10** inventory boundaries, **120** exact-compute/input checks, **213** default-routing executions | `delta-offline.json`, `.log` |
| Formatting/lint/diff | oxfmt on all three source/test files; oxlint zero warnings/errors; `git diff --check` | Commands below |

`exec-outcomes.json` records actual probe exits. `collect.py` checks semantic records, counts, corpus-key uniqueness, G0 and source hashes independently of process exit; `summary.json` retains denominators and `manifest.json` indexes retained bytes. `source.patch` retains the tracked product/test delta; the newly generated corpus helper is committed separately at its source path and hash-bound in the manifest.

The raw DECIMAL-to-BIGINT control still demonstrates XTDB's known rounding hazard; text controls retain the exact value. Generated exact Datalog compute remains deliberately unavailable through typed refusal. This repair does not promise arbitrary authored SQL arithmetic is precision-safe.

## Execution and provenance

Commands from this worktree:

```sh
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-X02-Q79e-G0 -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-X02-Q79e --note 'Q79e query-expression grammar; owned-store shim unchanged'
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-X02-Q79e-live -- node lab/experiments/EXP-X02-xtql-parity/q79e/run-probes.mjs
node lab/bin/heavy.mjs --label CX-X02-Q79e-evidence -- python3 lab/experiments/EXP-X02-xtql-parity/q79e/collect.py
node_modules/.bin/oxfmt packages/xtdb/src/native/ReadOnlySql.ts packages/xtdb/test/native-query.test.ts packages/xtdb/test/query-expression-corpus.ts
node_modules/.bin/oxlint packages/xtdb/src/native/ReadOnlySql.ts packages/xtdb/test/native-query.test.ts packages/xtdb/test/query-expression-corpus.ts
git diff --check
```

The live runner takes one shared heavy grant and runs its eight probes sequentially. Output creation is exclusive; choose new output/log names for reruns. Seven prior tools retain the original `7873fea` reviewer inputs, rebound to this worktree and new outputs. Their import/output adaptations and baseline/modified hashes are retained in the manifest. As disclosed in the preceding round, the six repaired subqueries assert success, and the two engine-invalid parenthesized-quantifier spellings expect typed engine errors rather than specifically the local envelope's error. Original unsafe SQL, sums and compiler inputs remain unchanged. The original six UNION records were read with `git show dc4857b`; live SQL uses their exact expressions and expected rows.

G0 ID is `G0-xtdb-20261108T223050Z-fdac21`. The unchanged committed round-2 owned-store pnpm shim executes unchanged package build/typecheck scripts in order and installed Vitest; pnpm 10.11 rejects store-dir for recursive run/exec. Its actual pnpm version call supplies `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`. No install, lockfile/config/cache change occurred. This is a disclosed adaptation, not an unmodified root check.

Optional G0 stash capture printed `error: could not write index`; the gate continued and passed. Receipt source/build hashes, patch and the containing commit preserve this working-source run; no clean-commit/stash qualification is claimed. Source/test files were not changed after G0. Original receipt/raw output remain under `lab/runs/G0/` and `runs/G0/`, with durable copies here. All prior failure artifacts and the earlier manifest-index repair remain unchanged in `round3/`.

Heavy admission waits were respected. Disk observations exceed the 5 GiB floor. Live work used only shared XTDB `127.0.0.1:5470`, the private Docker host, one connection per probe process, 15-second query timeouts and virtual relations. Clients close in finally. No fixture writes, exclusive reservation, resident restart or engine lifecycle mutation occurred. All probe wrappers completed and released their grants.

## Open work and limits

Independent review of this committed Q79e implementation remains required. Full G1/G2, matched SQL/XTQL packets, exclusive default-depth/dense-graph controls, incomplete writer-interleaving controls, Q58a basis contract, performance/golden scenarios, root-wide check, pack check and PostgreSQL/FoundationDB integration remain unverified in this round. Earlier reviewer exclusive-slot qualification requirements are still open. The private XTDB package introduces no publishable-package Changeset.

No main-checkout files were edited, agent spawned, merge/push/deploy/publication performed or unrelated historical untracked receipts adopted.
