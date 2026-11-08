#!/bin/sh
set -eu
# Retry reason: pnpm 10 rejects --store-dir on run/exec. Use the installed pinned binaries directly, no further dependency or cache writes.
for pkg in core testkit xtdb qlever; do
 (cd "packages/$pkg" && ../../node_modules/.bin/tsdown)
 case "$pkg" in xtdb|qlever) (cd "packages/$pkg" && ../../node_modules/.bin/tsc --declaration --emitDeclarationOnly --rootDir src --outDir dist);; esac
done
node lab/verify/J01/identity.mjs before
node lab/verify/J01/wire-audit.mjs > lab/verify/J01/wire-audit.log 2>&1
python3 lab/verify/J01/audit.py > lab/verify/J01/audit.log 2>&1
node --import tsx lab/verify/J01/offline.mjs > lab/verify/J01/offline.log 2>&1
(cd packages/xtdb && ../../node_modules/.bin/vitest run test/commit-encoding.test.ts test/client-parameters.test.ts) > lab/verify/J01/xtdb-unit.log 2>&1
(cd packages/qlever && ../../node_modules/.bin/vitest run test/commit-encoding.test.ts) > lab/verify/J01/qlever-unit.log 2>&1
node --import tsx lab/verify/J01/parameter-regression.mjs > lab/verify/J01/parameter-regression.log 2>&1
node lab/verify/J01/live.mjs xtdb > lab/verify/J01/live-xtdb.log 2>&1
node lab/verify/J01/live.mjs qlever > lab/verify/J01/live-qlever.log 2>&1
node lab/verify/J01/identity.mjs after
