# Local development controller

Evidence scope: preparation must capture the actual dependency graph. Historical
direct-package lists omitted transitive witnesses documented in
[`runtime-dependency-scope-v1.json`](../evidence/runtime-dependency-scope-v1.json).
Existing receipts prove their declared pins and registered answers; they do not
establish complete transitive/conditional package/environment closure. Preserve
them unchanged. Corrected capture applies to fresh jobs, not retroactive pins.

This is the new `portable-export-devloop-v1` controller. It coexists with the
archived qualification harness; it does not forge that harness's original Git
proof, overwrite historical receipts, or imply native engine acceptance.

Run from the mounted project using the pinned tool environment:

```sh
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs doctor
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs status
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs seed
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs help
```

`doctor` invokes the actual APFS/ZIP accounting guard and binds the selected
portable-export baseline. Every command except help fails closed if the quota
mount is missing. The current pool admits at most three heavy trials,10GiB of
declared combined reservations and eight CPU units. These are admission vectors;
native Mac memory supervision is sampled/cooperative, not hard containment.
CPU units are reservations rather than enforced processor affinity.

The bounded Mac controller profile uses an explicit outer controller heap:
`tools/bootstrap/with-env.sh node --max-old-space-size=256 scripts/triplex-devloop.mjs execute ...`.
Its actual flags are retained in `grant.json`; changing a label alone cannot
change comparison resource identity. This repaired a measured controller-GC
RSS breach without increasing the QLever engine cap. Later growth of the v1
canonical state to68MB caused publication OOM at that heap limit. The explicit
v2 migration removes repeated input arrays from mutable state and reuses exact
immutable manifest envelopes. See [measured failure and repair](../../wiki/problems/controller-state-growth.md).
The heap flag remains an invocation setting, not hard RSS containment.

`seed` adds fifteen hypotheses and five shared foundation/review/calibration
prerequisites. They are **queued, unexecuted and not runnable** until a measured
problem and complete execution contract are supplied. Existing ids never get
overwritten. Create a new job revision when an implementation/contract changes.

## Actual commands

- `source-verify [--check-zip]` invokes bootstrap's selected-export verifier,
  reporting current working differences. A fresh job separately verifies its
  own complete current source/build/oracle closure.
- `capture-inputs --spec FILE --output FILE` expands owned files/directories into
  exact hashes. The spec is `{"roots":[{"path":"packages/core/dist","role":"build"}]}`.
  Capture separate source, build, dependency/lock, runner, oracle, native-query,
  mapping and codec roots without overlapping file paths. Symlinks are refused;
  use the actual immutable dependency closure rather than following arbitrary
  workspace links. This command only captures bytes, not runtime correctness.
- `enqueue --manifest FILE` validates and freezes a new job contract.
- `fixture-prepare --manifest FILE --executor NAME` enqueues and actually executes
  a fixture recipe if the fair resource queue admits it. It does not fabricate a
  database by creating an empty directory. If another lane is due first, the job
  stays queued and `execute` serves the fair queue.
- `execute [--job ID] --executor NAME` atomically grants and executes one eligible
  job. Explicit selection cannot bypass another eligible lane's fair opportunity.
  Immediately before a grant, every required resident is freshly checked through
  the private Docker owner validator or its Mac PID/birth identity. Stopped,
  restarted, changed or unavailable owners become UNKNOWN with their original
  reservation retained. The job remains queued with no attempt/child. Docker
  checks also verify unchanged StartedAt, caps and owned mounts; fresh successful
  observations are retained in `grant.json.requiredOwnerChecks`.
- `cancel --job ID --reason TEXT` cancels queued work without launching it, or
  requests termination of the actual owned running process group.
- `retry --job ID --reason TEXT` creates another attempt of the **same frozen
  source/contract**. It retains the original terminal outcome. Changed code needs
  a new job id; repaired setup and planned replication need an explicit reason.
- `reconcile` observes stale controller/resident owners. Unknown work retains its
  reservation. It never assumes a quiet/dead controller proves a backend stopped.
