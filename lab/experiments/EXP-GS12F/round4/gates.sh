#!/bin/sh
# [EXP-GS12F-R4] Why: preserve each command's real exit and raw output. Rejected: pipeline success as semantic proof.
set -u
cd "$(dirname "$0")/../../../.."
evidence=lab/experiments/EXP-GS12F/round4/evidence
export WRANGLER_LOG_PATH="$PWD/$evidence/wrangler.log"
export WRANGLER_SEND_METRICS=false
export XDG_CACHE_HOME="$PWD/.cache/gs12f"
export TURBO_TELEMETRY_DISABLED=1
export npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
export npm_config_cache="$PWD/.cache/npm"
node -e 'const f=require("node:fs").statfsSync("."); if(f.bavail*f.bsize<5*1024**3) throw new Error("less than 5 GiB free")' || exit 1
attempt=${1:?attempt required}
mkdir -p "$evidence/$attempt"
evidence="$evidence/$attempt"
: > "$evidence/exits.txt"
mkdir -p "$evidence/probes"
export GS12F_EVIDENCE_DIR="$PWD/$evidence/probes/"
python3 lab/experiments/EXP-GS12F/round4/capture.py "$evidence/sources.json" > "$evidence/capture.log" 2>&1 || exit 1
run() {
 label=$1
 shift
 "$@" > "$evidence/$label.log" 2>&1
 result=$?
 printf '%s %s\n' "$label" "$result" >> "$evidence/exits.txt"
}
run container-before docker inspect --format '{{json .Id}} {{json .Image}} {{json .State.StartedAt}}' tx2-xtdb-dev
run probes node_modules/.bin/vitest run --config lab/experiments/EXP-GS12F/round4/vitest.config.ts
run live node_modules/.bin/vitest run --config lab/experiments/EXP-GS12F/round4/live.config.ts
run container-after docker inspect --format '{{json .Id}} {{json .Image}} {{json .State.StartedAt}}' tx2-xtdb-dev
run container-stability cmp "$evidence/container-before.log" "$evidence/container-after.log"
run core sh -c 'cd packages/core && ../../node_modules/.bin/vitest run'
run xtdb sh -c 'cd packages/xtdb && ../../node_modules/.bin/vitest run'
run qlever sh -c 'cd packages/qlever && ../../node_modules/.bin/vitest run'
run integration sh -c 'cd test/integration && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run sqlite sh -c 'cd packages/sqlite && ../../node_modules/.bin/vitest run test/conformance.test.ts'
run cloudflare sh -c 'cd packages/cloudflare && ../../node_modules/.bin/vitest run --config vitest.workerd.config.ts test/conformance.workerd.test.ts'
run build node_modules/.bin/turbo run build --cache-dir .cache/turbo --filter=@triplex-build/triplex --filter=@triplex-build/triplex-testkit --filter=@triplex-build/triplex-xtdb --filter=@triplex-build/triplex-qlever --filter=@triplex-build/triplex-sqlite --filter=@triplex-build/triplex-postgres --filter=@triplex-build/triplex-cloudflare --filter=@triplex-build/triplex-duckdb --filter=@triplex-build/triplex-foundationdb
run duckdb-codec node --test packages/duckdb/test/value-boundary.test.mjs
run typecheck node_modules/.bin/turbo run typecheck --cache-dir .cache/turbo
run pack env TRIPLEX_PACK_ARTIFACT_ROOT=.cache/gs12f-pack node scripts/check-packages.mjs
python3 - "$evidence/sources.json" "$evidence/source-stability.json" <<'PYTHON'
import hashlib,json,pathlib,sys
source=json.loads(pathlib.Path(sys.argv[1]).read_text())
changed=[r['path'] for r in source['sourceFiles'] if hashlib.sha256(pathlib.Path(r['path']).read_bytes()).hexdigest()!=r['currentSha256']]
pathlib.Path(sys.argv[2]).write_text(json.dumps({'sourceManifest':sys.argv[1],'changedDuringAttempt':changed},indent=2)+'\n')
assert not changed, changed
PYTHON
stable=$?
printf 'source-stability %s\n' "$stable" >> "$evidence/exits.txt"
if rg -q ' [1-9][0-9]*$'  "$evidence/exits.txt"; then exit 1; fi
