# EXP-DA01: blocked before adapter qualification

**Result: BLOCKED / INCOMPLETE. No adapter promotion.** Builder CX-DA01, branch
`exp/DA01-datomic-adapter`, starting head `702643f745ab5d9865635ddb3896d2faa9a56b36`.
This report and an **unapplied, incomplete draft patch** are the only committed changes.
The final report commit is identified in the builder's final message.

North star: the correctness floor for goal 7 and P2, under `lab/SCOPE.md`,
`lab/NORTH-STAR.md` and `lab/TARGETS.md`. Procedure: `lab/PROTOCOL.md`. Mapping:
R29 section 4 and Q78a-e. No inherited devloop targets or resource queue were used.

## Blocking instruction conflict

The experiment brief permits a gateway rebuild followed by `engine.mjs up --fresh`
on the dev resident. The dispatch instead explicitly says:

> The lane D dev resident tx2-datomic-dev is running and READY; use it with your
> own databases (one per test scope) and never park, stop or recreate it.

The dispatch was treated as the controlling instruction. The running DA00 gateway
only implements health, scope create/delete and basis; it cannot transact, read
facts or execute queries. The HTTP route probe below confirms that condition live.
Changing TypeScript alone cannot provide the specified Datomic-backed adapter on
this gateway. Its source is baked into the image; no supported source reload was
found. No lifecycle action, image build or replacement was attempted.

An asynchronous clarification was submitted asking whether the orchestrator can
deploy the gateway after implementation. No answer was received before this
handoff. This is an authorization conflict, not an automatic approval rejection.
The builder did not assume that elapsed time authorized deployment.

## Fresh evidence

All evidence below is in
`lab/experiments/EXP-DA01-datomic-adapter/receipts/`.

| Evidence | Observed result |
| --- | --- |
| `resident-routes.json` | `GET /health` returned 200, version 1.0.7745, gateway hash `0177dcf44530bc32f02b4230a2203ae0c03652b27a4fb61a1b559283d68be1dc`. |
| Same receipt | Created only this run's test scope, database `s-17c03f6a80912542294ddf2e9bd7af2d`; `/snapshot`, `/read` and `/q` each returned 404 `NotFound`. |
| Same receipt | Test-only delete returned `deleted:true` for that exact scope. No probe database remains. |
| `engine-status.txt` | Pool reserves 9.25 GiB of 11 GiB, including the existing Datomic resident under EXP-DA00. No exclusive slot was requested. |
| `install.log` | Offline frozen installation using the owned pnpm store completed. Its generated lockfile sorting/empty-importer rewrite was restored byte-for-byte to HEAD. No dependency versions changed. |
| `G0.log`, `G1-admission.log` | Heavy wrappers waited behind four occupied slots. Both own waiting wrappers were terminated with actual exit 143 before doing gate work. No G0 result was produced. |
| `G1-unsupported-lane.log` | A subsequent lightweight CLI admission check rejected `G1 --lane datomic` with USAGE; the unchanged DA00 gate only admits Datomic for G0. No semantic tests executed. |

**G1 denominator: 0 of 88 case executions, complete suite not run.** There is no
first G1 receipt, no `--previous` rerun, no G0 PASS claim, and no live adapter-test
result. DA00's historical PASS receipts were read for context, not reused as fresh
DA01 evidence. The health/create/delete probe is not an adapter correctness test.
The sandbox blocked ordinary process listing; automatic review approved the
bounded termination of only the two own DA01 waiting wrappers. No unrelated
process was signalled.

## Draft retained for continuation

`UNAPPLIED-INCOMPLETE-storage-draft.patch` preserves preliminary TypeScript staging,
tagged row transport and Clojure fact-entity transaction/read code. `git apply
--check` verifies only that the patch applies to the starting source. It is **not
compiled, executed, reviewed or ready to apply as a qualified implementation**.
The working package was restored to the DA00 baseline, so consumers do not see an
unfinished runtime. There is no new `makeDatomicRuntime` export.

The draft adapts the XTDB SPI's row representation, callback savepoints, safe
replay and operation-resolution loop into package-local code, without importing
sibling source. The gateway draft uses tempid upserts for subjects/attributes,
one scope CAS, unique/value fact and command identities, retracting `:f/live`,
and transaction operation annotations. These are implementation hypotheses only.

Known unfinished or unverified work in the draft:

- No Datalog compiler/executor, bounded frontier integration, runtime composition,
  qualification registration, G1 lane wiring or qualification cleanup integration.
- No `d/with` probe or staged native query implementation. The preliminary row
  reads use a TS overlay; the brief requires probing `d/with` before choosing it.
- No validation that row decoder output conforms to every `TripleRow` invariant;
  no complete value-pattern filtering in the gateway read path.
- The snapshot release path, timeout/error classification, request limits,
  non-canonical integer rejection and signed zero round trip require actual tests.
- The preliminary gateway retains per-fact positions and timestamps. These are
  not accepted changes to R29's annotation scheme. Test actual core behavior
  before deciding whether a per-fact fallback is necessary.
- `at-position` is preliminary, uncached and does not implement the brief's
  reconstructed in-memory P-to-t map. Multiple logical positions inside one
  outer callback need a source-bound test; choosing a Datomic t alone cannot
  distinguish several Triplex cuts within the same physical transaction.
- No datoms-per-commit observations for 5, 10 or 50 facts; no lost-ACK, hang,
  concurrent-CAS, command-replay or identity-reuse evidence.
- Package dependencies and lockfile coordination remain to be done before adding
  public core imports to the executable package.

## Handoff / open questions

1. Orchestrator: resolve the gateway deployment boundary while preserving the
   existing resident's retained proofs. The builder has no authorization to park,
   stop or recreate it. Do not blindly run `up --fresh`: engine.mjs removes the
   existing volume with that flag.
2. Finish the adapter and executor against the R29 mapping, then compile and test
   them; use the draft only as unverified starting material. Confirm whether
   distinct timestamps/positions actually occur in G1 before changing mapping.
3. Have the environment owner coordinate the package's workspace dependency and
   lockfile additions. Keep existing pins and the owned store.
4. Run G0; fresh G1 88/88 plus the complete suite; a `--previous` rerun; the live
   boundary tests; `d/with`; and 5/10/50-fact datom measurements. Delete each owned
   qualification test database and retain actual cleanup responses.
5. DA02 and DA03 remain blocked on a qualified adapter. No native-query coverage,
   P1-P5 performance, erasure, storage-layer tenant certification or production
   readiness is established by this run.

No subagents, merge, push, package publication, shared resident restart, default
Docker daemon, prohibited port, unrelated cleanup or main-checkout source edit
was used. The original ZIP, retained engine volumes and prior evidence remain.
