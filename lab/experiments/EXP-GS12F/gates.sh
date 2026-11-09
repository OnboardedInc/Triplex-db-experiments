#!/bin/sh
# [EXP-GS12F] Why: retain independent command exits; rejected: piping gates through tee (masks failures).
set -u
trap 'exit 130' INT TERM
cd "$(dirname "$0")/../../.."
evidence=lab/experiments/EXP-GS12F/evidence
export WRANGLER_LOG_PATH="$PWD/$evidence/wrangler.log"
export WRANGLER_SEND_METRICS=false
export XDG_CACHE_HOME="$PWD/.cache/gs12f"
export TURBO_TELEMETRY_DISABLED=1
export npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
export npm_config_cache="$PWD/.cache/npm"
run_gate() {
  label=$1
  shift
  "$@" > "$evidence/$label.log" 2>&1
  result=$?
  printf '%s %s\n' "$label" "$result" >> "$evidence/exits.txt"
}
node -e 'const f=require("node:fs").statfsSync("."); if(f.bavail*f.bsize<5*1024**3) throw new Error("less than 5 GiB free")' || exit 1
python3 - <<'PYTHON'
import hashlib,json,pathlib,subprocess,time
paths=subprocess.check_output(['git','ls-files','-co','--exclude-standard'],text=True).splitlines()
files={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in paths if pathlib.Path(p).is_file() and not p.startswith('lab/experiments/EXP-GS12F/evidence/')}
pathlib.Path('lab/experiments/EXP-GS12F/evidence/source.json').write_text(json.dumps({'startedAt':time.time(),'base':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':files},indent=2)+'\n')
PYTHON
: > "$evidence/exits.txt"
run_gate build node_modules/.bin/turbo run build --cache-dir .cache/turbo --filter=@triplex-build/triplex --filter=@triplex-build/triplex-testkit --filter=@triplex-build/triplex-xtdb --filter=@triplex-build/triplex-qlever
run_gate typecheck-core node_modules/.bin/tsc --noEmit -p packages/core/tsconfig.json
run_gate unit-core sh -c 'cd packages/core && ../../node_modules/.bin/vitest run'
run_gate unit-lanes sh -c 'cd packages/xtdb && ../../node_modules/.bin/vitest run; x=$?; cd ../qlever && ../../node_modules/.bin/vitest run; q=$?; test "$x" = 0 && test "$q" = 0'
run_gate typecheck node_modules/.bin/turbo run typecheck --cache-dir .cache/turbo
run_gate integration-values sh -c 'cd test/integration && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run_gate cloudflare sh -c 'cd packages/cloudflare && ../../node_modules/.bin/vitest run --config vitest.workerd.config.ts test/conformance.workerd.test.ts'
run_gate sqlite sh -c 'cd packages/sqlite && ../../node_modules/.bin/vitest run test/conformance.test.ts'
if ! rg -q "^typecheck 0$" "$evidence/exits.txt"; then exit 1; fi
run_gate xtdb-live env XTDB_INTEGRATION=1 XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5470/xtdb sh -c 'cd packages/xtdb && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run_gate qlever-live env QLEVER_INTEGRATION=1 QLEVER_URL=http://127.0.0.1:7070 sh -c 'cd packages/qlever && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run_gate other-adapters node_modules/.bin/vitest run --config lab/experiments/EXP-GS12F/vitest.config.ts

run_gate pack sh -c 'node_modules/.bin/turbo run build --cache-dir .cache/turbo --filter=@triplex-build/triplex-cli --filter=@triplex-build/triplex-duckdb && TRIPLEX_PACK_ARTIFACT_ROOT=.cache/gs12f-pack node scripts/check-packages.mjs'
if rg -q ' [1-9][0-9]*$' "$evidence/exits.txt"; then exit 1; fi
