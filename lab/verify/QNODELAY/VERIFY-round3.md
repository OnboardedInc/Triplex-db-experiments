# QNODELAY round 3: FIX-FIRST

Reviewer: CX-VQNODELAY. Candidate: `b7aec0f7297015a15afe72eda027590773b0827d`. Merged into **verify/QNODELAY only**, merge `e7e67666f9ac02de8a2529181f84a36ad7423eee`.

North star: P1/P4 measurement integrity and transport correctness. Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; procedure: `lab/PROTOCOL.md`.

**Verdict: FIX-FIRST.** The actual C8 summarizer is fixed and the existing guard tests pass, but the new guard still silently accepts newly added mode-less timing writers with ordinary alternate field/output spellings. No implementation fix was made by this reviewer.

## R3-F1 — Medium: discovery misses ordinary alternate timing writers

Locations: `lab/receipts/coverage.mjs:9`–`:12` and `:31`–`:34`; existing regression coverage at `lab/receipts/coverage.test.mjs:14`–`:27`.

Discovery requires a source to match either the timing-name regex or a finite list of serializer spellings **before** the reviewed ledger is consulted. Unmatched new files never reach the fail-closed “new source requires review” condition. The regex recognizes names such as `queryMs`, `elapsedMsDiagnostic`, `duration_s` and `p99`, but misses ordinary lowercase units/labels including `seconds`, `time`, `milliseconds`, `microseconds`, `ns`, `us`, `execution_time`, `queryLatency` and `wall_s`. The serialization regex also omits shell `printf`, stderr writes and aliased JSON written through a Python file handle.

Independent full-guard reproduction used fresh files in an exact candidate scratch copy. **Neither the ledger nor candidate code was changed.** Each fixture was removed after its run, and all candidate source hashes were checked afterwards:

| New scratch source | Content | Full check-writers exit | Result |
| --- | --- | ---: | --- |
| `lab/new-qlever-writer.mjs` | `console.log(JSON.stringify({lane:"qlever",elapsedMsDiagnostic:42}));` | 1 | Correctly rejected as new source |
| `packages/new-qlever-writer.sh` | `echo '{"lane":"qlever","queryMs":42}'` | 1 | Correctly rejected as new source |
| `lab/new-qlever-writer.sh` | `printf '%s\n' '{"lane":"qlever","seconds":0.042}'` | **0** | Missed; 521-source/75-shape success still emitted |
| `packages/new-qlever-writer.sh` | `printf '%s\n' '{"engine":"qlever","time":42}'` | **0** | Missed; same success |
| `packages/new-qlever-writer.mjs` | `process.stderr.write('{"lane":"qlever","seconds":0.042}\n');` | **0** | Missed; same success |

The other two positive controls—Python `sys.stdout.write(j.dumps(...))` and shell `duration_s`—were discovered and rejected. This establishes that the gate was running and its new-file rule worked when discovery found the source.

Further exact-discovery fixtures confirm the nine missed field names listed above. A Python source using `import json as j`, `with open(..., "w") as output`, then `output.write(j.dumps({"lane":"qlever","seconds":0.042}))` is also undiscovered. I executed that Python writer and the alternate stderr writer locally: both actually emitted the expected mode-less QLever timing JSON. These values are synthetic fixture inputs, not engine measurements.

Reproduction runner: `round3/review.mjs`; full guard stdout/stderr are in `round3/{js-elapsed-positive,shell-queryms-positive,shell-seconds,shell-time,js-seconds-stderr}.*.log`. `round3/result.json` records exact fixture code, hashes, statuses, arguments and 934 unchanged source/config preimages. The broader field/output matrix and actual emitted bytes are in `round3/extended-result.json`.

**Proposed fix:** make new/changed supported source files enter the reviewed ledger independently of timing-field and serializer patterns. Use patterns to assist classification rather than silently remove candidates. Keep explicit generated/dependency exclusions, with a declared boundary. Add full-guard regressions for shell `printf`, lower-case/alternate units, stderr and a normal aliased Python file writer. This avoids chasing an unbounded list of spelling variants while preserving the hash-bound human review model.

Supplemental structural weakness: the labeled-file standalone check at `coverage.mjs:90`–`:98` rejects `{p99:42}` but accepts `{"p99":42}`, `{"elapsedMs":42}`, `{seconds:42}` and `{queryLatency:42}`. Property names come from `getText`, so quoted names include their quotes. `extended-result.json/standalone` exercises this with a matching synthetic reviewed labeled-source entry. This is **not** claimed to bypass the separate changed-source hash check without review; it shows the extra literal check is narrower than its claim. Normalize AST property names and define the structural check's supported timing schema, or require all timing serialization to pass a typed/validated boundary.

## Checks completed

