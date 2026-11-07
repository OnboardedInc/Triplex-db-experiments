# Selected production SDK qualification

Retained source protocol from `6fbb3775`. Commands run in the
`temporal-read-scheduling-20261105` worktree on
`codex/temporal-c2-confirmation-20261105`; main retains protocol and evidence.
The subsequent [92-method receipt](evidence/sdk-query-admission-v2-focused-20261105.json)
and [small one/sixteen-client qualification](evidence/antijoin-sdk-small-20261105.json)
pass. The original source-stage wording below is historical. Full performance
and integration qualification remain separate.

Source checkpoint only. Actual artifact binding generation and the small
production-profile gate require root's grant. No full campaign is implied.

The selected runtime is C's frozen `sdk-admission-frozen-032-20261105/runtime`
in the thread-budget worktree. Its 445-file inventory is `8f1bfbcb…`, store
JS is `8240cebc…`, production TS source is `d024e9b8` (hash `73615c1b…`),
and the completed focused test source is `2bb4ca2a`. Core f44, owner55,
controlaf, engine72, schemaa2fa and portbc5 remain unchanged. Existing native
and original 0.32 bindings are retained under their actual roles.

`antijoin-sdk-binding.mjs` admits two explicitly labeled artifacts: the old
B0/SDK754 control, or this exact selected SDK. It verifies the B reference
through the unchanged native helper, then independently checks the selected
runtime against the actual native/manifests/dependency bytes. It hashes the
complete three resolved DuckDB SDK packages, including their platform addon
and engine. Five source/build inputs are checked against their exact Git
commit and fixed hashes; only `adapter/native-entity.ts` may differ. The
compiled-store hash is pinned separately; the helper does not claim hashing
alone proves compilation. C's exact TSC/37-method qualification supplies that
receipt. The selected frozen inventory is checked file by file before/after.

No outer FIFO runs for a selected-SDK profile. `--read-admission` is rejected.
The SDK owns heavy admission automatically. Observe physical control scopes
and reader leases, capped at `min(3,readers)` for C; preserve all configured
reader ports and all logical clients. The old B0 control keeps no extra cap.
The reader pool must drain exactly; actual distinct ports, physical overlap
and configured capacity remain separate facts. Internal queue counts are
not invented from physical observations.

Both explicit profiles select only their original matching e992 eight
limits. Query, input proof, seed/mutation, typed K-indexed oracle, fixed and
mixed readCell loops, timers, receipt/reuse/reopen and numerical gates are
unchanged. The report labels query contract v2 for the selected SDK, v1 for
B0; timeout now includes scheduling/earlier-write waits, while the original
captured write tail and data ordering remain required. No new public option
or native build variant exists.

## Review and pure checks

```sh
node --check adapter/antijoin-sdk-binding.mjs
node --check adapter/benchmark-antijoin-cost.mjs
node --check adapter/test-antijoin-sdk-binding.mjs
UV_THREADPOOL_SIZE=4 node --test adapter/test-antijoin-cost.mjs adapter/test-antijoin-config-binding.mjs adapter/test-native-write-binding.mjs adapter/test-antijoin-profile-binding.mjs adapter/test-antijoin-sdk-binding.mjs
```

The existing 22 methods plus six selected-SDK policy cases are pure. They
exercise old/new artifact separation, one gateway, exact profile limits,
dependency/source/build drift, unchanged native baseline, small scope and
CLI rejection of doubled/multiple gateways. They do not inspect a runtime
or start DuckDB. No old bindings are regenerated for this changed harness.

## Later exact artifact generation

After source review and root's setup grant, generate fresh immutable files
for each needed role/profile, rather than hand-editing manifests. This is
file/source inspection only; it does not open a database or load the engine.

```sh
UV_THREADPOOL_SIZE=4 node adapter/antijoin-sdk-binding.mjs \
  --artifact-role C2_SDK_CANDIDATE --readers 1 \
  --budget evidence/antijoin-cost-10m-budget-20261105.json \
  --native-binding evidence/antijoin-native-write-candidate-binding-v2-20261105.json \
  --evidence ../../../../research-reference/projects/temporal-datalog/runtime/build/combined-028-20261105/mixed-10m-pilot.json \
  --output evidence/antijoin-sdk-candidate-10m-1-20261105.json
```

The other three sidecars use `C2_SDK_CANDIDATE/16`, `B0_CONTROL/1` and
`B0_CONTROL/16` with corresponding fresh filenames. Bindings remain
`PREDECLARED_UNRUN`. Full gate commands are root-scheduled after the small
production profile passes and the exact source/actual identities freeze.

## Small production profile

Use root's next engine grant, fresh output, and no `--read-admission`:

```sh
UV_THREADPOOL_SIZE=4 node adapter/benchmark-antijoin-cost.mjs \
  --runtime ../../../../temporal-thread-budget-20261105/projects/temporal-datalog/runtime/build/sdk-admission-frozen-032-20261105/runtime \
  --candidate-binding evidence/antijoin-native-write-candidate-binding-v2-20261105.json \
  --sdk-binding evidence/antijoin-sdk-candidate-10m-1-20261105.json \
  --budget evidence/antijoin-cost-10m-budget-20261105.json \
  --fixture ../../../../research-reference/projects/temporal-datalog/runtime/build/scale-runs/20261105T185235542Z-394378fd/facts-100000.duckdb \
  --evidence ../../../../research-reference/projects/temporal-datalog/runtime/build/expanded-value-integration/mixed-100k-026-checkpoint-fixed.json \
  --output build/c2-sdk-confirmation-20261105/candidate-small-1-01.json \
  --screen small --readers 1 --samples 2 --warmup 0 --duration-seconds 2 --threads 4
```

The separately authorized sixteen-client small profile changes binding,
readers and output only. Both are correctness-only, explicitly unqualified
timings. Full profiles replace source/recipe with the unchanged 10m371/532
fixture, select20 fixed samples/client, one warmup and60 seconds mixed. No
limits, thread count, query shape or work oracle change. Stop/preserve first
identity, typed-oracle or lifecycle failure; no blind retry or cap relaxation.
