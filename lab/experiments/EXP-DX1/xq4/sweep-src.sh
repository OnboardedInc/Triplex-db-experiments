#!/usr/bin/env bash
# [DX-XQ4] A gateway source for the find-against-sweep gate only: this branch's gateway plus the exact sweep's files
# (exp/DX-XQ6-exact-sweep, read from git, never edited) and its route wired into a copy of main.clj. Nothing here is
# merged into the branch. Then:
#   XQ4_SRC=NEW_DIR/src XQ4_SWEEP=1 node lab/bin/heavy.mjs --label DX-XQ4-sweep -- \
#     bash lab/experiments/EXP-DX1/xq4/gate.sh NEW_ABSOLUTE_DIR "g3 world"
set -euo pipefail
out=${1:?new absolute directory}
rev=${XQ4_SWEEP_REV:-909309c63}
[[ ! -e $out ]] || { echo "sweep-src.sh: give a new directory" >&2; exit 2; }
repo=$(git rev-parse --show-toplevel)
git -C "$repo" cat-file -e "$rev^{commit}" 2>/dev/null || git -C "$repo" fetch -q origin exp/DX-XQ6-exact-sweep
mkdir -p "$out"
cp -R "$repo/packages/datomic/gateway/src" "$out/src"
gw=packages/datomic/gateway/src/triplex/gateway
git -C "$repo" show "$rev:$gw/sweep.clj" > "$out/src/triplex/gateway/sweep.clj"
git -C "$repo" show "$rev:$gw/admission.clj" > "$out/src/triplex/gateway/admission.clj"
git -C "$repo" show "$rev:$gw/main.clj" > "$out/sweep-main.clj"
python3 - "$out/src/triplex/gateway/main.clj" "$out/sweep-main.clj" <<'PY'
import sys
mine, theirs = open(sys.argv[1]).read(), open(sys.argv[2]).read()
req = "[triplex.gateway.ids :as ids]"
assert mine.count(req) == 1
mine = mine.replace(req, req + " [triplex.gateway.sweep :as sweep]")
start = theirs.index("      ;; [DX-XQ6] The exact sweep")
end = theirs.index('      :else (response 404 {:code "NotFound"}))', start)
block = theirs[start:end]
tail = '      :else (response 404 {:code "NotFound"}))'
assert mine.count(tail) == 1
mine = mine.replace(tail, block + tail)
open(sys.argv[1], "w").write(mine)
PY
rm "$out/sweep-main.clj"
echo "sweep-src: $out/src ($rev)"
