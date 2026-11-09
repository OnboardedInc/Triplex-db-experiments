# EXP-K01 live attempt — stopped at first failure

Builder CX-K01-R2. Tested head **e5257600fb41f393d13f3a22eae110d5601a92f3**, branch exp/K01-seed-clone. Run `runs/xtdb-seed/k01-r10-20261109T034627Z`, holder `CX-K01-R10-live`. North star: exact reusable seed contents supporting P1–P5; correctness floor before seed-reuse timing. Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md and Q93a–c. No acceptance or implementation files changed.

**Result: STOPPED AT FIRST FAILURE.** Ran the admission and native-wire commands from LIVE-round10.md exactly, with stderr also retained for admission. The handoff orders the scratch native probe before the source seed. s1 was admitted and ready with a 3.50 GiB cap, two CPUs, configuration prefix `13f5a70b3665`. Engine startup identifies **XTDB 2.2.0 [c6c1962]**. The first native probe exited **1**. No retry, repaired probe, seed, freeze, golden publication, two-start qualification or E1 comparison followed.

## Exact first failure

After the four monomorphic numeric smoke checks, the probe inserted a mixed INTEGER/BIGINT scratch column, read its count as 2 and read `information_schema.columns.xt_type`. The next assertion expected the type to contain `:union`. The actual engine rendered it as an EDN set:

```text
AssertionError [ERR_ASSERTION]: The input did not match the regular expression /:union/. Input:

'#{:i32 :i64}'

    at file:///Users/sam/projects/triplex-db-2/.claude/worktrees/k01/[eval1]:39:10
...
  actual: '#{:i32 :i64}',
  expected: /:union/,
  operator: 'match',
```

This is a failed assumption in the live probe's expected catalog spelling. It is not evidence that the production G0 accepts a widened union: execution stopped **before** `assert.rejects` called the production reader on this mixed column. The result does not qualify mixed-type refusal either. No code or expected value was changed and no second attempt was made.

The four completed smoke cases observed `:i32`, `:i64`, `:f32`, `:f64`, respectively, through the real catalog and production raw reader; each returned one scalar. Their canonical frames retain native type tags, OIDs and wire text, and the probe's integer-width and float-width frame inequality assertions completed before the first failure. The raw canonical witnesses are in `wire.log`. These probes use the value 1; they do not establish every representation or value kind. The mixed float check and all remaining value-kind checks were not reached.

## Requested steps and limits

| Step | Outcome |
| --- | --- |
| Exclusive s1 admission through engine.mjs | Completed; owner preimage retained |
| Real I32/I64/F32/F64 scalar smoke checks | Completed for value 1; exact observations retained |
| Mixed integer native-wire check | Failed at catalog-format assertion; production union refusal assertion not run |
| Mixed float and every other native value kind | Not run: first-failure stop |
| Seed golden source / pin D and Dprime before freeze | Not run |
| Freeze / golden stopped copy | Not run |
| Two starts reproducing D and L / Q93b publication | Not run; no golden exists from this attempt |
| E1 fresh-seed comparison against golden Dprime / Q93c | Not run |
| Golden / clone timings | Unavailable; neither operation ran |
| Cleanup | Completed; owned container and volume removed, slot reservation released |

## Evidence and cleanup

Committed evidence index: [evidence/live-round10/INDEX.md](evidence/live-round10/INDEX.md). `invocation.json` records the tested head, exact probe command and hashes of the runtime modules, handoff, built entrypoints and shared slot config. `wire-command.sh` is the extracted handoff command actually executed. `wire.log` preserves the observations and unhandled first failure. `engine-up.log`, `engine.env`, `owner-before-cleanup.json` and `engine.log` preserve the admitted slot and engine startup. `receipt.json` records actual exits and all unrun steps. `SHA256SUMS` covers the evidence files. The evidence is about 15 KB, below both bulky-evidence thresholds; no external spill was necessary. These are observations from one attempted run, not an acceptance receipt.

After preserving failure/engine output, cleanup ran once:

```sh
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R10-live --remove-volume
```

It exited 0 and reported:

```text
[lab] tx2-xtdb-s1 removed; volume tx2-xtdb-s1-data removed; reservation and slot lock released
```

The shared slot lock was absent afterward and the pool ledger contained no matching holder/container reservation or retained volume. No volume is kept; no golden was created or published. No shared resident was stopped or recreated. Host disk was above the 5 GiB floor before admission and was **14,837,051,392 bytes free** after cleanup. Heavy execution used the exact `CX-K01-R10-wire` heavy.mjs wrapper. No writes were made in the main checkout beyond the authorized shared engine/lock machinery.

## PASS / verdict / receipt audit

* **Native probe assertions:** content is the real queried catalog, counts and production raw scalar frames; freshness comes from writes and reads in this single admitted attempt with deadlines; binding comes from the guarded s1 owner path, exact holder and acquired endpoint. They establish only the four recorded smoke observations. The mixed-type assertion failed and no successful native-fidelity receipt was emitted.
* **G0 admission, Dprime and golden publication:** none was invoked or granted. No historical PASS was adopted. No D, Dprime or L was inferred from the smoke checks.
* **Attempt receipt:** records failure rather than PASS. Content is the preserved actual stdout/stderr and exit statuses; freshness is this unique run path; binding is the tested head/source hashes, commands, owner preimage and endpoint. Evidence checksums were verified before commit.
* **Cleanup observation:** refusal/operational diagnostic only, never content admission. It binds the current holder's s1 container/volume through engine.mjs; the current command exit/log, absent lock and matching ledger entries were checked. It does not imply seed or clone correctness.

No pinned implementation path changed, so there are no moved pinned hashes to report; lab/acceptance remains untouched. No tests were rerun after this live failure, and the 397 offline passes from round 10 were not counted as live acceptance.

Next work requires a separate, explicit attempt: correct the probe's catalog-format assumption against this actual engine, cover remaining native kinds, then execute the seed/freeze/two-start and fresh-seed E1 steps if each preceding step succeeds. This attempt deliberately leaves all of that unverified, as required by the first-failure rule.
