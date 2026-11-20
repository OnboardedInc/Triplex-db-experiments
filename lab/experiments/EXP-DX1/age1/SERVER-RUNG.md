# Running one rung

Use the verified SCALE1 transfer and the exclusively held, already restored pooled seed. Start with the 1B rung. The [source census](SEED-ADOPTION.md) suggests 430M starting records. A rate of 24k records/s would add 570M in 6.60 h. With 3 h for measurements and native copies that is 9.60 h and $10.46. The original 820M assumption gives 5.50 h and $6.00 at 20k/s. The cap is 9.9 h, at most $10.79. A 430M seed requires at least 23.0k records/s after reserving three hours. Even if the initial rate prior is lower, the command can run a bounded 100,000-save calibration and continues aging only if the fresh rate fits. The working prior of 20k/s would miss the 430M scenario's cap.

The campaign ends at 1B. The [growth model](GROWTH-MODEL.md) retains the projections for larger databases.

## Invocation

```sh
node lab/experiments/EXP-DX1/age1/server.mjs forecast 430000000 1000000000 24000 3
node lab/experiments/EXP-DX1/age1/server.mjs "$AGE_RUNG_CONFIG"
```

The Linux driver is responsible for the existing SQL/transactor stack and the exclusive seed. Give it an already verified SCALE1 `image.json` and `transfer.json` whose SHA-256s came from the transfer controller. A single output directory per database is required across stops. Exclude other writers from the live scope. Provision a different SQL database for restores, without a transactor, and install the official Datomic PostgreSQL table there. Use storage whose paths are visible to this driver and its observed Java processes. Clock synchronization and filesystem free-space reads assume a single Linux server. Keep the source checkout, image, transfer and settings policy immutable. Refresh the live process IDs in the config and observed settings after restarting the stack.

The config keys are shown below. Values in angle brackets are supplied by the driver from its admitted stack and artifacts.

```json
{
  "source": "<clean committed AGE1 code revision>",
  "target": 1000000000,
  "fromRecords": 430000000,
  "ratePrior": 20000,
  "reserveHours": 3,
  "maxHours": 9.9,
  "maxUsd": 10.80,
  "seconds": 120,
  "activePerAccount": 2000,
  "output": "<durable run directory>",
  "dataMount": "<actual PostgreSQL filesystem>",
  "copyMount": "<backup directory on reserved filesystem>",
  "maxSqlBytes": 270000000000,
  "copyHeadroomBytes": 260000000000,
  "bytesPerAddedRecord": 300,
  "image": "<verified SCALE1 image.json>",
  "imageSha": "<image sha256>",
  "transfer": "<verified SCALE1 transfer.json>",
  "transferSha": "<transfer sha256>",
  "datomicSha": "<pinned Datomic 1.0.7745 transactor jar sha256>",
  "transactorPid": "<linux pid as a number>",
  "transactorProperties": "<absolute properties path in transactor mount>",
  "transactorPropertiesSha": "<actual properties hash>",
  "javaPids": ["<all pre-existing java pids as numbers>"],
  "measureSettings": "<observed measurement settings JSON path>",
  "expectedMeasureSettings": {
    "txPid": "<transactor pid as a number>", "group": false, "saveLedger": true, "smallRows": true,
    "properties": { "memory-index-threshold": "32m", "memory-index-max": "512m",
                    "object-cache-max": "512m", "index-parallelism": "1" }
  },
  "peerHeap": "2g",
  "peerCache": "768m",
  "copyHeap": "2g"
}
```

Set `AGE_JAVA` and `AGE_DATOMIC_HOME` to the admitted JDK and distribution. Put credentials in the runtime environment through `DATOMIC_URI_TEMPLATE`, `AGE_SQL_JDBC`, `AGE_SQL_PASSWORD` and `AGE_RESTORE_URI_TEMPLATE`. Both Datomic URI templates use `{db}`. The driver verifies they address distinct SQL databases. Supply the long-lived JVMs' native event logs from the same window for `tx/process`, SQL waits and index events. The runner attaches fresh GC and safepoint outputs to every listed Java process. Archive those logs and the sealed output separately.

Solo K remains the measurement format. Use the standard transactor properties for both rolling aging and the measurement windows. This avoids measuring a retained tuning or grouping change. Section [aging policies](AGING-ARMS.md) contains alternate load priors. With evidence of memory-index stalls, repeat a bounded prefix with larger memory-index settings after checking heap and object cache. With CPU-bound index work and headroom, vary index parallelism. With cold storage waits, vary object cache, Valcache and disk separately. [Datomic capacity](https://docs.datomic.com/operation/capacity.html) · [Caching](https://docs.datomic.com/operation/caching.html)

## Outputs and recovery

The command counts native datoms, enforces the forecast and SQL/disk ceilings, then writes 25k-save segments after the first calibration segment. Each checkpoint covers a successful native-prefix byte comparison. If killed between submission and checkpoint, the next run reads the exact physical prefix at the observed logical head and verifies each pending stored datom before sending more. Recovery stops on scope, cut, manifest, datom, or lateness contradictions. A partially measured window starts a new timed window at the next free position; the prior attempt stays on disk. Completed timed cells are reused only for the matching source/config/calibration and database.

Measure one quiet account at 3.5/s alone and on an identical offer schedule beside the other nine accounts at 50/s aggregate. The third 50/s window requests an index while writes are in progress. The product calls share one ordered sender; latency is from the scheduled offer and from actual dispatch. Warm and fresh JVM point reads cover active and year-idle seeded tasks. Pinned reads and feed rows verify exact commanded bytes. The scope's full person reach path and storage-cold operation are separate treatments. A directory census runs in its own JVM.

The terminal seal requires a full native backup verification at the exact final physical cut and fresh restore readback of current/pinned rows, feed and final receipt. Backups are retained once per rung. Retain each restore name from the seal as the identity for scratch cleanup after the driver archives it. A failed run can leave a private restore in the dedicated SQL destination. Keep that state separate from the live seed. There are no lifecycle or cleanup operations on other services in this command.

The Linux runner and rates require live server verification. The Mac is used only for small fidelity and correctness.