- `migrate-state` explicitly upgrades known v1 state to v2. It byte-verifies the
  existing job envelopes, preserves the exact legacy snapshot and prepared/
  published migration provenance, and atomically publishes only thin scheduling
  state. No old receipt, first outcome or unknown reservation is adopted or
  released. Normal commands refuse v1 until this explicit maintenance succeeds.
  `loadJobManifest(context, job)` is the exported verified hydration API; direct
  `state.jobs[id].manifest.inputs` access is invalid in v2.
- `resident-register --manifest FILE` reserves a live local engine/VM process
  before client jobs use it. Supply its id/backend/local PID, owned directory,
  exact inputs and resource vector. For `kind:docker`, supply the exact private
  container/image IDs, required ownership labels and caps instead: the controller
  inspects the private daemon and checks owned writable mounts. Guest PIDs are
  never sent to host `ps`. Sibling query surfaces reference one resident id and
  charge only their additional client resources. VM overhead is reported
  separately from engine cgroup caps.
  `resident-release --owner ID` refuses release while that process is still live
  or an active job depends on it. Include every resident, even during idle time.
- `resident-refresh --owner ID --readiness-run JOB/0001` reactivates only an
  existing UNKNOWN Docker owner. A real byte-verified recovery attempt and its
  anchored startup artifact must match fresh private-daemon inspection of the
  same container/image, labels, mounts, resource caps and newer startup time.
  The original reservation/token stay held, recovery history is appended, and
  the controller starts no service. This is readiness, not full durability or
  all-ten-goal qualification.
- `verify-attempt --run ID/0001` rehashes retained terminal/result bytes.
- `calibrate --runs ID/0001,... --output FILE` requires three actual correct
  256-client capacity controls from each of five surfaces; it freezes the writer
  schedule/liveness policy. Zero or unknown writer capacity is incomplete.
- `compare --controls ID/0001,... --candidates ID/0001,... --output FILE` derives
  metrics from retained raw request events and enforces matching profiles,
  cohorts, resource identities, repeat input identities and calibrated writers.
  Actual retained `resultJson` is rehashed against the independently pinned
  returned-cut/parameter catalog. Within-lane runs also bind actual reservations,
  admitted resident caps/identities, starting co-runners and controller flags.
  Common runner/dependency/fixture/calibration/oracle bytes stay fixed while
  candidate engine/query source and builds may change. Full-window cohort
  alignment still requires the declared controlled schedule; the starting
  admission snapshot alone is not a continuous co-runner audit.
- `promote-verify --candidate ID/0001 --verification ID/0001 --comparison FILE
  --reviewer NAME --required-checks KEY,... --output FILE` requires an independent
  named verification author, actual registered gate results, exact candidate
  source/build/oracle identity and a passing paired comparison. It records
  eligibility; it does not merge, deploy, publish or close all ten goals.
  The verifier binds every candidate input role, including runners/dependencies.
- `cleanup --run ID/0001` removes only owned `scratch/` when the terminal proves
  process cleanup and the manifest explicitly declares rebuildable ephemeral
  scratch. Unknown state, forensic backend state, missing owner proofs and
  symlinks refuse cleanup. Receipts, first failures, logs and result artifacts
  remain. Backend fixture retention is a separate qualified recipe.

All paths must be inside the quota-backed mount. Production admission permits only
the canonical `.devloop` queue. An alternate `--state-directory` is rejected.
Explicit component-test policies use newly owned isolated directories and carry
`component-test-only` receipts; they cannot calibrate, compare or qualify engines.
This prevents independent queues from multiplying the shared admission pool.

## Job and evidence contracts

A runnable `triplex-devloop-job/1` manifest contains an id, kind, queryPath,
backend, author, logicalTaskId, problemId, hypothesis, goals, dependencies,
source inspirations, exact inputs, real argv/cwd/environment, resource vector,
evidence checks and retention policy. See `recipes/logical-fixture-preimages-v2.json` for a
real small recipe. It creates an independent logical event fixture only; it is
not an engine fixture or scale result.

