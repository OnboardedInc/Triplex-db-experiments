# EXP-K01 live rerun — source count refusal

Builder CX-K01-R2. Tested head **b9d1be7952bb4b1f5890588e693ebe764ec33360**, branch exp/K01-seed-clone. Run `runs/xtdb-seed/k01-r11-20261109T052411Z`, holder `CX-K01-R11-live`. North star: exact reusable seed contents supporting P1–P5, with correctness before seed-reuse measurements. Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md and Q93a–c. No implementation or acceptance files changed.

**Result: STOPPED AT FIRST FAILURE.** The exact LIVE-round11.md numeric probe completed, including both production-reader mixed-width refusals. Its scratch slot was removed, and a new source slot was admitted. The exact 500-subject seed command then exited **1** while attempting the pre-freeze source content pin: **`G0 count mismatch: tx_assertions`**. No retry or changed expectation. No freeze, golden creation/publication, clone starts, E1 or further value-kind checks ran.

## Exact first failure

Command:

```sh
node lab/bin/heavy.mjs --label CX-K01-R11-seed -- node lab/bench/xtdb-seed.ts --subjects 500 --seed ns-v2 --seed-batch-facts 400 --out runs/xtdb-seed/k01-r11-20261109T052411Z/seed
```

Recorded command interval: **2026-11-09T05:25:05Z–05:25:55Z**, exit 1. Seed log:

```text
[xtdb-seed 05:25:07] seeding 500 subjects (20 accounts) into scope ns-xtdb-dev500-seed-ns-v2-0604cd31 at postgres://xtdb:xtdb@127.0.0.1:5471/xtdb through composition public
[xtdb-seed 05:25:21] seed: 20 shared account worlds in 14.5 s
[xtdb-seed 05:25:55] seed: 500 subjects in 47.8 s
file:///Users/sam/projects/triplex-db-2/.claude/worktrees/k01/lab/bench/lib/g0.ts:110
        throw Error("G0 count mismatch: " + table);
              ^

Error: G0 count mismatch: tx_assertions
```

The preserved full stack runs through readContent/bounded, readE1G0 (`g0.ts:162`), pinXtdb (`g0-xtdb.ts:107`) and the pre-manifest call in xtdb-seed.ts:120. The gate did not produce a source D/Dprime pin, and `seed/manifest.json` was not written. The 47.8 s is the seeder's logged write-loop duration, not a qualified golden or clone time. The error does not log actual or expected counts. Their values and the cause of the disagreement are **unestablished**; no post-failure semantic query or G0 rerun was used to replace the first result.

## Native observations and requested stages

Both s1 admissions reported healthy pgwire, cap **3.50 GiB**, **2 CPUs**, config prefix `13f5a70b3665`. Engine logs identify **XTDB 2.2.0 [c6c1962]**. Endpoint: port 5471, acquired through engine.mjs; no shared resident was changed.

The native probe exited 0. Four monomorphic tables returned the expected `:i32`, `:i64`, `:f32`, `:f64` catalog tags and production-reader canonical frames for value 1; integer-width and float-width frame inequality assertions completed. The mixed integer catalog was **`#{:i32 :i64}`** and the mixed float catalog was **`#{:f64 :f32}`**. The new complete-set comparison handled the reversed float order. For each mixed column, the production raw reader refused with the required native-type/OID error pattern, and the probe logged `refusedAmbiguousUnion: true`.

These are six narrow smoke cases, not full value-kind or representation coverage. They neither produce a seed G0 PASS nor establish byte fidelity for all stored values.

| Requested stage | Actual outcome |
| --- | --- |
| Native numeric smoke / mixed-width refusal | Completed on the real engine, exit 0 |
| Source seed | Logged 500 subjects in 47.8 s; subsequent content pin refused |
| Pin D before freeze | Failed on tx_assertions count; no pin/manifest published |
| Freeze / golden copy | Not run |
| Q93b two clone starts reproducing D and L | Not run; no golden published |
| Q93c E1 fresh-seed Dprime comparison | Not run |
| Every native value kind / remaining representations | Not run: stopped at first failure |
| Golden and clone times | Unavailable |
| Cleanup | Both owned slot incarnations removed and reservations released |

## Evidence and cleanup

[evidence/live-round11/INDEX.md](evidence/live-round11/INDEX.md) indexes the immutable evidence. `invocation.json` binds the tested head, handoff, runtime sources, built entrypoints, shared slot-config bytes, endpoint run and exact probe command. `wire-command.sh` is the extracted command actually executed. `wire.log` retains complete native observations. `seed.log` preserves the first refusal and full stack; seed start/end/exit files retain terminal status. Owner preimages, both admission outputs, engine logs and cleanup outputs are committed. `receipt.json` lists actual exits and every unrun step. SHA256SUMS covers the evidence, and the recorded runtime hashes were rechecked unchanged after the attempt.

The evidence directory is about **23 KB**, with no file above 1 MB and no raw output directory above 5 MB, so external spill was unnecessary. Original round-10 and offline round-11 artifacts were not overwritten.

The probe's initial scratch volume was removed before starting the fresh source arm. After the seed refusal, only owner/log capture and cleanup followed:

```sh
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R11-live --remove-volume
```

Both cleanup invocations exited 0 and reported:

```text
[lab] tx2-xtdb-s1 removed; volume tx2-xtdb-s1-data removed; reservation and slot lock released
```

The final slot lock was absent and the pool ledger contained no matching holder/container reservation or retained volume. The same managed slot/volume name was used for two fresh incarnations; both were removed by the current holder. **No volume is kept and no golden exists from this attempt.** Disk was above the 5 GiB floor before heavy work and **8,331,243,520 bytes free** after cleanup. No Datomic, XTDB-dev or QLever-dev lifecycle command was issued.

## PASS / verdict / receipt audit

* **Numeric probe assertions:** content is the actual native catalog/counts and production raw frames, plus specific mixed-type refusal assertions; freshness comes from writes/reads in this new scratch incarnation with deadlines; binding is the guarded s1 owner path, exact holder and acquired endpoint. They establish only the recorded smoke observations. No standalone seed-admission PASS was emitted.
* **Source G0 / Dprime pin:** content count validation refused during the new source read before producing D/Dprime or a manifest. The new attempt was bound to its seed scope, generator inputs and acquired source endpoint. No earlier digest or PASS substituted for it.
* **Golden publication / E1:** neither was invoked, granted or inferred. No copy/layout/health/process observation was adopted as content admission.
* **Attempt receipt:** records failure rather than PASS. It binds this unique run/head/source hashes, actual commands/exits, preserved log bytes and owner preimages. Current-source and evidence hashes were verified before commit; unrun steps are explicit.
* **Cleanup:** operational observation only, never content admission. The exact current holder's commands/logs and the resulting absent lock/ledger reservation were checked. Cleanup does not qualify the seed or clone.

No implementation or pinned path changed, so no moved pinned hashes need re-pinning; lab/acceptance remains untouched. No offline suite was rerun or counted as live acceptance in this attempt.

Next investigation must establish the source count disagreement before a separate scheduled attempt. Native fidelity beyond the six smoke cases, completed source pinning, freeze, golden two-start D/L reproduction, E1 and P5 integration remain unverified. No failure was repaired or retried within this run.
