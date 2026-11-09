# EXP-J01 round 2 — CX-J01-R2

North star: **P2**, fewer bytes per small atomic commit, with default-off compatibility as a
correctness floor. Scope and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.

Base: `5cc42fb` on `exp/J01-bytes-per-commit`. Findings read from
`verify/J01:lab/verify/J01/VERIFY.md` at `de7045b`; ruling Q81c read from the main checkout's
`lab/acceptance/RULINGS-PENDING.md`. Main-checkout source files were read only.

## F1: explicit compact-only binding

`compactTextArray` creates an internal class descriptor (not re-exported from the package).
Only the two compact guard lists construct it. `XtdbClient` maps that descriptor to OID 1009;
every untagged array, including an empty or all-string array, retains OID 114. Unicode validation
for array members is limited to the descriptor; existing top-level text validation is unchanged.
The descriptor copies its input to avoid subsequent caller mutation. No environment-based type
inference remains in the client.

The differential test uses the actual pre-J01 public client copied verbatim from merge base
`83b384334610043bd29ccc7f2b5f0ba0384361bc` (fixture provenance is in
`packages/xtdb/test/fixtures/README.md`). Both clients use the same instrumented driver. With
`TRIPLEX_COMMIT_ENCODING` unset and explicitly `a0`, it compares complete SQL/bind calls,
OID/value pairs and JSON serialized input bytes for:

- Public `query` and transactional `submit`.
- Both full native providers, `selectSql` and `select`, through their real `context.bind` path.
- Empty, string, numeric, mixed/null, escaped/Unicode and isolated-surrogate-member arrays.

The compact unit tests separately require descriptors at each guard and retain empty-list guard
elision. This is a wire-input regression, not a live native-answer comparison or independent
semantic qualification. No compact-on integration test was enabled on a shared resident.

## F3: correct the JSON-array alternative

The historical `p5-array-param.out` is retained byte-for-byte. Its old key
`json parameter, IN UNNEST` means **double-encoded JSON string control**:
`sql.typed(JSON.stringify(ids), 114)`, serialized again by the pinned driver. The corresponding
probe source now uses that accurate label; it retains the original double-encoding expression.
The original report and source comments no longer claim this rejects JSON-array binding.

`probes/p12-json-array.mjs` tests `sql.typed(ids, 114)` and the double-encoded control for both
`= ANY($2)` and `IN (SELECT x FROM UNNEST($2) AS t (x))`. Each arm covers 24 fresh IDs, one
existing scoped ID among fresh IDs, an ID existing only in another scope, and an empty array.
The source retains full statements, actual serialized JSON parameter bytes, ID lists, error
messages/codes, endpoint, owner bytes/hash, probe and driver serializer hashes. It does not
change compact encoding or remeasure byte savings. New synthetic rows are retained.

Observed on XTDB shared resident `:5470` with an unchanged owner: both correctly bound JSON
forms pass fresh/other-scope/empty and reject existing scoped IDs (8/8 expected outcomes).
The double-encoded string control passes all eight attempts, including both existing-ID cases:
it is an ineffective guard. Correct JSON arrays are therefore a viable alternative in this
focused probe. This does not qualify full compact-on behavior or compare the JSON alternative's
source-log bytes. The explicit text[] descriptor remains the candidate's chosen transport;
this round makes no claim that JSON cannot work.

Evidence: `receipts/round2-json-array.json` (16 actual attempts), with heavy admission log in
`receipts/round2-json-array.log`. The probe completed at `2026-11-08T21:54:44.387Z`.

## F2: deferred exclusive-slot qualification — NOT CLOSED

No G1 was run in this round. All original G1 failures remain. Q81c requires full off/on G1 on
**each** lane with source/build, effective environment and persisted encoding bound. No compact-on
use is qualified by this fix. Do not run these on `dev` or stop/recreate either shared resident.
The orchestrator must first park Datomic if needed; this builder did not park it or acquire a slot.

The following are the exact four gate invocations, each run only after successful reservation
by the matching `engine.mjs up` below. Run sequentially in this worktree, with at least 5 GiB host
disk free and the pinned private Docker host. `gate.mjs` performs source/build binding and keeps
raw reports; `heavy.mjs` accounts for the full engine run. The gate also acquires a heavy token
for its build: leave capacity for that child token; do not fill all four tokens with outer gates.
No dependency install is needed. Its pnpm run calls use the project store through
`npm_config_store_dir`; pnpm 10 rejects `--store-dir` on run/exec, so do not append that flag to
the gate's script calls. Any install must explicitly use `--store-dir /Users/sam/projects/triplex-db-2/.pnpm-store`.

