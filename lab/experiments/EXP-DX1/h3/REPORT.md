# DX-H3 — in-VM north-star driver

North star: measure P1–P5 under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, and `lab/TARGETS.md`. PROTOCOL 0b spike; diagnostic numbers only. No acceptance promotion or independent review.

## Current status

Steps 1–4 implemented. Functional attempts f3 and f5 reached DONE through all 17 phases. The final medium attempt `tx2-dxh3-m5` produced a complete report with 17 phases and all 48 bars, status ERROR because its feed repeatedly failed at checkpoint 488 of 3013. O-REPLAY passes: 24 sampled worlds, 1804 entity queries, zero mismatches, receipt consistency PASS. The client was not saturated by the driver rule. There were 85 model violations and 94 read errors among 419965 reads; none is treated as goodput. The complete medium tables are in [MEDIUM-TABLES.md](MEDIUM-TABLES.md). Real size remains pending.

The seven medium P3 bar predicates marked MET do not establish P3: 2525 positions were unreached and the run is explicitly invalid. No promotion is claimed. All medium resources were removed before its lease was released.

## Implementation

- `stack/up.sh --no-publish` publishes no gateway ports and checks health over its Docker network with the already-local Node image. Heap/container/cache settings are configurable by `DX_*` environment variables.
- `stack/run-in-vm.sh` runs the supplied command in local `node:22.23.2-bookworm-slim` on the stack network, default CPUs 6/7 and 3 GiB memory, with the same worktree/evidence paths. It refuses a stack with published gateway ports. No workload requests cross the host SSH port forwarder.
- `TX2_ENGINE_CGROUPS` maps exact inspected container IDs to host cgroup directories, mounted read-only. `cpu.stat/usage_usec` deltas and `memory.current` supply per-container and summed samples. The client has no Docker socket. Datomic maintenance still uses completed index jobs; VM log collection is labelled unavailable in the driver (the host wrapper retains raw logs after measurement).
- The named `<prefix>-driver` Docker volume is mounted both at `/driver` and the lexical worktree path `runs/DX-H3-vm`. All driver files, including both SQLite databases, are on the VM disk. `docker cp` copies the full directory even after a command failure; a copy failure retains the container and volume.
- Publication responses bind the operation ID and final position to submitted position plus validated integer delta. The callback publishes the final position. Driver commit maps, model, ACKs, lost-ACK resolution, RYOW and oracle commands already use `receipt.position`; those paths were inspected and retained.
- A further measured harness race required a bounded wait for the actual producer witness: a feed response can precede the writer response. Datomic waits at most five seconds, then runs the original strict publication validation. Missing witnesses still fail. This wait is included in measured durable-feed lag; no timestamp is inferred from ACK or poll.
- Python is absent from the local Node image. The offline file bridge runs the exact extracted Python O-REPLAY on the host after the measured workload. It copies exact input/output bytes, binds a fresh UUID plus input SHA-256 and output SHA-256, propagates the Python exit status, and leaves the existing sample-comparison code unchanged. This is offline oracle execution, not host load generation.

## Reproduction

No downloads were performed. Dependencies:

```sh
pnpm install --offline --frozen-lockfile --store-dir /Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/heavy.mjs --label DX-H3-build -- node_modules/.bin/turbo run build \
  --filter=@triplex-build/triplex-datomic... --filter=@triplex-build/triplex-qualification... \
  --filter=@triplex-build/w0... --filter=@triplex-build/triplex-host... \
  --filter=@triplex-build/triplex-xtdb... --filter=@triplex-build/triplex-qlever...
```

The actual oracle archive was extracted from `exp/O01-replay-oracle` with `git archive --format=tar ... lab/oracles/replay`, then `tar -xf` to `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle`. The archive itself is retained.

Final functional command (its stack used CPU 6 throughout; transactor Xmx1g, gateways Xmx768m):

