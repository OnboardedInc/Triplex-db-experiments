#!/usr/bin/env bash
# [DX-H4] Why: give client four CPUs without borrowing the engine's placement.
# Rejected: more reader threads on two CPUs (client saturation invalidates P1).
set -euo pipefail
export DX_STACK_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4
export DX_DRIVER_ENV="TRIPLEX_DATOMIC_LAYOUT=lean NODE_OPTIONS=--max-old-space-size=${DX_DRIVER_HEAP_MB:-6144}"
export DX_CPUS_PG=0 DX_CPUS_TX=0,1 DX_CPUS_GW_WRITE=1 DX_CPUS_GW_READ=2,3 DX_ENGINE_CPUS=4
export DX_CPUS_DRIVER=4,5,6,7 DX_READER_THREADS=${DX_READER_THREADS:-3} DX_DRIVER_MEMORY=8g
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g
export DX_GW_JAVA_OPTS='-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g'
export DX_PG_SETTINGS='-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB'
export DX_ORACLE_ROOT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3/oracle
exec bash lab/experiments/EXP-DX1/h3/attempt.sh "$@"