Each input is `{path,role,sha256}`. Benchmark/calibration/verification jobs also
pin actual builds and independent oracles. Native load trials pin the authored
query, schema mapping and codec. The controller additionally binds its own code,
selected Node binary and portable baseline. It checks inputs again after work.
The manifest's source/dependency closure remains the author's responsibility;
independent review must establish completeness.

New runnable jobs also retain reconstructible declared input bytes. Enqueue
creates `jobs/<id>/source-preimages.json`, bound by the immutable job envelope.
Before the command runs, `inputs.json.sourcePreimages` additionally binds the
actual controller code. The byte index points to independent copied objects
under `.devloop/source-objects/sha256/`; identical bytes are reused. Copies use
separate inodes and never hardlink a mutable working file. Declared source,
runner, oracle, recipe/fixture/calibration, authored query/mapping/codec and
package-input roles are included. Credential-file, dependency and build-cache
bytes are omitted; their existing input hashes remain. Known credential/cache
paths cannot be relabeled as archived source.

`verify-attempt` verifies both source indexes, exact declared coverage and every
referenced object's retained bytes. Missing, changed, escaped or symlinked
objects refuse verification. Grant checks the frozen contract archive before
creating an attempt. Scratch cleanup preserves these archives and receipts;
there is no automatic source-object deletion. Preflight and subsequent storage
checks count the same bounded filesystem and total-owned operational headroom.

The ZIP/Git baseline is recoverable. Older working-tree experiments retain
hashes, commands and query traces with partial source reconstruction; they are
not retrofilled or relabeled as complete source snapshots. The [current source
checkpoint](../../.runtime/source-checkpoints/4430cb24-e593-423f-be8b-b9aa5727221d/checkpoint.json)
contains a source archive plus Git HEAD/dirty patch, explicitly as observed at
its timestamp. Generated builds still use their exact input hashes and declared
build/import prerequisites rather than duplicated dependency caches.

The [31-test source-retention checkpoint](evidence/controller-preimages-20261106.json)
and independent nine-check review cover old-byte retention after edits,
inode independence, deduplication, omitted/corrupt/missing/symlink refusals and
real invocation coverage. The canonical logical-only fixture
`logical-fixture-preimages-v2/0001` also executed and [verified through the CLI](evidence/controller-preimages-canonical-verification-20261106.json).
It is a controller recipe proof, not an engine or scale result.

Each check names a pinned oracle input and an actual file under `artifacts/`.
Artifact bytes are inventoried and anchored for failed, cancelled and resource-
denied outcomes too. Unsafe artifact symlinks are refused. Earlier receipts that
did not anchor failure artifacts keep that limitation; a later observed digest
does not retroactively strengthen them.
The controller computes both hashes; it never trusts an emitted `passed:true`.
An empty check contract yields `completed_process_only`, not semantic PASS.
Byte equality still does not prove the oracle/harness itself correct.

The raw load profile is `triplex-devloop-load-profile/1`, with id, clients,
fixed start/end milliseconds, required logical-task classes, fixture/resource/
cohort identities, phase and frozen calibration. Raw JSONL events are retained
under `artifacts/`:

```json
{"type":"read","taskClass":"lookup","logicalTaskId":"lookup-user","oracleKey":"lookup-cut7","paramsSha256":"<64 hex>","basis":{"validAt":1.5,"knownPosition":"7"},"clientId":0,"startedMs":0,"finishedMs":12,"ok":true,"resultJson":"[[\"Alice\"]]","resultSha256":"<64 hex>","knownPosition":"7"}
{"type":"write","commandId":"fresh-1","offeredMs":0,"ackMs":10,"visibleMs":11,"reconciled":true}
```

