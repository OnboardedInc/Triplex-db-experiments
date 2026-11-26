#!/usr/bin/env bash
# [DX-RD6, second review] Stored-function identities of this checkout against a base commit (int5/idents.sh on both
# trees, the base exported with git archive), with three extra settings: the pinned-read options unset (the default),
# both set to 1 and both set to 0. One ordinary heavy token:
#   DOCKER_HOST=<lab VM socket> node lab/bin/heavy.mjs --label DX-RD6-idents -- bash lab/experiments/EXP-DX1/rd6/identity-run.sh OUT BASE
set -uo pipefail
out=${1:?new absolute output directory}; base=${2:?base commit}
[[ $out == /* && ! -e $out ]] || { echo "identity-run.sh: give a new absolute output directory" >&2; exit 2; }
repo=$(cd "$(dirname "$0")/../../../.." && pwd); x=$repo/lab/experiments/EXP-DX1
mkdir -p "$out/base"
git -C "$repo" archive "$base" packages/datomic/gateway/src packages/datomic/src/codec-spec.json | tar -x -C "$out/base"
git -C "$repo" rev-parse HEAD > "$out/source"; echo "$base" > "$out/base-commit"
server_at="TX2_SUBJECT_SAVE=1@TX2_SUBJECT_NUMERIC_OWNER=1@TX2_SUBJECT_ORDERED_IDS=1"
export INT5_EXTRA_SETTINGS="pinned-unset:$server_at pinned-on:$server_at@TX2_PINNED_SHORTCUT=1@TX2_PINNED_CUT_LOOKUP=1 pinned-off:$server_at@TX2_PINNED_SHORTCUT=0@TX2_PINNED_CUT_LOOKUP=0 base-off:TX2_SUBJECT_SAVE=0@TX2_PINNED_SHORTCUT=0@TX2_PINNED_CUT_LOOKUP=0"
export INT5_IDENTS_PREFIX=tx2-dxrd6-idents
status=0
bash "$x/int5/idents.sh" "$out/base" "$out/base.jsonl" || status=1
bash "$x/int5/idents.sh" "$repo" "$out/this.jsonl" || status=1
python3 -I "$x/int5/compare-idents.py" "$out/base.jsonl" "$out/this.jsonl" | tee "$out/compare.txt" || status=1
rm -rf "$out/base"
exit $status
