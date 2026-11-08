# EXP-J01 fix-round delta review — CX-VJ01-2

North star: **P2**, fewer bytes per small atomic commit, preserving default-off public behavior as a correctness floor. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Expected behavior: main-checkout `lab/acceptance/RULINGS-PENDING.md`, Q81c.

**Verdict: FIX-FIRST.** The F1 implementation fix and F3 probe correction pass independent checks. The remaining delta finding concerns the requested F2 execution handoff: its listed commands do not create the encoding-bound evidence that the prose correctly requires. This does **not** require running full G1 before a default-off merge; supply the missing reproducible collection commands, and keep compact-on unavailable pending independent exclusive-slot qualification. No default-off implementation regression was found in the exercised surfaces.

Reviewed candidate: `0d9a86008ba4714f404c3e6e9d7443f361b592e1`, on `5cc42fb`. Reviewer branch starts at `de7045b`. Pinned main baseline: `ab31bebc54bf11a8fba82bb5a9a2c0a7198d6127`, as in round 1. Main's backend/core source equality is checked again by `round2/finalize.mjs`; the current main revision is retained in `round2/final-manifest.json`. All implementation files remain untouched. Pinned source copies are extracted under ignored `round2/trees/`, with reproducible preparation and SHA-256 manifests; no mutable main-checkout dist or builder-built candidate dist is used.

## Remaining finding

### F2-R2 — Medium: the deferred recipe omits the commands that actually bind encoding evidence

**Location at the reviewed commit:** `lab/experiments/EXP-J01-bytes-per-commit/REPORT-round2.md:99` (launch envelope), `:108` (mode diagnostic), `:114` (raw per-scope evidence).

The four `G1` invocations correctly set `TRIPLEX_COMMIT_ENCODING` and use exclusive slots with a matching holder. Source tracing confirms `heavy.mjs` inherits that environment and `gate.mjs`'s `cleanEnv` preserves it through to the qualification child. The named QLever profile and planner budget are supplied. Admission, Datomic parking, retaining failures, complete 88/88 plus suite PASS, and owner-only release are described accurately.

However, **no listed command writes the separate launch envelope**, captures the actual encoding environment, or links its hash to the gate/raw-report hashes. `heavy.mjs` only launches the child; `gate.mjs` does not retain `TRIPLEX_COMMIT_ENCODING` in its receipt. The report itself acknowledges this. A free-text `--note` cannot supply the missing evidence.

Likewise, the two listed P9 commands emit only aggregate counts and an inferred label. They do not retain the required raw per-scope source-log/RDF records, scope/transaction mapping, or explicit no-write dispositions. The report correctly warns that P9 is insufficient, but supplies no executable command for the additional collection. Following just the supplied commands therefore still leaves the exact Q81c environment/persisted-mode binding gap open, even if every gate happens to pass.

**Reproduction:** `node lab/verify/J01/round2/recipe-audit.mjs`. This reads the exact candidate Git sources without reserving or contacting an engine, evaluates the actual environment cleaner, and exercises the unchanged P9 QLever branch against two mocked diagnostic inputs. P9 labels both zero rows across all scopes and one populated A0 scope plus a missing scope as `a0`; neither output retains per-scope raw rows. These are diagnostic demonstrations, **not engine observations**. See `round2/recipe-audit.json` and `.log`.

**Proposed fix:** supply runnable, source-bound launch/collection commands or a wrapper that (1) writes the selected environment and exact invocation at launch, (2) finalizes the gate/source/build/owner/raw-report linkage and exit status, (3) collects complete raw persisted-mode evidence with a disposition for every exercised scope, and (4) refuses missing, mixed, zero-evidence or changed-owner cases. Perform mode readback immediately after each gate while its reservation is owned. No need to execute those exclusive-slot gates in this light review; full off/on G1 on both lanes remains explicitly deferred.

## Closed delta findings and independent evidence

**F1: closed for default-off compatibility.** The only client mapping addition relative to pinned main is the private `XtdbTextArray` descriptor branch. The helper is absent from the public package index, and only the two compact guard lists construct it (`XtdbStorageAdapter.ts:120`, `:130`). Untagged arrays retain OID 114, including empty, nested, mixed and isolated-surrogate-member arrays. Existing top-level Unicode validation is unchanged. The adapter's compact branches remain gated by the explicit encoding choice.

`round2/differential.mjs` compares independently extracted main and candidate sources with the environment unset and explicitly `a0`. Its 11 inputs include empty/string/numeric/mixed/nested arrays, JSON-looking array members, top-level strings that look like JSON arrays/objects, Unicode/quotes/backslashes/newlines, an isolated surrogate member, and a **100,000-element string array**. It exercises public `query` with both placeholder modes, transactional `submit` and readback, and both full native providers through real `context.bind`. A separate empty-reachability call verifies the existing rejection contract; it does not qualify valid recursive working relations.