Read latency includes complete public result consumption. Requests submitted in
the fixed window remain in tail accounting through drain; only completions
inside the window contribute goodput. Every offered write must reconcile exactly.
At512/1024 clients, explicit bounded overload rejection is allowed only by a
frozen `bounded-explicit-rejection` profile, never silently at256 acceptance.
The job's `evidence.readOracleInput` names a pinned oracle-role
`triplex-devloop-read-oracle/1` catalog. Its `entries[oracleKey]` binds taskClass,
logicalTaskId, paramsSha256, complete basis and expectedSha256. Self-reported
expected digests in an event cannot substitute for that independent catalog.
The producer still needs source review for actual query/result capture; a
controller cannot prove that trusted application code faithfully reported an
engine call merely by inspecting JSON.

Three-run promotion requires at least10,000 observations per required class,
the worst candidate read score at least1.10 times the best control score, and
the worst candidate P99 no more than1.10 times the best control P99 in every
required class. Goodput is the equal-class geometric mean. This is separation
beyond **observed** variation, not a formal95% confidence claim or product SLA.

The frozen writer rate is half the minimum measured visible-commit capacity over
the five correct controls; max gap is `max(3/rate,1.10*largest control gap)` and
backlog is `max(1,ceil(1.10*largest control backlog))`. Require95% visible commits
inside the window, stable backlog, actual overlapping readers, and complete
reconciliation during bounded drain. The driver must enforce the shared
ten-entity correction command shape; another width is a distinct profile.

## Process ownership and limits

A new process-group leader waits for the durable START handshake. If its parent
dies, closing the control pipe triggers group termination. Normal cancellation,
deadline, RSS and log denial signal the group, escalate if needed and observe
terminal cleanup before releasing the reservation. Live descendants after a
successful main command are a lifecycle failure, not PASS.

The sampler observes only owned group PIDs, RSS and CPU, plus controller RSS.
It does not inventory the computer. Watchdogs can overshoot between samples;
RSS summation can double-count shared pages. External server/VM memory must be
reserved separately. A network client abort does not establish backend query
termination or durable ACK reconciliation. Trusted commands must not daemonize
outside their registered process group, mutate unrelated paths or bypass the
shared queue. This controller is not an OS security sandbox.

## Tests

```sh
tools/bootstrap/with-env.sh node --test --test-concurrency=1 qualification/devloop/test/*.test.mjs
```

Tests use newly owned `.local/devloop-tests/` component contexts on the same
bounded mount. They exercise real processes/descendants, deadlines, denial,
oracle failure, fair admission, ownership and retained receipts. They do not
qualify DuckDB, XTDB, QLever or256-client service capacity. Initial failures and
their repairs are preserved in `evidence/controller-initial-failures.json`.

## Fresh public regression recipes

The actual private/native package gate can be prepared with a fresh id:

```sh
tools/bootstrap/with-env.sh node --max-old-space-size=256 qualification/devloop/recipes/prepare-public-regression.mjs native-consumer new-native-consumer-id
tools/bootstrap/with-env.sh node --max-old-space-size=256 scripts/triplex-devloop.mjs enqueue --manifest .runtime/duckdb/new-native-consumer-id.json
tools/bootstrap/with-env.sh node --max-old-space-size=256 scripts/triplex-devloop.mjs execute --job new-native-consumer-id --executor worker-name
```

It requires the canonical `dependency-zip-registry`, `foundation-xtdb` and
`foundation-qlever` owners; it starts no service. It packs13 real packages,
installs a clean consumer through the captured registry, typechecks exports,
checks SQLite default/opt-in read metadata and CLI behavior, then executes actual
schema-handle writes/Duck int64+fractional interval reopen/typed XTDB and QLever
native reads current/reopen. The private Duck package receives the exact qualified
native artifact directory explicitly; no C++ binary is bundled or rebuilt.

Use `postgres` as the preparation mode for the real PostgreSQL integration suite
with `aux-postgres-compiler-tests` registered. Its credential URL is read inside
the admitted process from the owned file and never placed in the manifest.
The recipe requires positive actual tests and zero skipped/pending/todo checks.
`pack` prepares the13-package consumer check without live-native API execution.
See [current status](../../wiki/status.md) for scoped receipts and retained
first failures. These commands produce new attempts, not package publication.
