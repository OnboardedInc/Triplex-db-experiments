#!/usr/bin/env bash
# [DX-XQ4] The string key against XQ2's tuple form, measured with the cost spike's own harness (exp/DX-XQ2-index-cost,
# xq2/gate.clj cost-seed! and cost-measure!, read from git and not edited beyond the two adapter lines below).
#   node lab/bin/heavy.mjs --label DX-XQ4-xq2pair -- bash lab/experiments/EXP-DX1/xq4/xq2pair.sh NEW_ABSOLUTE_DIR tuple|string "n1 n20"
# tuple: XQ2's gateway (TX2_ATTRIBUTE_INDEX, tuple datoms on the row's entity), as XQ2 measured it.
# string: this branch's gateway (TX2_CROSS_INDEX=1); the same fields are declared (family string) and backfilled after
# the harness's seed, before its index job, so both forms start the measure from the same rows and an indexed seed.
# Adapter: (1) a shim namespace triplex.gateway.attribute-index naming the listed fields and :triplex.ix/entry, staged
# only beside this branch's gateway; (2) cost-seed! declares and backfills when XQ2PAIR_STRING_LIST is set.
set -euo pipefail
out=${1:?absolute new output directory under /Users}
form=${2:?tuple or string}
arms=${3:-"n1 n20"}
[[ $out == /Users/* && ! -e $out ]] || { echo "xq2pair.sh: give a new absolute output directory under /Users" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM Docker endpoint}"
repo=$(git rev-parse --show-toplevel)
rev=${XQ2PAIR_REV:-c2c81a638}
git -C "$repo" cat-file -e "$rev^{commit}" 2>/dev/null || git -C "$repo" fetch -q origin exp/DX-XQ2-index-cost
mkdir -p "$out/out" "$out/stage/xq2/xq2" "$out/stage/gateway"
x=lab/experiments/EXP-DX1/xq2
for f in gate.clj container.sh; do git -C "$repo" show "$rev:$x/$f" > "$out/stage/xq2/xq2/$f"; done
chmod +x "$out/stage/xq2/xq2/container.sh"
if [[ $form == tuple ]]; then
  mkdir -p "$out/stage/gateway/src"
  git -C "$repo" archive "$rev" packages/datomic/gateway/src | tar -x -C "$out/stage/gateway" --strip-components 3
else
  cp -R "$repo/packages/datomic/gateway/src" "$out/stage/gateway/src"
  cat > "$out/stage/gateway/src/triplex/gateway/attribute_index.clj" <<'CLJ'
(ns triplex.gateway.attribute-index
  "[DX-XQ4] Harness shim only (xq2pair.sh): the names XQ2's cost phases read, for the string form."
  (:require [clojure.string :as str]))
(def listed (vec (remove str/blank? (str/split (or (System/getenv "XQ2PAIR_STRING_LIST") "") #","))))
(def all-idents [:triplex.ix/entry])
(def families {})
(defn key-of [& _] nil)
CLJ
fi
python3 - "$out/stage/xq2/xq2/gate.clj" "$out/stage/xq2/xq2/container.sh" "$form" <<'PY'
import sys
gate, cont, form = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(gate).read()
old = "    (let [before (kvs)] (index-now! conn)"
assert s.count(old) == 1
s = s.replace(old, '''    ;; [DX-XQ4 adapter] the string form: declare the listed fields and backfill before the harness's index job.
    (when-let [l (not-empty (System/getenv "XQ2PAIR_STRING_LIST"))]
      (let [attrs (clojure.string/split l #",")
            d (route name "v2" "index-declaration" {"version" 1 "attributes" (vec (map-indexed (fn [i a] {"attribute" a "code" (str "c" i) "family" "string"}) attrs))})
            b (route name "v2" "index-backfill" {"batchDatoms" 4000})]
        (println "XQ2PAIR_DECLARED" (:status d) (:status b) (json/write-str (select-keys (:body b) ["added" "entities" "sealed"])))
        (assert (= 200 (:status d) (:status b)))))
''' + old)
open(gate, "w").write(s)
c = open(cont).read()
old = "  TX2_ATTRIBUTE_INDEX=$list "
assert c.count(old) == 1
if form == "string":
    c = c.replace(old, '  TX2_CROSS_INDEX=1 XQ2PAIR_STRING_LIST=$list TX2_ATTRIBUTE_INDEX=$list ')
open(cont, "w").write(c)
PY
git -C "$repo" rev-parse HEAD > "$out/source"; echo "$form $rev" >> "$out/source"
name=tx2-dxxq4-xq2pair-$$
docker rm -f "$name" >/dev/null 2>&1 || true
set +e
docker run --name "$name" --memory 4g --cpus 2 --entrypoint /bin/bash \
  -e "XQ2_PHASES=cost" -e "XQ2_ARMS=$arms" -e "XQ2_RUN=$(basename "$out")" \
  -e "XQ2_COST_SUBJECTS=${XQ2_COST_SUBJECTS:-2000}" -e "XQ2_FIELDS=${XQ2_FIELDS:-160}" -e "XQ2_LONG_IDS=${XQ2_LONG_IDS:-1}" \
  -e "XQ2_FORMS=${XQ2_FORMS:-1}" -e "XQ2_HOT_ROUNDS=${XQ2_HOT_ROUNDS:-20}" -e "XQ2_COST_EACH=${XQ2_COST_EACH:-250}" \
  -v "$out/stage/gateway/src:/opt/gateway/src:ro" -v "$out/stage/xq2:/xq2:ro" \
  -v "$out/out:/out" "${DX_XQ2_IMAGE:-tx2-datomic:dx-real2-production}" /xq2/xq2/container.sh > "$out/container.log" 2>&1
status=$?
docker rm -f "$name" >/dev/null 2>&1
rm -rf "$out/stage/gateway"
grep -E '^XQ2_|^XQ2PAIR|Exception' "$out/container.log" | cut -c1-600
exit "$status"
