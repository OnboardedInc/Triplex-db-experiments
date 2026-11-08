# EXP-X02 round-3 delta verification — CX-VX02-3

**Verdict: FIX-FIRST.** Reviewed `200d6697bd8e78375f17660c9277bccb00f9dece` on `6cd68dc`, from verifier branch `verify/X02` at `7873fea`. The six F1-R2 parenthesized subqueries are repaired, earlier unsafe forms remain refused, and fresh clean-source G0 passes. One **P2 supported-subquery regression remains**: a quantified operand whose compound query starts with a parenthesized UNION arm. Six independently executed controls establish baseline admission, correct engine answers and target public-provider refusal. This blocks the requested safe-to-merge verdict; no product code was changed.

**North star:** correctness floor for P1 exact-cut reads and P4 current reads. Goals and targets come only from main-checkout `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure follows `CLAUDE.md` and `lab/PROTOCOL.md`. The dispatch's delta requirement and prior Q79a supported-subquery distinction govern this check. This report does not claim complete X02 qualification or review C8's combined source.

## F1-R3 — P2: supported compound subquery with parenthesized first arm is refused

**Location at `200d669`: `packages/xtdb/src/native/ReadOnlySql.ts:117` and `:127`.**

Reproduction:

```sql
SELECT 'x' AS v WHERE 1 = ANY/**/((SELECT 1) UNION ALL SELECT 2)
```

XTDB 2.2.0 directly returns `[{"v":"x"}]`; the original `bf1ad4d` guard admits the exact statement. The target guard throws its non-subquery-operand error, and the actual public `selectSql` provider returns typed `Fail(ReadError)` without an answer. `6cd68dc` also refuses it: round 3 repairs the six previously demonstrated instances but leaves this instance of the same supported-query regression unresolved. The error is deterministic, with no timeout or Effect Die.

The new loop peels only an opening parenthesis whose match is immediately before its enclosing close. Here the inner `(SELECT 1)` ends before `UNION ALL SELECT 2`, so the loop stops and the classifier sees `(` instead of SELECT/VALUES/WITH/FROM. A compound query with a parenthesized left query-primary is still a supported subquery, as the direct execution demonstrates.

**6/6 confirmed:** ANY, SOME and ALL, each with `/**/` and ` /* subquery */ `. ANY/SOME return `[{"v":"x"}]` from the engine; ALL returns `[]` because one row is 2. All six were admitted by `bf1ad4d`, are rejected by both later guards, and fail typed in the target public provider. The ALL empty answer is deliberately retained as the correct answer, not converted into a positive witness.

**Evidence:** `round3/union-regression.ts`, `union-regression.json`, `union-regression-r2.log`. From `round3/target`, use a fresh output name:

```sh
DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock node lab/bin/heavy.mjs --label CX-VX02-3-union-new -- node --import tsx ../union-regression.ts "$PWD/../union-regression-new.json"
```

The tool exits zero when all six regressions are confirmed; that exit is not a semantic PASS for the implementation.

**Proposed fix:** classify the operand as a query expression including a parenthesized query-primary followed by a set operation, rather than requiring every leading query parenthesis to wrap the entire operand. Preserve balanced boundaries, comment/literal token handling and full inner-token scanning. Add public-provider regressions for these six statements and retain the nested unsafe controls. Simply skipping arbitrary opening parentheses would weaken the guard; accepting this supported compound-query shape must still distinguish wrapped arrays. No implementation fix is included in this review.

## Fresh evidence

All paths below are relative to `lab/verify/X02/round3/`. Tools were copied from the verifier's own round-2 versions, with target identity/imports rebound to a separate detached worktree at exactly `200d669`; original probe inputs and expectations were preserved. Author results were read for claims, not adopted as fresh evidence.

| Check | Independent result | Evidence |
| --- | --- | --- |
| G0 | **960 executed / 960 passed / 0 failed / 130 expected skips / 0 unexpected skips** | `G0-receipt.json`, `G0-raw/`, `G0.log` |
| Original six supported subqueries | **6/6 repaired**: target guard admits, public provider succeeds, raw engine returns `[{"v":"x"}]`; no Die | `subquery-regression.json`, `.log` |
| Original SQL/compiler probes | All 13 records retain their expected disposition: four envelope/public refusals, three raw cast controls, two compiler refusals | `source-hazards.json`, `.jsonl`, `probe-source.log` |
| Original sums | **20/20 pass**, both languages | `source-sums.json`, `.jsonl`, `probe-sums.log` |
| Expanded sums | **30/30 pass**, including recovery through `catchTag` on all 18 overflow controls | `delta-sums.json`, `.jsonl`, `.log` |
| Earlier offline controls | Both overflow recoveries; 100,000/100,001 edge boundary; canned D=8 refusal; historical mixed default; **13/13** source-map embeddings equal source | `offline-source.json`, `.log` |
| Expanded offline controls | **10** inventory controls, **120** exact-compute/input checks, **213** default-routing task executions plus ordinary default pass | `delta-offline.json`, `.log` |
| Earlier token variations | All **11** unsafe comment/array/nested controls refused; safe parenthesized control now succeeds. Original expectations match **20/22** | `delta-live.json`, `.jsonl`, `.log` |
| New variations | **57** controls: 15 unsafe typed refusals; 27 supported public/raw answer matches; 12 supported false refusals; 3 raw-engine errors | `variations.ts`, `.json`, `.jsonl`, `.log` |
| Isolated UNION regression | **6/6 confirmed remaining regressions**, with all three guard generations and real public/raw results | `union-regression.json`, `union-regression-r2.log` |

The two unchanged delta-live expectation mismatches are the same engine-invalid parenthesized quantifier spellings documented in round 2 (`k = (ANY...)`, `k = ((SOME...))`). They fail typed and the raw engine gives syntax errors; they are not guard findings. Keeping the old expectations avoids silently rewriting historical probes.

The new safe nesting matrix spans depths 1, 2, 4, 8 and 16 for ANY/SOME/ALL, with block comments containing parentheses and CRLF-terminated line comments at every layer: **15/15** public/raw matches. VALUES, quoted parentheses and nested safe quantified queries also match. Plain `SELECT 1 UNION ALL SELECT 2` inside balanced wrappers matches in all three quantifiers, including ALL's empty answer. The 12 exploratory false refusals vary parentheses on the UNION arms and comments; the minimal six-case follow-up above proves a subset were previously admitted, avoiding reliance on baseline restrictions around `UNION ALL (`.

Three multiply parenthesized WITH-subquery controls are admitted by the repaired envelope but fail directly in XTDB with `Unknown symbol: '_sq_2'`; their public calls also fail typed. These exploratory expectation failures are engine behavior, not supported-query regression evidence. All **15** new unsafe controls (bare/wrapped arrays, deeply nested unsafe inner comparisons and an unsafe comparison in a UNION branch) fail with the envelope's typed refusal. Known hazardous array queries were never run directly against the shared engine.

F2–F4 retain their round-2 disposition. Exact Datalog compute remains deliberately unavailable through typed `DatalogValidationError`; it is not qualified exact arithmetic. The raw engine-only DECIMAL→BIGINT control still rounds `1000000000000000004` to `1000000000000000000`; text controls preserve it. This patch does not promise arbitrary authored SQL arithmetic is precision-safe. Offline recursion/default controls are control-flow evidence, not persisted-fixture or full live mixed-library qualification.

## Source binding and operations

Retained detached target: `round3/target/`, exactly `200d669`, with **no tracked product/lockfile diff**. Existing dependency links were copied, including relative workspace links into this target; no install, dependency change, pnpm configuration or shared build edit occurred. Fresh builds use declared scripts. Source-map checks and `manifest.json` bind current source and generated outputs; no dist files were edited manually. The nested target is gitignored but reconstructible from the reviewed commit; content-addressed G0 input preimages remain under its `runs/objects/`.

Fresh G0 ID: **`G0-xtdb-20261108T222232Z-53f798`**. Its receipt records `dirty:false`, exact HEAD/tree, empty source patch, Node `v22.23.2`, pnpm `10.11.0`, lockfile/build/input hashes and raw outputs. No optional stash snapshot is claimed. Command from the target:

```sh
PATH="$PWD/lab/experiments/EXP-X02-xtql-parity/round2/bin:$PATH" node lab/bin/heavy.mjs --label CX-VX02-3-G0 -- node lab/bin/gate.mjs G0 --lane xtdb --exp CX-VX02-3 --note 'Independent clean committed 200d669 delta rerun; unchanged owned-store shim'
node lab/bin/heavy.mjs --label CX-VX02-3-reviewer-probes -- node ../run-probes.mjs
```

G0 uses the **unchanged committed owned-store pnpm shim** disclosed in round 2. It runs unchanged package build/typecheck scripts and installed Vitest because pinned pnpm rejects store-dir for these recursive run/exec forms; its actual pnpm version invocation uses the required owned store. This is not an unmodified root `pnpm check` claim. G0's own expensive substeps also take shared heavy grants.

Every live process used shared XTDB `127.0.0.1:5470`, the private Docker endpoint, one client connection, 15-second query timeouts and virtual relations. Clients closed in finally. No fixture writes, engine lifecycle calls, exclusive reservation, resident restart, unrelated service or excluded port was used. `exec-outcomes.json` and `additional-exec-outcomes.json` preserve actual exits: seven earlier probes exit zero; the exploratory variation process and its runner exit one for the 15 classified mismatches; the final UNION confirmation exits zero. The first UNION tool-creation attempt used the target cwd with outer-relative paths, failed before tool creation/query execution, and retains its module-resolution failure in `union-regression.log`; the corrected attempt has a separate label/log. No earlier failure was overwritten.

`summary.json` retains semantic denominators and mismatches; `manifest.json` indexes tools, outputs, G0 raw files, baseline guards, source/build bytes and this report. Disk snapshots exceeded the 5 GiB host-free floor before heavy admission. Final `engine-status-final.txt` reports 9.25 GiB reserved in the 11 GiB pool, leaving 1.75 GiB: insufficient for a 3.5 GiB exclusive reservation. No attempt was made to park Datomic; only the orchestrator may do that.

## Still required on an exclusive slot

After repairing F1-R3 and independently rerunning this delta, preserve existing first failures and complete the prior qualification backlog:

1. Acquire XTDB through `engine.mjs` under the verifier's own holder when the pool admits it; record current disk/ownership and actual release/cleanup.
2. Strict pure-XTQL candidate G2, **all 142 executions**, plus the matched SQL packet. Independently establish at least **40 logical tasks spanning every builder in both languages at the same fixture receipt position**. Virtual relations and historical partial packets do not satisfy this.
3. Real-engine default **D=8** recursion: eight-edge success, nine-edge typed refusal with no truncated answer, across applicable membership/resource, container, recall, dependency/vulnerability and support closures.
4. **5,050 edges / 125,000 length-three walks / 150 reachable nodes**, NULL-bearing 09/12/13/18/reachability controls and relevant plans. Edge-count refusal alone does not establish the optimizer's build-side bound.
5. Finish the **seven incomplete writer controls**: SQL workflow; lineage in both languages; support count in both languages; XTQL price; XTQL closure. Compare original pinned and fresh post-write answers. Interleaving within SQL scratch recursion requires a hook inside its rounds; distinguish Fail, Die and recovery.

Q58a's broader native basis/token contract remains separate and unimplemented in this target. No fresh G1, full G2, complete writer suite, performance/golden-scenario qualification, root-wide check, pack check, PostgreSQL/FoundationDB suite or combined X02+C8 verification was performed. No product fix, agent spawn, main-checkout edit, merge, push, deployment or publication occurred. **The remaining blocking delta finding is F1-R3.**
