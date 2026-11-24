#!/bin/bash
# In-memory Datomic inside the lab image, sources mounted read-only. usage: mem-run.sh <env...> -- <clojure args>
set -e
cd /opt/datomic
export DATOMIC_EXT_CLASSPATH=/opt/gateway/src PREP1_ATTEMPT=${PREP1_ATTEMPT:-w2-local}
while [[ $1 != -- ]]; do export "$1"; shift; done
shift
exec java -Xmx1500m -XX:+UseSerialGC -Dtriplex.codec.spec=/opt/gateway/codec-spec.json -cp "$(bin/classpath)" clojure.main \
  -i /exp/wfix1/regression.clj -i /exp/w2/wide_gate.clj "$@"
