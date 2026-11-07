# Public load driver

`runner.ts` executes real public Triplex writes and the five registered read
surfaces. It starts no engine. An admitted controller job is mandatory. This
first profile measures typed point reads at current and historical cuts; it
does not qualify all71 business tasks, the10m target, or production latency.

Seed and load are separate jobs. Seed uses500 assertions per atomic command,
distinct entities, and either1 or10 active domain facts per entity. Dense facts
include exact integers, binary64, refs, datetime, JSON and blob descriptors.
Each correction atomically retracts and replaces one name on ten entities.
The writer has a separate runtime root and verifies public read visibility.
Uncertain acknowledgements reconcile command receipts without replay.

The frozen specification embeds the existing Triplex `TypeExpr` schema and
attribute types. The write mapping and native point query use the same
attribute handles. This raw `Triples` calibration prototype does not persist
config nodes, entity-presence assertions or type/version events. Reports count
distinct domain-fact subjects separately and report those other event counts
as zero. JSON/blob fields explicitly use raw `TypeExpr.any`; full entity schema
delegation remains a separate qualification gate.

Capture a fresh backend closure with the existing packet preparer, then create
the seed recipe. All commands use the private environment wrapper:

```sh
tools/bootstrap/with-env.sh node packages/qualification/workloads/prepare-native-job.mjs --job load-xtdb-base-v1 --query-path xtdb-native
tools/bootstrap/with-env.sh node packages/qualification/load/prepare-job.mjs --base-manifest qualification/native-jobs/load-xtdb-base-v1/manifest.json --job load-xtdb-seed-v1 --stage seed --entities 1000 --facts-per-entity 1 --maximum-writes 10
tools/bootstrap/with-env.sh node scripts/triplex-devloop.mjs enqueue --manifest qualification/load-jobs/load-xtdb-seed-v1/manifest.json
```

Run the owned queue as documented in
[`qualification/devloop/README.md`](../../../qualification/devloop/README.md).
After the seed job passes, pin its actual `artifacts/fixture.json`:

```sh
tools/bootstrap/with-env.sh node packages/qualification/load/prepare-job.mjs --base-manifest qualification/native-jobs/load-xtdb-base-v1/manifest.json --job load-xtdb-32-v1 --stage load --spec qualification/load-jobs/load-xtdb-seed-v1/spec.json --fixture .devloop/jobs/load-xtdb-seed-v1/attempts/0001/artifacts/fixture.json --clients 32 --duration-ms 5000 --dispatch 32 --write-rate 0.2
```

Here "passes" requires the canonical scheduler publication and retained-byte
verification. A worker's `PASS` report or standalone `terminal.json` is not a
published result if the controller died before anchoring it in canonical state.
Keep that attempt and its reservation pending until the owned reconciliation
protocol resolves it. The native142 refresh encountered this exact controller
publication failure; its semantic output was retained without being relabelled
as a published pass.

The same command accepts `--clients 256`, `--mode open-loop --read-rate 256`,
and explicit512/1024 stress populations. Logical population, dispatch slots, queues and provider
transport capacity are reported separately. Failed or rejected offers remain
in raw events. Latency begins at the scheduled offer; complete decoding,
validation and result hashing precede the finish timestamp. A fixed window
counts goodput, and the bounded tail remains visible.

The independent oracle derives answers from the generator and correction
ordinal. Public seed receipts supply scope, position and recorded-time
identities. It never consumes backend query answers. Every read must return
its actual `ReadBasis`; current reads do not invent a recorded-time filter.
Raw events retain exact normalized result bytes, cut, parameter hash and
native query/parameter traces. The controller independently checks these
against the pinned catalog.

One monotonic clock drives scheduled offers, queue admission, dispatch, ACK,
visibility and completion. Timer wakeups recheck that clock before offering a
request; fractional timer rounding cannot create negative measured latency.
The read deadline begins at its scheduled offer. Expired queued requests never
enter the backend, and an admitted call receives only its remaining budget for
native cancellation or Effect interruption. Queue wait, service and tail drain
remain separate observations. A client cancellation is not proof of physical
engine reclamation.

The initial512/1024 stress traces failed this timing invariant and remain
rejected in `qualification/evidence/load-fractional-pacer-failure-v1.json`.
Fresh scopes are required for their repaired reruns. A functional byte pass
does not imply read-availability or writer-liveness acceptance: the initial
256 open-loop run returned640 correct reads but its writer became visible
after the five-second window. Its in-window liveness fraction is explicitly0.

For three independent repeats, seed an explicitly admitted tiny
`--instances 3` bundle and select a different `--instance` per run. All repeats
pin the same bundle/catalog and start with fresh identical history. An
instance cannot be reused after corrections. Both query surfaces continue to
share their foundation and write protocol. Tiny replicas are charged; larger
stages require admission and do not authorize target-scale copies.

The staged generator currently admits10..20,000 entities. Advancement from
1k to5k to20k needs measured owned physical growth and the50GB guard. Metadata,
journal/history, blob descriptors and native helper costs must remain visible.
Domain fact counts alone are not physical disk evidence.

`--writer-mode closed-loop-capacity --phase capacity-calibration` measures a
single reserved writer under256 logical readers. Exhausting the frozen writer
command catalog fails the run. A capacity control is different from the
initial0.2/s diagnostic schedule. Measurement jobs require a pinned
`--calibration` receipt, use its offered writer rate, and rely on the existing
controller for three-repeat and10k-per-class adequacy/promotion gates.

Pure oracle checks: `tools/bootstrap/with-env.sh node --test packages/qualification/load/model.test.ts`.