| Check | Result | Evidence |
| --- | --- | --- |
| Full statements, OIDs, values and actual pinned JSON serializer bytes, 22 mode/input combinations | All equal | `round2/wire.json.gz`, `wire.log` |
| Live public query/submit/readback and native SQL, 22 combinations, shared XTDB resident | All equal; these surfaces succeed | `round2/answers.json`, `answers.log` |
| Corrected live native XTQL, 22 combinations | All equal; zero errors | `round2/answers-xtql.json`, `answers-xtql.log` |
| Default-off and explicit-A0 adapter statements versus main, 24 adversarial Triplex values on each lane | Equal; random operation identities alone normalized | `round2/offline.json`, `offline.log` |
| QLever asserted/retracted persisted shapes and decoded exact values, 48 rows | Equal | `round2/offline.json` |

The wire captures retain complete statements and bound bytes, including the large arrays, losslessly compressed. `final-manifest.json` records both compressed and decompressed hashes after a verified gzip roundtrip. Large live answers are retained as exact canonical value hashes and byte counts per surface, with small answers inline; this is direct in-memory equality plus hashed output evidence, not a complete raw pgwire capture.

**F3: closed.** The candidate's P12 source was copied verbatim and independently rerun against shared XTDB with encoding explicitly `a0`, under `heavy.mjs`. Both correctly bound JSON-array predicates (`ANY`, `IN/UNNEST`) pass fresh/other-scope/empty and reject existing scoped IDs: **8/8 expected outcomes**. All eight double-encoded-string control attempts pass, including both existing-ID attempts. This reproduces the corrected interpretation: JSON arrays work in this focused guard probe; the original control does not test JSON-array binding. Historical P5 evidence remains unchanged. See `round2/json-array.json`, `json-array.log`, `p12-json-array.mjs`.

## Broader default-off frontier

The adapted round-1 frontier runs the **pinned main implementation versus default-off candidate**, in fresh synthetic scopes, using the same deterministic application trace on each lane. It checks 20 exact boundary/decimal-string/long-text values, read-your-own-write, replacement/retraction, old recorded-position cuts, half-open valid intervals, history, typed stale-precondition and duplicate-command outcomes, original receipt lookup, journal changes, resumed feed, dependency state and Datalog at the old cut. Each arm's application answers are compared after replacing only its scope identity. Negative zero is preserved explicitly in saved snapshots.

**Both lanes PASS:** five stages per main/candidate arm, with all **17 saved read/result surfaces equal on each lane**. Results are retained in `round2/frontier-xtdb.json`, `frontier-qlever.json` and their logs; final adjudication is asserted by `round2/finalize.mjs`. Other query/native/temporal/maintained implementation files are unchanged relative to main; this review does not pretend to exhaustively enumerate every public method or every recursive native workload.

## Execution, retained verifier mistakes and limits

Run preparation with `node lab/verify/J01/round2/prepare.mjs`. Offline comparators use `node --import tsx .../differential.mjs` and `.../offline.mjs`. Live invocations use `node lab/bin/heavy.mjs --label CX-VJ01-2-<check> -- <command>`; array/native answers add `--live`, corrected XTQL adds `--live --xtql-only`, and `frontier.mjs` takes `xtdb` or `qlever`. P12 requires `XTDB_URL` matching the retained resident owner and explicit `TRIPLEX_COMMIT_ENCODING=a0`. Initial disk free was about 28.8 GiB, above the 5 GiB admission floor. Heavy-token waits are retained in the logs.

- `wire-attempt1.log`: the first verifier invocation failed before execution because its own root-level bare core-package import was unavailable. The corrected harness imports the existing package build entry points; no installation or dependency change was needed.
- `differential-attempt1.mjs`, `wire-attempt1.json.gz`, `wire-attempt2.log`, and `answers.json`: the original XTQL builder omitted the required relation binding vector, causing equal parser errors in both implementations. Those errors count only as equal rejected behavior. The corrected valid XTQL query was rerun separately for all 22 inputs/modes and succeeds; the other successful surfaces were not needlessly rerun. Empty reachability deliberately remains an equal invalid-input check, not valid recursion evidence.
- All source copies and pre-recorded build-entry/lock/serializer hashes are read back, and both resident owner files must match their initial hashes. These owner-file observations are not a new full engine/container attestation. The candidate executes directly from pinned TypeScript through the existing tsx toolchain; this is not a fresh package/declaration build qualification.

No implementation fix, main-checkout edit, merge, push, dependency install, engine lifecycle action, exclusive-slot reservation, compact-on resident use, full G0/G1/root check, performance/bytes remeasurement, engine-crash/recovery run, erasure qualification, or full native recursive-workload qualification was performed. Synthetic fixture rows/scopes and first failures are retained. Compact-on remains unqualified and must not be used before Q81c's independent exclusive-slot gates pass.
