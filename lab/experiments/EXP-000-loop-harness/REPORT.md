# EXP-000 loop harness: report

**Result class: PROGRESSED.** The harness is built, committed and unit-tested. G0 PASSes for both lanes. Both dev engines are healthy and stay running. G1 and G2 smoke runs are PASS_SUBSET for both lanes. Full G1 and G2 baselines for both lanes were still running when this report was written (see "In flight").

## Commands

| Task | Command |
| --- | --- |
| Engine up | `node lab/bin/engine.mjs up --lane xtdb\|qlever --slot dev\|s1\|s2\|s3 [--fresh] [--exp EXP-NNN] [--holder NAME]` (prints `XTDB_URL`/`QLEVER_URL`, `*_INTEGRATION=1`, `TRIPLEX_LAB_SLOT_OWNER`) |
| Engine down | `engine.mjs down ... [--remove-volume] [--note TEXT]` (releases only after the container is proven gone) |
| Status and logs | `engine.mjs status` / `engine.mjs logs --lane L --slot S` |
| Gate | `node lab/bin/gate.mjs G0\|G1\|G2 --lane L [--slot dev] [--run-kind acceptance\|candidate\|smoke\|...] [--cases N] [--workloads 01,02] [--exp] [--note] [--previous RUN-ID]` |
| Heavy lock | `node lab/bin/heavy.mjs -- <cmd...>` (at most 4 across agents) |
| Scorecard | `node lab/bin/scorecard.mjs [--ref main] [--dry-run]` (reads receipts committed on main only) |
| Contract status | `node lab/bin/status.mjs [--ref main] [--json]` (V1-V16 + CR-PASS-ALL for G1.found.unchanged44 and PKT.full142) |
| Unit tests | `node --test lab/bin/test/lab.test.mjs` (15 pass; a bare directory argument fails under Node 22) |

## Receipts (uncommitted, for the orchestrator to commit)

| Gate | Lane | Verdict | Receipt |
| --- | --- | --- | --- |
| G0 | xtdb | PASS: 911 pass, 130 expected skips | lab/runs/G0/G0-xtdb-20261107T184240Z-f3ec5a.json (earlier: ...183254Z-4b88b5, ...183443Z-a40347) |
| G0 | qlever | PASS: 916 pass, 67 expected skips | lab/runs/G0/G0-qlever-20261107T184305Z-5edbe5.json (earlier: ...183510Z-93668c) |
| G1 smoke (1 case x 2 modes) | xtdb, qlever | PASS_SUBSET 2/2 | lab/runs/G1/G1-xtdb-20261107T185552Z-2f76c8.json, lab/runs/G1/G1-qlever-20261107T185609Z-1ad93d.json |
| G2 smoke (workload 01, 8 executions) | xtdb, qlever | PASS_SUBSET 8/8 | lab/runs/G2/G2-xtdb-20261107T185653Z-db1b4e.json, lab/runs/G2/G2-qlever-20261107T185705Z-b4dfae.json |

**Full baselines (runKind `candidate`), first results:**

| Gate | Lane | Verdict | Receipt and note |
| --- | --- | --- | --- |
| G1 full | xtdb | FAIL (88/88 executions and the complete suite all PASS) | lab/runs/G1/G1-xtdb-20261107T185736Z-a667aa.json. **The FAIL is the harness working as designed:** the concurrent qlever gate rebuilt the shared dist/ during the run, and the run-end re-hash caught it. Fixed by the per-worktree gate lock (commit de3647a). Rerun it. |
| G1 full | qlever | FAIL 0/88 | lab/runs/G1/G1-qlever-20261107T185736Z-ea0be5.json. **tx2-qlever-dev was OOM-killed at its 2.5 GiB cap** on the first case (the default planner, without the F1 profile; R4 9.4.2). After a restart it is healthy again, and a 1-case smoke passes: lab/runs/G1/G1-qlever-20261107T185951Z-77d806.json. EXP-002 should size the slot or apply the F1 profile. |
| G2 full | xtdb | PASS 142/142 | lab/runs/G2/G2-xtdb-20261107T185821Z-210ae9.json. Claims PKT.full142 for xtdb-xtql and xtdb-sql, but runKind is candidate, so it closes nothing. **Language split (answer reading):** xtql 22, xtdb-sql 116, hybrid 4. **Strict reading:** xtdb-sql 116, hybrid 26, xtql 0. |
| G2 full | qlever | no receipt | **A harness bug wrote no receipt.** The engine was already dead, and engineGate returned the wrong shape. The raw dir runs/G2/G2-qlever-20261107T185817Z-d28cd4 remains. Fixed in de3647a. Rerun it. |

## Design as built