- **20/20** unmodified builder coverage regressions pass in the clean candidate copy, including actual C8/server-log/profiler subprocesses.
- The exact builder source checker succeeds: **521 discovered files**, **43 constructor files**, **75/75 shapes** compile with mode and **75/75 fail** without it; runtime implementation checking succeeds. Declaration/runtime fixtures also typecheck with exit zero. Full-command output is retained, including the successful outputs from the missed-writer runs.
- Independent C8 subprocess inputs use a fresh run ID and known native/Datalog values (7 ms and 5 ms). Keep-alive and per-request are preserved exactly. Absent and unknown modes produce exit 1 and no stdout, even with the environment set to per-request. The previous R2-F1 C8 defect is closed.
- R3 does not change `QleverClient.ts`, its public runtime exports or the lockfile relative to round 2. Transport/connection results from round 2 remain historical evidence; they were not rerun or presented as fresh here. No engine was contacted.
- Reviewer JavaScript syntax checks passed. No source under review or ledger entry was edited by the reviewer; only the requested candidate merge changed those bytes in this checkout.

The independent byte/pin audit verified **543/543** builder manifest entries, **521/521** reviewed current source hashes and all **26** changed-source records. It found **no newly changed fixed-hash pinned path** and no acceptance-file changes. Round 2's native-entry discrepancy remains unchanged (current `0f78b5bfcf5d2198015bd6a0e9111a4c7d98fb6fd9022de468d047d90a8bca8d`, still-pinned `c82ce6cfabfcf61ab9f5d76791146d167741420a3be07b92559026f987634b0f` at the two CS-ENTRY locations). The contract builder remains responsible for re-pinning. Reviewer additions move no pinned source hash.

## Binding, attempts and evidence

Tests ran against `b7aec0f7` source/config bytes obtained from Git, not a mixed builder working tree. Candidate code was copied under `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round3/source-attempt2/`, with a link to the existing installed dependency tree. No dependencies or caches were copied or installed. All 934 copied file hashes were rechecked after the mutations, and the guard/C8 bytes were compared with this reviewer checkout. This clean copy avoids treating the reviewer's own additional source files as candidate ledger entries.

The first reviewer setup attempted to copy unrelated historical JSON too and stopped on a Git-output buffer limit before any candidate gate ran. Its original runner/log and partial source copy remain `review-attempt1.mjs`, `review-attempt1.log`, and durable `source-attempt1/`. The next attempt restricted the copy to source and necessary configuration; it is a separate attempt, not a rewritten success. Heavy-slot waits are retained in logs. All gate/audit commands were admitted through `lab/bin/heavy.mjs`; host free disk was over 10 GiB at the initial preflight.

Report: `lab/verify/QNODELAY/VERIFY-round3.md`. Reviewer tools/results: `lab/verify/QNODELAY/round3/`. Durable source/fixture evidence: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round3/`. `round3/SHA256SUMS` and the durable preimage manifest bind the artifacts. Neither earlier review evidence nor builder evidence was altered.

Representative commands:

```sh
node lab/bin/heavy.mjs --label CX-VQNODELAY-R3-review2 -- node lab/verify/QNODELAY/round3/review.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-R3-extended -- node lab/verify/QNODELAY/round3/extended.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-R3-audit -- node lab/verify/QNODELAY/round3/audit.mjs
```

Use a new scratch/output name for reruns; the retained attempt outputs are exclusive-create. No root `pnpm check`, package build/full body typecheck, package test suite, engine integration/benchmark or loaded P1/P4 qualification was performed. This was an offline metadata/guard review. Default remains **keep-alive**; a representative admitted comparison still must decide a flip. No merge into main or push.

## PASS / verdict / receipt audit (rule 9a)

1. **`round3/review.mjs`**: baseline acceptance checks actual child exit/status plus the builder's own assertions; C8 checks exact decoded known timings and input mode, with negative controls requiring rejection and empty stdout. Mutations record actual exit statuses and diagnostic messages without converting collection success into guard success. Freshness comes from a new source attempt, exclusive-created fixtures, live subprocess execution and UUID. Exact Git preimages, arguments, logs and end-of-run hashes bind source/inputs. There is no engine-slot claim.
2. **`round3/extended.mjs`**: discovery is performed on real newly created source files; parsed actual Python/stderr output must equal the expected synthetic JSON. It records absent discovery/errors rather than treating absence as PASS. Fresh fixtures/UUID, exact code hashes, unchanged final baseline and guard/inventory/checker hashes bind these results. The matching synthetic reviewed entry used for the standalone check is explicitly separate from the full-gate mutations.
3. **`round3/audit.mjs`**: checks builder manifest bytes, current ledger/source hashes, current changed-file hashes and actual acceptance pin objects. Git diffs delimit unchanged transport and contract code. These are byte/pin checks only; historical builder successes remain historical.
4. **Unmodified builder tests/checker**: current local fixtures and compiler diagnostics produce the observed 20-test/75-shape result. Candidate source preimages/hashes and subprocess logs bind that execution. Its finite discovery boundary is the finding; no broader universal PASS is inferred.
5. **This FIX-FIRST verdict and manifests**: derive from the reproduced successful full-guard runs with missed mode-less writers. Hashes attest bytes and retention, not semantic database acceptance, complete coverage or a default promotion.

Open follow-up: make discovery fail closed for the demonstrated alternate spellings/output forms and rerun those exact negative controls. Preserve the successful C8 fix and previous transport/lifecycle evidence.
