#!/usr/bin/env bash
# [DX-COMPACT1] Why: use one fresh database on a provisioned SQL stack and the exact staged source.
# Rejected: reusing an incumbent database name or inferring physical-machine throughput from the Mac.
set -euo pipefail
[[ $(uname -s) == Linux ]]
: "${DATOMIC_HOME:?path to the pinned Datomic Pro 1.0.7745 distribution}"
: "${DATOMIC_URI_TEMPLATE:?isolated SQL transactor URI template with {db}}"
: "${COMPACT_JDBC:?same PostgreSQL cluster as the transactor}"
: "${COMPACT_SQL_PASSWORD:?supplied by the isolated stack}"
[[ $DATOMIC_URI_TEMPLATE == datomic:sql://*'{db}'* ]]
here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo=$(git -C "$here" rev-parse --show-toplevel)
git -C "$repo" diff --quiet HEAD -- lab/experiments/EXP-DX1/compact1 packages/datomic/gateway \
  packages/datomic/src/codec-spec.json lab/world/W0/schema.json
if [[ -n $(git -C "$repo" ls-files --others --exclude-standard -- lab/experiments/EXP-DX1/compact1 packages/datomic/gateway) ]]; then
  echo 'Use a clean compact runtime checkout' >&2
  exit 1
fi
export COMPACT_ATTEMPT COMPACT_SOURCE DATOMIC_EXT_CLASSPATH COMPACT_W0_SCHEMA
COMPACT_ATTEMPT=$(node -p 'require("node:crypto").randomUUID()')
COMPACT_SOURCE=$(git -C "$repo" rev-parse HEAD)
COMPACT_W0_SCHEMA="$repo/lab/world/W0/schema.json"
DATOMIC_EXT_CLASSPATH="$here/src:$repo/packages/datomic/gateway/src"
export DATOMIC_JAVA_OPTS="${DATOMIC_JAVA_OPTS:--Xms2g -Xmx4g} -Dtriplex.codec.spec=$repo/packages/datomic/src/codec-spec.json"
cd "$DATOMIC_HOME"
exec bin/run -m triplex.compact.fleet "${1:-100000}" "${2:-60}" 235 394 "${3:-24000}"
