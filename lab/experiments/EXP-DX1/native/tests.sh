#!/usr/bin/env bash
# [DX-N1] Why: original tests and original RNG ranges fit bounded lock holds.
# Rejected: reducing the corpus or changing package assertions to make the gates faster.
source "$(dirname "$0")/common.sh"
run=${1:?run directory}
cd "$REPO"
node --experimental-strip-types "$HERE/smoke.mjs"
export DX_B5_SCENARIOS=${DX_N1_LAYOUT_COUNT:-300} DX_B5_SCENARIO_START=${DX_N1_LAYOUT_START:-0}
export DX1_RESULTS=$run/driver/reach-results.json DX2_TRANSITION_RESULTS=$run/driver/transition-results.json
files=(reach reach-repair journal-fast record-time-peer concurrent-commits adapter commit-observation layout-differential)
case ${DX_N1_TEST_SET:-all} in
 all) ;;
 core) files=(reach concurrent-commits);;
 remaining) files=(reach-repair journal-fast record-time-peer adapter commit-observation layout-differential);;
 layout) files=(layout-differential);;
 *) echo 'invalid DX_N1_TEST_SET' >&2; exit 2;;
esac
printf 'DX-N1 test set=%s differential start=%s count=%s\n' "${DX_N1_TEST_SET:-all}" "$DX_B5_SCENARIO_START" "$DX_B5_SCENARIOS"
args=(); for file in "${files[@]}"; do args+=("packages/datomic/test/$file.test.ts"); done
exec "$REPO/node_modules/.bin/vitest" run --reporter=default --reporter=json --outputFile "$run/driver/tests.json" --config lab/experiments/EXP-DX1/b5/vitest.config.ts "${args[@]}"
