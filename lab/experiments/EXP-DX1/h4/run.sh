#!/usr/bin/env bash
# [DX-H4] Why: give client four CPUs without borrowing the engine's placement.
# Rejected: more reader threads on two CPUs (client saturation invalidates P1).
set -euo pipefail
# [DX-T1] Why: one switch follows driver, workers and every JVM; summary is the benchmark default.
# Rejected: requiring a second diagnostic run to discover where a tail came from.
export TRIPLEX_TRACE_LEVEL=${TRIPLEX_TRACE_LEVEL:-summary}
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4}
# [DX-R3] Why: pass the same explicit read path to both matched arms; the default remains gateway.
# Rejected: setting a host variable that the isolated driver never receives.
export DX_DRIVER_ENV="TRIPLEX_DATOMIC_LAYOUT=lean NODE_OPTIONS=--max-old-space-size=${DX_DRIVER_HEAP_MB:-6144} DX_READ_PATH=${DX_READ_PATH:-gateway} DX_STRICT_RECORD_CLOCKS=${DX_STRICT_RECORD_CLOCKS:-1} DX_R3_SOURCE_DIAGNOSTICS=${DX_R3_SOURCE_DIAGNOSTICS:-0} TRIPLEX_NODE_MAIN_CPUS=${DX_MAIN_CPU:-} TRIPLEX_NODE_WORKER_CPUS=${DX_WORKER_CPUS:-} DX_MODEL_COMPACT=${DX_MODEL_COMPACT:-0} DX_PUBLICATION_MODE=${DX_PUBLICATION_MODE:-deferred} DX_SERVER_RECORD_TIME=${DX_SERVER_RECORD_TIME:-1} DX_NATIVE_GATES=${DX_NATIVE_GATES:-0}"
export DX_CPUS_PG=${DX_CPUS_PG:-0} DX_CPUS_TX=${DX_CPUS_TX:-0,1} DX_CPUS_GW_WRITE=${DX_CPUS_GW_WRITE:-1} DX_CPUS_GW_READ=${DX_CPUS_GW_READ:-2,3} DX_ENGINE_CPUS=4
# [DX-R3-P9] Why: J/K measured Serial GC on a one-CPU transactor (531 ms trace pause) versus G1 (86 ms).
# Rejected: changing the default two-CPU placement, whose JVM already selects G1.
if [[ $DX_CPUS_TX =~ ^[0-9]+$ && -z ${DX_TX_JAVA_OPTS:-} ]]; then
  export DX_TX_JAVA_OPTS='-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=25'
fi
export DX_CPUS_DRIVER=${DX_CPUS_DRIVER:-4,5,6,7} DX_READER_THREADS=${DX_READER_THREADS:-3} DX_DRIVER_MEMORY=${DX_DRIVER_MEMORY:-8g}
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=${DX_OBJECT_CACHE:-1g} DX_INDEX_THRESHOLD=${DX_INDEX_THRESHOLD:-256m} DX_INDEX_MAX=${DX_INDEX_MAX:-1g}
export DX_GW_JAVA_OPTS='-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g'
# [DX-T1-4] Why: a same-session storage arm must reach Postgres and its recorded readback.
# Rejected: overwriting an explicit durable candidate with an unconditional wrapper value.
export DX_PG_SETTINGS=${DX_PG_SETTINGS:-'-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'}
export DX_ORACLE_ROOT=${DX_ORACLE_ROOT:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle}
exec bash lab/experiments/EXP-DX1/h3/attempt.sh "$@"
