# XN-S2 durable evidence index

Root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/`.
Initial Kafka run: 43 files, 92,838,963 bytes, covered by the adjacent `SHA256SUMS`, with paths relative to that root. The Postgres continuation has its own manifest below.
The shipped `xtdb.jar` is 92,716,839 bytes and intentionally stays outside Git. No acceptance evidence is claimed.

| Files | What they establish |
| --- | --- |
| `images.json`, `image-files.txt`, `xtdb.jar`, `copy-lib.log` | Local image identities, effective image filesystem and copied shipped classpath; no `lib/` directory |
| `jar-inspection.json`, `jar-inspection-console.txt` | All 50,941 jar entries inspected for Kafka/object-store names and XTDB ServiceLoader registrations |
| `config-container-id.txt`, `config-container.json`, `kafka-config-start.log`, `kafka-config-start.exit` | Fresh writer config parse fails on missing `!Kafka`; exact container/image/caps and exit 1 |
| `inspection-window.json`, `inspection-window-ended.txt` | First owned hold's timestamps and keep-awake flag |
| `source-binding.json` | Inspection scripts/YAML hashes at preparation commit `444e1f668046025b4a61701eb03ec24a11b20946` |
| `cooldown-attempt1.json`, `source-binding-2.json` | Pre-admission runner defect retained and corrected runner source at commit `44edb2e7` |
| `kafka-container-id.txt`, `kafka-container.json`, `kafka.log`, `kafka-ready.txt`, `kafka-topics.txt` | Broker-only startup, final identity/caps/mounts/environment, ready log and empty topic metadata |
| `kafka-window-started.txt`, `kafka-window-ended.txt` | Second owned hold, 82 seconds |
| `kafka-sample-{0..6}.txt`, `kafka-sample-{0..6}-time.txt` | Seven raw cgroup CPU/memory and log-directory-size samples across 60 seconds |
| `kafka-summary.json`, `summary-console.txt`, `analysis-binding.json` | Diagnostic arithmetic, exact analysis helper hash and container/source binding; no PASS |
| `cleanup-containers.txt`, `cleanup-volumes.txt`, `cleanup-networks.txt`, `cleanup-observed-at.txt` | Empty task-prefix resource listings after exit-trap cleanup |

Verify from the worktree:

```sh
node lab/bin/heavy.mjs --label XN-S2-manifest-verify -- bash -c 'cd /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2 && shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/xn-s2/lab/experiments/EXP-XN1/spike-s2/SHA256SUMS'
```

The report contains the measured limitations and observation audit. Source files in this directory are the standalone probes; no shared engine or lab tools were modified.

## Postgres-backed log continuation

Subdirectory: `postgres-log/`, **48 files, 1,224,662 bytes**, covered by `SHA256SUMS-postgres` relative to the same durable root. The original manifest and original runtime evidence were preserved.

| Files under `postgres-log/` | Contents |
| --- | --- |
| `class-constants.json`, `class-constants-excerpt.txt`, `bundled-postgres.clj`, `resource-search.json` | Shipped classfile constants and bundled source; no Postgres log or object-store extension service registration; raw class index stays outside Git |
| `source-binding.json`, `images.json`, `bytecode-container-id.txt`, `javap.txt`, `lock-owner.json`, `window-*.txt`, `keep-awake-start.txt` | First helper attempt: missing javap, retained; no broker started; keeper already running and not stopped |
| `attempt2/source-binding.json`, `attempt2/images.json`, `attempt2/lock-owner.json`, `attempt2/window-*.txt`, `attempt2/keep-awake-start.txt` | Actual parser/reflection attempt bound to source commit `5c4d52dc0e70c67acd8374a037ef5da084c95b86`; keeper already running and not stopped |
| `attempt2/introspect*` | Successful shipped-JVM interface, serializer-field and default-port observations; exact container metadata |
| `attempt2/{log-types,storage-types,remote-fields,postgres-log,object-store-types}*` | Five parser failures, logs, exit statuses, creation IDs and final container inspections |
| `indexer-first-check.txt`, `observation-index.json` | Retained timestamp-resolution check finding, then validated diagnostic index with exact helper SHA; no acceptance verdict |
| `cleanup-{containers,volumes,networks}.txt`, `cleanup-observed-at.txt` | Fresh empty task-prefix listings |

Verify the new manifest as well:

```sh
node lab/bin/heavy.mjs --label XN-S2-postgres-manifest-verify -- bash -c 'cd /Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2 && shasum -a 256 -c /Users/sam/projects/triplex-db-2/.claude/worktrees/xn-s2/lab/experiments/EXP-XN1/spike-s2/SHA256SUMS-postgres'
```

## Kafka and shared-S3 continuation

Subdirectory `live/`: **430 files, 135,934,471 bytes**, covered by `SHA256SUMS-live` relative to the durable root. Manifest SHA256: `4c6a79c366ad0d8c16b814beeb791bc359d3a7044a4553582d0aa70b149818ab`. All earlier manifests were freshly reread and verified as well.

| Files | Meaning |
| --- | --- |
| `images.json`, `xtdb-aws.jar`, `aws-classes.json`, `extract-*` | Local supplied image IDs/sizes and actual shipped serializer/class inspection |
| `topology-2/`, `topology-audit-*.json` | Real shared Kafka/MinIO proof, stopped/restarted follower identity, exact changing values at both bases, S3 objects and leader/compactor metrics; independently recomputed observation audit |
| `control-commits-2/` | Retained history-postflight harness failure; no timing adopted |
| `control-commits-3/` | Corrected, freshly rechecked fixture and same-day Local commit/reader-contention controls |
| `control-reads-1/`, `control-reads-rest-1/` | Point-read controls, retained bulk timeout, and unattempted point/pinned cases resumed without rerunning complete cases |
| `q1-*/`, `lag-*/`, `reads-*/` | Executed matrices, when present; an empty or absent directory is not measurement evidence |
| Each window's `sources/`, `source.json`, `binding.json`, inspections, `driver/`, `commands.json`, `released.txt` | Source preimages/hashes, exact inputs/containers/cgroups, raw samples, count/byte postflights, actual commands and cleanup |
| `collection-*.json`, `collected.json` | Immutable collection attempts and final diagnostic recomputation; no engine PASS |
| `cleanup-*.json` | Final fresh task-prefix volume/container/network observations and volume removals |

Fresh verification receipt: `live-manifest-verification.json`, SHA256 `d08a254e7619ae210a7a33c937987fbdd5cf7ea1c49ce8bda8743fd7c74f3744`. It binds all three manifest hashes, file counts and the verifier's actual source hash. It is outside the `live/` manifest to avoid a self-referential hash.

```sh
node lab/bin/heavy.mjs --label XN-S2-final-evidence -- python3 lab/experiments/EXP-XN1/spike-s2/live/finalize-evidence.py
```

`REPORT.md` states the actual completed/missing cells and limitations; this index does not promote missing or partial stages.