- **Slots** are in `lab/config/slots.json`. XTDB dev 5470 (3 GiB, 2 CPU, -Xmx1500m, 1g direct memory); s1-s3 5471-5473 (3.5 GiB). QLever dev 7070 (2.5 GiB, -m 1500M); s1-s3 7071-7073 (3.5 GiB, -m 2500M). Images are pinned by digest. Containers are `tx2-<lane>-<slot>` with named volumes `-data`. The effective config (the unchanged xtdb-config.yaml, and qlever-start.sh with only the slot's `-m` value changed) is written to `runs/engines/<lane>-<slot>/`, and its hash is put on the container as a label. Engine config hash: XTDB dev `034fff17...`, QLever dev `e070b049...`.
- **Pool:** `lab/locks/pool.json` is only read-modify-written under the `lab/locks/pool.lock` mkdir lock. A lock whose owner pid is dead is broken. Running `tx2-*` containers that are not in the ledger (research probes) are counted from their `docker inspect` caps. An uncapped container counts as the whole VM. Limits are 11 GiB of memory and 50 GiB of VM disk used plus the disk forecasts (4 GiB per dev slot, 8 GiB per s* slot). Disk is measured with `df` in a throwaway container from the pinned image, so nothing is pulled. Events go to `lab/locks/events.jsonl`.
- **Locks are shared across worktrees.** They live in the main checkout (`git --git-common-dir`). Receipts and raw output live in the worktree that ran the gate.
- **Receipts:** `lab/runs/<gate>/<run-id>.json` is written create-only with mode 0444. Each receipt records:
  - source identity: HEAD, the tree, a `git stash create` tree, sha256 of the diff over the source roots, untracked and modified inputs with their hashes, and `sourceTreeId`;
  - the lockfile hash, Node 22.23.2 and pnpm 10.11.0;
  - a per-file dist manifest, built in the same run and re-hashed after it (FAIL if it changed);
  - hashes of the gate, entry, oracle and fixture files;
  - the engine image id and repo digest, the config hash, the endpoint the run actually contacted, and whether the container restarted during the run;
  - peak memory and CPU per co-running container, volume bytes, and VM disk before and after;
  - first failures;
  - the contract version and `obligations.json` sha256, the claimed obligations with their `definitionSha256`, `runKind`, the mutation id and patch;
  - per-case `{caseId, mode, status, oracleId, rawResultSha256, languages[]}`.
- **Object store:** preimages go to `runs/objects/<sha256>`. Names that look like secrets, `node_modules` and `.pnpm-store` are refused.
- **Fail-closed rules:**
  - A skip in G0 that is not in `lab/config/g0-expected-skips.json` fails the gate. The file is a reviewed list of 151 live and DuckDB tests.
  - Zero executions, a missing identity field, a wrong endpoint, any UNSUPPORTED case or any skip in G1/G2 is a FAIL.
  - Subsets are PASS_SUBSET and claim no obligation.
  - `runKind` defaults to `diagnostic`, and an `acceptance` run cannot select a subset.
- **G1** runs through the new `packages/qualification/workloads/lab-conformance.ts`: the complete unchanged suite, then each case in a "current" runtime opening and again in a fresh "reopen" opening (88 executions), all over built dist.
  - **"Reopen" here means a second independent runtime initialization.** The 44 cases write and read inside one program, so a read-after-reopen of the same scope cannot be expressed without editing them.
  - **No native-path variant of the 44 exists.** The native query paths share the foundation runtime.
- **G2** runs `runner.ts` through the new `TRIPLEX_LAB_SLOT_OWNER` admission. The homebase branches are kept.

## Repo fixes

- Qualification vitest now collects only `test/**/*.test.ts`. The node:test files run via `test:node`.
- The DuckDB loader case is opt-in with `TRIPLEX_DUCKDB=1`.
- `qualification/adapter/scale-fixture.mjs` was restored as a byte-identical copy from `vendor/` (its sha matches the source manifest).
- The QLever experiment entries read `QLEVER_URL` and an optional token (`lab-endpoint.ts`). `native-entry.ts` accepts the lab admission. `verify-xtdb-entry.ts` reads `XTDB_URL`.

## Findings later experiments must know

1. **Under the strict reading, XTQL purity can never hold today.** Every XTDB native query, XTQL included, first runs a SQL `source-cut` position lookup (packages/xtdb/src/native/NativeQueries.ts). V11 asks that "every read substep is the lane's language". The G2 smoke shows `answer: xtql 8`, `strict: hybrid 8`. Receipts carry both readings. The contract or the provider must decide whether a basis-resolution metadata read counts.
2. **Docker undoes a chown on an empty named volume.** It copies the mount point's ownership onto the empty volume when the container is created. The QLever image runs as uid 999, so the engine writes a marker file into the volume before the chown.
3. **R7's healthcheck is broken.** Its probe uses `wget --spider` (HEAD), which XTDB 2.2 answers with 405, so the probe shows unhealthy. Our healthcheck uses GET.
4. **The `runKind` vocabulary differs between ACCEPTANCE.md 3 and the orchestrator message.** The harness accepts the union of both lists, and only `acceptance` closes anything.
5. **Research probes filled the pool for about 20 minutes.** At one point they held 10.5 GiB of memory, and their data pushed VM disk use to 47 GiB. The dev engines were admitted at 18:54.
6. **Two concurrent gates in one worktree can race on git's index.** `git stash create` printed `error: could not write index`. This needs checking on the full runs.

## Not enforced yet (rules the harness cannot satisfy alone)

- **V7:** the contract pins no file hashes and no oracle is ACCEPTED. Receipts record the hashes; `status.mjs` reports V7 as unenforceable.
- **V9:** the runner itself asserts right after it records `actualRows`. The gate hashes the raw output only afterwards.
- **V13 and V16** are checked by `status.mjs`, not by the gate.
- **Mutation runs** record the patch but do not apply it.
- **No gate produces receipts for the other 86 obligations yet.**

## Still manual

- Committing receipts (orchestrator).
- Recovering a stale slot lock by hand (`lab/locks/<lane>-<slot>/` without owner.json).
- Pruning volumes that were retained on `down`.
- `pnpm install` in each new worktree.
- The homebase-bound scripts `string-order-probe.ts` and `packages/qualification/experiments/qlever-*.ts`.