```sh
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-J01-G1 --exp EXP-J01
TRIPLEX_COMMIT_ENCODING=a0 node lab/bin/heavy.mjs --label CX-J01-G1-X-off -- node lab/bin/gate.mjs G1 --lane xtdb --slot s1 --holder CX-J01-G1 --exp EXP-J01 --note 'round2 explicit encoding=a0; retain environment envelope and persisted mode proof'
TRIPLEX_COMMIT_ENCODING=compact node lab/bin/heavy.mjs --label CX-J01-G1-X-on -- node lab/bin/gate.mjs G1 --lane xtdb --slot s1 --holder CX-J01-G1 --exp EXP-J01 --note 'round2 explicit encoding=compact; retain environment envelope and persisted mode proof'
# Capture all persisted-mode evidence BEFORE releasing this engine.
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-J01-G1
node lab/bin/engine.mjs up --lane qlever --slot s1 --holder CX-J01-G1 --exp EXP-J01
TRIPLEX_COMMIT_ENCODING=a0 node lab/bin/heavy.mjs --label CX-J01-G1-Q-off -- node lab/bin/gate.mjs G1 --lane qlever --slot s1 --holder CX-J01-G1 --exp EXP-J01 --profile f1 --planner-budget 1 --note 'round2 explicit encoding=a0; retain environment envelope and persisted mode proof'
TRIPLEX_COMMIT_ENCODING=compact node lab/bin/heavy.mjs --label CX-J01-G1-Q-on -- node lab/bin/gate.mjs G1 --lane qlever --slot s1 --holder CX-J01-G1 --exp EXP-J01 --profile f1 --planner-budget 1 --note 'round2 explicit encoding=compact; retain environment envelope and persisted mode proof'
# Capture all persisted-mode evidence BEFORE releasing this engine.
node lab/bin/engine.mjs down --lane qlever --slot s1 --holder CX-J01-G1
```

These commands are an execution recipe, **not receipts or authorization to ignore admission**.
If a gate fails, retain it, capture its mode evidence and report the failure before a new attempt;
do not run the next mode automatically to obscure it. Always release only the owned reservation,
retaining its volume. Do not use `--fresh`, `--force` or `--remove-volume` in this recipe.

For EACH generated gate run ID retain:

1. The unmodified `lab/runs/G1/<RUN-ID>.json`, its raw directory, and every referenced object.
   Require 88/88 case executions and the complete suite PASS, not just exit zero.
2. A separate execution envelope written at launch with the exact argv, explicit
   `TRIPLEX_COMMIT_ENCODING` value passed to the child, commit, dirty-tree manifest, lockfile and
   built JS/declaration hashes, slot owner/container ID/image/config, timestamps and exit code.
   Hash the envelope, gate receipt and raw G1 report together. Existing gate receipts alone do
   **not** bind the encoding environment. Do not claim a note string proves child environment.
3. Before releasing the slot, run the following for the actual raw report path printed in the
   receipt (substitute its generated ID, not a historical report), through `heavy.mjs`:

```sh
node lab/bin/heavy.mjs --label CX-J01-G1-X-mode -- node lab/experiments/EXP-J01-bytes-per-commit/probes/p9-g1-mode-proof.mjs runs/G1/<RUN-ID>/g1-report.json --lane xtdb
node lab/bin/heavy.mjs --label CX-J01-G1-Q-mode -- node lab/experiments/EXP-J01-bytes-per-commit/probes/p9-g1-mode-proof.mjs runs/G1/<RUN-ID>/g1-report.json --lane qlever
```

Use the receipt's actual `rawDir` and generated run ID. Save
stdout/stderr, hashes and exit codes. P9 is only a **sampled** XTDB mode diagnostic and a QLever
channel count. Its inferred label alone is insufficient: retain actual source-log records with
scope/transaction mapping for both XTDB guard spellings, or raw scoped RDF rows/channels for
QLever, and verify the selected encoding and absence of the opposite form for each exercised
scope. Empty/no-write scopes need an explicit no-write status. Zero evidence, missing scopes,
mixed encoding or owner/config changes leave mode unqualified. This raw persisted evidence must
be collected before cleanup and linked to the launch envelope. Independent review must rerun
and adjudicate these gates; this builder does not promote its own branch.


## Builder validation and handoff

- `receipts/round2-check.log`: XTDB source typecheck PASS, then 3 focused test files PASS,
  12 tests passed and 3 live compact tests skipped. Both native provider routes are exercised
  in the final differential test. `round2-unit.log` retains the earlier context-level test pass.
- `receipts/round2-lint.log`: zero errors; two pre-existing warnings (unassigned timeout and
  constant retry-loop condition). `receipts/round2-format.log`: changed TypeScript files PASS.
- `receipts/round2-build.log`: package JS and declaration build PASS (exit 0).
- The baseline fixture hash is `fa5c31c44c45e9e129d65464ee2f012146911f5b11d433d1ce7d73aadee6c67c`,
  identical to `git show 83b384334610043bd29ccc7f2b5f0ba0384361bc:packages/xtdb/src/XtdbClient.ts`.
- `receipts/round2-manifest.json` binds final source, test, probe, serializer, baseline and
  validation artifacts with SHA-256. Report and commit are excluded to avoid self-reference.

F1 and F3 are implemented for independent review; F2 remains explicitly open. No full G0/G1,
root `pnpm check`, package consumer check, erasure/crash/recovery qualification, byte/performance
remeasurement or live native-array answer regression was performed. No engine lifecycle action,
exclusive reservation, compact-on shared-resident run, merge, push or main-checkout edit occurred.
The only live writes were the p12 synthetic fixture and diagnostic ASSERT transactions.
