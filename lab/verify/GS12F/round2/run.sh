#!/bin/sh
# [CX-VGS12F-R2] Why: preserve the original probe outcome and each new gate separately. Rejected: fail-fast hiding later controls.
set -u
out=lab/verify/GS12F/round2/evidence
export XDG_CACHE_HOME="$PWD/.cache/verify-gs12f-r2"
export npm_config_store_dir=/Users/sam/projects/triplex-db-2/.pnpm-store
node -e 'const f=require("node:fs").statfsSync("."); if(f.bavail*f.bsize<5*1024**3) throw Error("less than 5 GiB free")' || exit 1
run() { label=$1; shift; "$@" > "$out/$label.log" 2>&1; printf '%s %s\n' "$label" "$?" >> "$out/exits.txt"; }
: > "$out/exits.txt"
date -u > "$out/started.txt"
run capture python3 lab/verify/GS12F/round2/capture.py
run probes node_modules/.bin/vitest run --config lab/verify/GS12F/round2/vitest.config.ts
run core sh -c 'cd packages/core && ../../node_modules/.bin/vitest run test/value-limits.test.ts test/integer.test.ts'
run qlever sh -c 'cd packages/qlever && ../../node_modules/.bin/vitest run test/value-limits-offline.test.ts'
run integrations sh -c 'cd test/integration && ../../node_modules/.bin/vitest run test/value-limits.test.ts'
date -u > "$out/finished.txt"