```sh
node lab/bin/heavy.mjs --label DX-H3-functional3 -- \
  bash lab/experiments/EXP-DX1/h3/attempt.sh functional tx2-dxh3-f3 \
  --subjects 400 --level-s 10 --max-readers 16 --sweep-max 400 --history-sample 50
```

The wrapper supplies `--lane datomic --composition reach --profile smoke --reader-threads 2 --oracle-root .../DX-H3/oracle --output runs/DX-H3-vm/ns-report.json`. Requested history sample 50 is capped by the driver at 40 for 400 subjects.

```sh
node lab/bin/heavy.mjs --label DX-H3-medium1 -- \
  bash lab/experiments/EXP-DX1/h3/attempt.sh medium tx2-dxh3-m1 \
  --subjects 2000 --level-s 20 --max-readers 256 --sweep-max 2000 --history-sample 200
# Real-size command will be recorded after admission.
```

The measurement configuration pins Postgres to CPU 0, transactor 0/1, write gateway 2, read gateway 3/4, and client 6/7. Five distinct engine cores count in the quota denominator. The wrapper owns the measurement lock for stack creation, execution, copy-out and cleanup. It releases only after empty resource readbacks. It checks host free disk >=5 GiB and estimates VM free memory from the summed Docker `MemUsage` column against 20 GiB, requiring >=8 GiB before stack creation. Real size may hold the lock throughout, as explicitly authorized by the task. `s3/REPORT.md` was absent on this branch; no configuration recommendation was adopted from another worktree.

## Validation and retained first failures

- Offline package builds: 10/10 successful; no package source edits.
- Linux arm64 imports of the actual driver dependencies (`triplex.ts`, `feed.ts`) succeeded. Node v22.23.2 supports native TypeScript stripping and `node:sqlite`. `find node_modules -name '*.node'` found macOS-only tooling, FoundationDB, DuckDB and better-sqlite3 addons, but none is imported by this Datomic driver path. Native Node SQLite supplies the consumer/publication store.
- VM unit suite: 15/15 passed, including shifted final positions, response-ID mismatch, incorrect delta, delayed witness, absent witness, reach basis behavior, durable feed restart/crash checks and latency arithmetic.
- The equivalent Mac suite had two sandbox `sysctl kern.bootsessionuuid` refusals; a Linux test on overlay storage correctly refused durable flush. Re-running on a named Docker disk volume passed. Those failures are retained in evidence.
- Broad bench TypeScript check remains failing on existing `audit-traffic.ts`, `hs01-seed.ts`, `round2.ts` and other unrelated diagnostics. No diagnostic names a changed driver/feed/oracle/publication/test file. Full root `pnpm check` and pack checks were not run.
- `f1`: macOS Bash 3 rejected the empty published-port array under nounset. Fixed; its partial stack was removed before retry.
- `f2`: feed-before-response exposed `Missing source publication instant`. The known-invalid attempt was stopped; raw output was copied before its stack/volume removal.
- `f3`: driver DONE with 215,654 reads, 215,636 correct, 18 model violations, zero read errors, 235 engine samples. The pre-bridge process recorded ORACLE-ERROR (`python3 ENOENT`); this is not an oracle pass. All three crash points fired, and the final feed checkpoint was 1379/1379. The small CPU-6 stack accumulated a writer backlog during the burst; it drained to zero. Source edits to the shell runner while Bash had it open caused a trailing parse error after report copy-out; cleanup nevertheless completed. Measurement runs freeze the scripts before launch.

## Observation-to-verdict audit

