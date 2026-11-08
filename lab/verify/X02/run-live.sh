#!/bin/bash
# V-X02: run the verifier's live checks (verify-live.ts) or the author's (xtdb-native-x02.ts) on the shared
# tx2-xtdb-dev resident (:5470) through heavy.mjs. Usage: lab/verify/X02/run-live.sh verifier|author <name>
# Needs lab/verify/X02/node_modules -> ../../../packages/qualification/node_modules (not committed) and built dist.
set -u
cd "$(dirname "$0")/../../.."
which="$1"; name="$2"
out=/Users/sam/Claude/Projects/triplex-db-2/V-X02
mkdir -p runs/X02 "$out"
unset TRIPLEX_BACKEND TRIPLEX_XTDB_NATIVE_LANGUAGE
export XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5470/xtdb
export TRIPLEX_LAB_SLOT_OWNER=/Users/sam/projects/triplex-db-2/lab/locks/xtdb-dev/owner.json
if [ "$which" = "author" ]; then
  node lab/bin/heavy.mjs --label "V-X02 author live $name" -- node packages/qualification/workloads/xtdb-native-x02.ts --output "runs/X02/$name.json"
  code=$?; cp "runs/X02/$name.json" "$out/" 2>/dev/null
else
  node lab/bin/heavy.mjs --label "V-X02 verifier live $name" -- node lab/verify/X02/verify-live.ts "$out/$name.json"
  code=$?
fi
echo "exit $code"
exit $code
