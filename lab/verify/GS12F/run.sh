#!/bin/sh
# [CX-VGS12F] Why: retain command exits even for adversarial assertions expected to expose defects.
# Rejected: shell fail-fast (would suppress subsequent positive controls and offline reruns).
set -u
evidence=lab/verify/GS12F/evidence
export XDG_CACHE_HOME="$PWD/.cache/verify-gs12f"
export npm_config_cache="$PWD/.cache/npm"
export npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
node -e 'const f=require("node:fs").statfsSync("."); if(f.bavail*f.bsize<5*1024**3) throw Error("less than 5 GiB free")' || exit 1
run() {
  label=$1; shift
  "$@" > "$evidence/$label.log" 2>&1
  code=$?
  printf '%s %s\n' "$label" "$code" >> "$evidence/exits.txt"
}
: > "$evidence/exits.txt"
date -u > "$evidence/started.txt"
run audit python3 lab/verify/GS12F/audit.py
run adversarial node_modules/.bin/vitest run --config lab/verify/GS12F/vitest.config.ts
run core sh -c 'cd packages/core && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run qlever sh -c 'cd packages/qlever && ../../node_modules/.bin/vitest run test/value-limits-offline.test.ts'
run engines-before node lab/bin/engine.mjs status --lane xtdb --slot dev --holder CX-VGS12F
run xtdb-live env XTDB_INTEGRATION=1 XTDB_URL=postgres://xtdb:xtdb@127.0.0.1:5470/xtdb sh -c 'cd packages/xtdb && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
run engines-after node lab/bin/engine.mjs status --lane xtdb --slot dev --holder CX-VGS12F
date -u > "$evidence/finished.txt"