1. `lab/bench/lib/datomic-publication.ts`: validates exact tagged integer bytes, safe final/submitted/delta arithmetic and returned operation ID before creating the witness; the live callback uses this attempt's fresh scope and sidecar. A shifted ACK is observed at its final position, never the provisional one.
2. `lab/bench/test/datomic-publication.test.ts`: fresh fixture class, explicit expected callback position/ID/order, wrong-delta and wrong-ID refusals. Installation is idempotent. These are fixture results, not engine acceptance.
3. `lab/bench/test/feed-witness.test.ts`: fresh directory, real bound clock and SQLite sidecar; delayed publication must yield a durable checkpoint and lag sample; absent publication must throw and leave checkpoint/durableWrites at zero. The test uses an actual disk volume in Linux.
4. `lab/bench/driver.ts`: existing content model, correctness counters, frozen trace, bars and oracle comparisons retained; diagnostic DONE does not mean bars pass. Cgroup samples bind exact container IDs and contemporaneous counters; missing counters are errors, not fabricated zeroes. CPU is observation, not causal proof.
5. `lab/bench/lib/feed.ts`: waits only for the bound producer-owned record from the same attempt, then retains all original source/key/domain/digest validation. No missing witness is accepted and no publication instant is manufactured.
6. `lab/bench/lib/oracle.ts` and `h3/oracle-bridge.mjs`: exact extracted Python CLI, exact case bytes and returned bytes, fresh UUID, request/response input digest, output digest, and actual process exit code. Existing per-entity sampled-world equality decides the oracle result; the bridge never emits PASS.
7. `h3/summarize.py`: displays saved bar verdicts unchanged, computes threshold distances arithmetically, and labels missing values unavailable. It does not promote smoke observations or relabel mismatches.
8. `stack/up.sh` and `h3/attempt.sh`: health source hash and Postgres durability settings compare actual readbacks; owned container IDs/cpusets/memory plus source/build hashes are retained. Cleanup accepts only empty current resource inventories and preserves the lock on incomplete cleanup. Functional f3 used the earlier runner before the added manifest/bridge; it is labelled accordingly.

## Contract and ownership

`lab/acceptance/` is unchanged. No package source, `w0-public.ts`, or Datomic runtime-construction lines in `triplex.ts` were edited. No merge, push, publish, deployment, download, Colima command, unrelated-container action, or forbidden-port access was performed. Changed existing files and old/new SHA-256 will be listed in `HASH-CHANGES.json`; no matching changed file was found among acceptance file pins. The contract was not re-pinned.

## Additional retained findings during harness completion

- `f4` completed final reporting with ERROR when the initial 30-second poll deadline fired. This proves a stalled source poll now produces a report and closes its runtime. The regression checks unchanged checkpoint/zero durable writes on timeout. Final timeout is 120 seconds, matching the existing final feed catch-up budget; this still rejects an indefinite stall and changes no content/lag bar.
- `f5` reached DONE with the 120-second budget; its final checkpoint reached the acknowledged head. O-REPLAY executed through the host bridge and correctly rejected the incomplete retained case. The failing command retracted an assertion belonging to a non-read-sample member of a retained atomic history batch; its seed command had been omitted.
- The oracle input fix records seed/trace/history commands for the union of read-sample and history subjects, including late growth receipts. `buildCase` now rejects any retained retraction without a retained parent assertion. Its missing-parent regression passes. No oracle check, command operation, receipt, or sampled answer was removed to obtain a result. Medium and real-size native validation of this fix are pending.
- Queued medium names `m2` and `m3` were cancelled before owning a lock or creating any Docker resource, so replacements could bind the finalized timeout and oracle-input correction. Their preflight files remain.

- `m4` finished its phases but never finalized because each failed source call completed before its individual deadline and was retried forever. It was stopped and cleaned up within its lease. A regression now bounds consecutive failed calls as well as individual stalls, records poll-error counts and retains the first errors. The medium retry m5 produced the first complete medium report and an independent O-REPLAY PASS after fixing the input ancestry.
- Real-size logging additionally retains nested error causes (bounded to 6000 characters); its cause-retention regression passed 4/4 feed tests. Medium retains only the generic source ReadError, so its underlying transport cause remains unknown.

## Remaining work

Real-size execution/tables, final evidence manifest, final cleanup readbacks, and concrete blocker line references remain pending. This is an interim status, not completion.
