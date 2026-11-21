#!/usr/bin/env bash
set -euo pipefail
[[ ${1:-} == selftest ]]
cd /opt/datomic
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src
export DATOMIC_JAVA_OPTS="-Xms96m -Xmx768m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC"
export TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1
for mode in 0 1; do
  TX2_SUBJECT_NARROW_REVISION=$mode TX2_SUBJECT_REUSE_PREDECESSOR=$mode bin/run /config/gate.clj
done
