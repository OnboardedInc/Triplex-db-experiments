#!/usr/bin/env bash
# [DX-S6] The standing gate phase on the image built from the committed head (s6/image.sh), one call per step:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-S6-clj -- bash lab/experiments/EXP-DX1/s6/final.sh OUT STEP
# STEP: gates (outcome, race, bound, attack), older (s3 owners, s4 create) or fuzz (the differential fuzzer: three writer settings,
# value types, protected and sealed values).
set -uo pipefail
out=${1:?new output directory}; step=${2:?gates or fuzz}
here=$(cd "$(dirname "$0")" && pwd)
r="$here/clj-run.sh"
mkdir -p "$out"
status=0
case $step in
  gates)
    bash "$r" "$out/outcome" outcome "server general" || status=1
    bash "$r" "$out/race" race server || status=1
    bash "$r" "$out/bound" bound bound || status=1
    bash "$r" "$out/attack" attack "server import" || status=1 ;;
  older)
    bash "$r" "$out/owners" owners "server serial" || status=1
    bash "$r" "$out/create" create "server serial hints" || status=1 ;;
  fuzz)
    S5_SEEDS=${S5_SEEDS:-21,22} S5_STEPS=${S5_STEPS:-1500} S5_VALUE_TYPES=1 bash "$r" "$out/types" fuzz "server serial plainowner" || status=1
    S5_SEEDS=23 S5_STEPS=1500 S5_VALUE_TYPES=1 S5_PROTECTED=unsealed bash "$r" "$out/unsealed" fuzz "server" || status=1
    S5_SEEDS=24 S5_STEPS=1500 S5_VALUE_TYPES=1 S5_PROTECTED=sealed bash "$r" "$out/sealed" fuzz "server" || status=1 ;;
  *) echo "step $step?" >&2; exit 2 ;;
esac
echo "DX-S6_FINAL_EXIT $step $status"
exit $status
