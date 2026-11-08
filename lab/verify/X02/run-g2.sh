#!/bin/bash
# V-X02: one G2 native packet run on the shared tx2-xtdb-dev resident (:5470), through heavy.mjs.
# Usage: lab/verify/X02/run-g2.sh xtql|xtdb-sql|unset <name>
# Raw outputs go to runs/V-X02/ (gitignored; the runner refuses other roots) and are copied to
# /Users/sam/Claude/Projects/triplex-db-2/V-X02/ for retention.
set -u
cd "$(dirname "$0")/../../.."
language="$1"; name="$2"
mkdir -p runs/V-X02 /Users/sam/Claude/Projects/triplex-db-2/V-X02
unset TRIPLEX_BACKEND
export XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5470/xtdb
export TRIPLEX_LAB_SLOT_OWNER=/Users/sam/projects/triplex-db-2/lab/locks/xtdb-dev/owner.json
export TRIPLEX_QUERY_PATH=xtdb-native
if [ "$language" = "unset" ]; then unset TRIPLEX_XTDB_NATIVE_LANGUAGE; else export TRIPLEX_XTDB_NATIVE_LANGUAGE="$language"; fi
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
node lab/bin/heavy.mjs --label "V-X02 G2 $name" -- node packages/qualification/workloads/runner.ts \
  --output "runs/V-X02/$name-report.json" --results-output "runs/V-X02/$name-results.json"
code=$?
echo "{\"name\":\"$name\",\"language\":\"$language\",\"started\":\"$started\",\"ended\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"exit\":$code}" > "runs/V-X02/$name-exit.json"
cp runs/V-X02/$name-* /Users/sam/Claude/Projects/triplex-db-2/V-X02/ 2>/dev/null
exit $code
