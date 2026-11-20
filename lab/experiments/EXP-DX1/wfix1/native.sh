#!/usr/bin/env bash
set -euo pipefail
[[ $# == 5 ]] || { echo 'Usage is bash native.sh JAVA DATOMIC_DIST SOURCE FIXTURES ATTEMPT' >&2; exit 2; }
java=$1 dist=$2 src=$3 fixtures=$4
export WFIX1_ATTEMPT=$5
export TX2_GROUP_COMMIT=0 TX2_FIELD_COALESCE=0 TX2_LIVE_PRIORITY=0 TX2_PREDECESSOR_LOOKUP=0
export TX2_SMALL_ROWS=0 TX2_GROUP_REUSE_PREPARED=0 TX2_GROUP_QUEUE_CLOCK=0 TX2_GROUP_STAGE_CLOCK=0
export TX2_READ_ATTRIBUTION=0 TX2_GROUP_MAX_MEMBERS=8 TRIPLEX_TRACE_LEVEL=off
unset TX2_WRITE_BUDGET_US
classpath="$src/packages/datomic/gateway/src:$dist/peer-1.0.7745.jar:$dist/datomic-transactor-pro-1.0.7745.jar:$dist/lib/*:$dist/resources"
exec "$java" -Xms64m -Xmx512m -XX:ActiveProcessorCount=2 -XX:-UsePerfData \
  "-Dtriplex.codec.spec=$src/packages/datomic/src/codec-spec.json" -cp "$classpath" clojure.main \
  -i "$fixtures/regression.clj" -i "$fixtures/policy_test.clj" -i "$fixtures/write_options_test.clj" \
  -e '(let [r (clojure.test/run-tests (quote wfix1-regression) (quote wfix1-policy) (quote wfix1-options))]
        (println "WFIX1_NATIVE" (clojure.data.json/write-str (assoc r :attempt (System/getenv "WFIX1_ATTEMPT"))))
        (shutdown-agents)
        (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))'
