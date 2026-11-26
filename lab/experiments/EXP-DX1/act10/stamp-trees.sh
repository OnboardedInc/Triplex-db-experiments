#!/usr/bin/env bash
# [DX-ACT8, sixth round] Two builds of this checkout for round6.test.ts's upgrade tests (the fifth review's section 3, item
# 1), each a copy of `lab/bench` and `lab/experiments/EXP-DX1` with this checkout's `packages` and `node_modules` linked:
#   OUT/comment    one byte outside behaviour: a comment appended to actv-lazy/join/account.ts
#   OUT/behaviour  a range boundary changed in a declaration table (actv-delta/rules.ts: EVSTAT's row 2 becomes row 3)
# Each has its own compiler stamp. Run: bash lab/experiments/EXP-DX1/act10/stamp-trees.sh <out>, then
#   STAMP_A=<out>/comment/lab/experiments/EXP-DX1 STAMP_B=<out>/behaviour/lab/experiments/EXP-DX1 \
#     node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/round6.test.ts
set -euo pipefail
out=${1:?out dir}
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
for v in comment behaviour; do
  d=$out/$v
  rm -rf "$d"
  mkdir -p "$d/lab/experiments"
  cp -R "$repo/lab/bench" "$d/lab/bench"
  rsync -a --exclude '*.log' --exclude 'node_modules' "$repo/lab/experiments/EXP-DX1" "$d/lab/experiments/"
  ln -s "$repo/packages" "$d/packages"
  ln -s "$repo/node_modules" "$d/node_modules"
done
printf '\n// [stamp tree] one byte outside behaviour.\n' >> "$out/comment/lab/experiments/EXP-DX1/actv-lazy/join/account.ts"
python3 -I - "$out/behaviour/lab/experiments/EXP-DX1/actv-delta/rules.ts" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
a = 'operation: { kind: "due", parameter: "tncBusinessDays", date: "everifyStatusAt", rows: [2] },'
assert s.count(a) == 1
open(p, "w").write(s.replace(a, a.replace("rows: [2]", "rows: [3]")))
PY
echo "stamp trees in $out"
