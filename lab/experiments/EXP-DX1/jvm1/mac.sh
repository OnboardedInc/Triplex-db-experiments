#!/usr/bin/env bash
# [DX-JVM1] Why: alternate fresh JVM boots on the exact hashed archive with the writer collector fixed.
# Rejected: comparing one archived control against a candidate on a moving lab host.
set -euo pipefail
[[ $(uname -s) == Darwin ]]
archive=${1:?sealed SCALE1 raw archive}
image=${2:?Datomic image receipt}
out=${3:?new durable evidence subdirectory}
[[ -f $archive && -f $image ]]
mkdir "$out"
source=$(git rev-parse HEAD)
for cell in 01-present 02-candidate 03-present 04-candidate; do
  [[ $(git rev-parse HEAD) == "$source" ]]
  [[ -z $(git status --porcelain --untracked-files=no) ]]
  arm=${cell#??-}
  node lab/bin/heavy.mjs --label "DX-JVM1-$cell" -- node lab/bin/engine.mjs jvm-replay \
    --holder DX-JVM1 --jvm-arm "$arm" --lease-before-seed --seconds 240 \
    --archive "$archive" --image-receipt "$image" --out "$out/$cell" 2>&1 | tee "$out/$cell.log"
  python3 lab/experiments/EXP-DX1/tail1/measure.py "$out/$cell"
done
