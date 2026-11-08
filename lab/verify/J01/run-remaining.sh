#!/bin/sh
set -u
verify_failed=0
# Retry reason: normalize QLever operation UUIDs in both literal and base64 IRI forms; no implementation change or repeated build.
node --import tsx lab/verify/J01/offline.mjs > lab/verify/J01/offline.log 2>&1 || verify_failed=1
(cd packages/xtdb && ../../node_modules/.bin/vitest run test/commit-encoding.test.ts test/client-parameters.test.ts) > lab/verify/J01/xtdb-unit.log 2>&1 || verify_failed=1
(cd packages/qlever && ../../node_modules/.bin/vitest run test/commit-encoding.test.ts) > lab/verify/J01/qlever-unit.log 2>&1 || verify_failed=1
node --import tsx lab/verify/J01/parameter-regression.mjs > lab/verify/J01/parameter-regression.log 2>&1 || verify_failed=1
node lab/verify/J01/live.mjs xtdb > lab/verify/J01/live-xtdb.log 2>&1 || verify_failed=1
node lab/verify/J01/live.mjs qlever > lab/verify/J01/live-qlever.log 2>&1 || verify_failed=1
node lab/verify/J01/identity.mjs after || verify_failed=1
exit "$verify_failed"
