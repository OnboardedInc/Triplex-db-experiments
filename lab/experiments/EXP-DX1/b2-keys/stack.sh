#!/usr/bin/env bash
# [DX-B2] B2 on a toy stack under today's database-wide rule (every option off), one ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-B2-stack -- \
#     bash lab/experiments/EXP-DX1/b2-keys/stack.sh NEW_ABSOLUTE_DIR BODIES_DIR [REF]
# The stack (transactor, PostgreSQL storage, a write and a read gateway) runs the runtime image the stack pins by ID and
# the gateway source of REF (default HEAD of this checkout); the removal authority is the file authority both gateways
# share (DX_XQ3_ERASURE_DIRECTORY=1); the shred grace is the gateway's default (300 s), unchanged.
# BODIES_DIR: era3's bodies2 (seed-a1.json, seed-c1.json, save-b1-0.json, values.json), as for DX-ERA2's stacks.
# Steps: a sealed database; a1 and c1 saved; a1 removed and published (t0); the publication of the next removal blocked
# (a non-empty directory where its record goes); c1's removal then stays pending (intent written, natively committed,
# not published); a read and a save of another subject; at t0 + grace + 20 s: is a1's key file still there? Then the
# block is lifted, c1's removal resent, and the key files counted again.
# Prediction (written 2026-11-25 05:35 EST, before the first run): with this branch, a1's key file is gone at the check
# while c1's removal is pending, and requests in between answer 503 (today's rule); with 1ed2650bd it is still there.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; ref=${3:-HEAD}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/seed-a1.json && -s $bodies/seed-c1.json ]] || { echo "missing bodies in $bodies" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/gw" "$out/gwtmp"
git rev-parse "$ref^{commit}" > "$out/source"
prefix=tx2-dxb2s-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_B2_PORT_WRITE:-19141} port_r=${DX_B2_PORT_READ:-19145}
for p in "$port_w" "$port_r"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $p is in use" >&2; exit 2; fi
done
cleanup() {
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
  rm -rf "$out/gw" "$out/gwtmp"
}
trap cleanup EXIT
git archive "$ref" packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/gwtmp"
cp -R "$out/gwtmp/packages/datomic/gateway/." "$out/gw/"
cp "$out/gwtmp/packages/datomic/src/codec-spec.json" "$out/gw/codec-spec.json"
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
env "${envs[@]}" DX_XQ3_ERASURE_DIRECTORY=1 DX_STACK_EVIDENCE="$out/evidence" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
  TRIPLEX_TRACE_LEVEL=off bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" \
  --gateway-src "$out/gw" "${args[@]}" > "$out/up.log" 2>&1 || { echo "stack did not start; see $out/up.log" >&2; exit 1; }
pinned=$(cut -d'|' -f1 "$out/evidence/$prefix/config/java-image.txt")
for role in tx gw-w gw-r; do
  ran=$(docker inspect --format '{{.Image}}' "$prefix-$role")
  echo "$prefix-$role $ran" >> "$out/images-ran"
  [[ $ran == "$pinned" ]] || { echo "container $prefix-$role runs $ran, not the pinned $pinned" >&2; exit 1; }
done
W=http://127.0.0.1:$port_w R=http://127.0.0.1:$port_r
step() { echo "$(date +%H:%M:%S) $*" | tee -a "$out/steps.log" >&2; }
n=0
post() { # URL BODY NAME
  local url=$1 body=$2 name=$3 data
  n=$((n + 1)); name="$(printf '%03d' $n)-$name"
  if [[ -f $body ]]; then data=@$body; else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" --data-binary "$data" \
    > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  local code; code=$(grep -o '"code":"[^"]*"' "$out/replies/$name.json" 2>/dev/null | head -1 || true)
  step "$name -> $(cat "$out/replies/$name.status") $code"
  last="$out/replies/$name.json"
}
remove() { echo "{\"commandId\":\"$1\",\"selectors\":[{\"entityId\":\"$2\",\"attribute\":\":v\"}]}"; }
scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","b2-stack",require("crypto").randomUUID(),0])))')
post "$W/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" create
D=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$last")
dir=/dx-authority/$(printf %s "$D" | shasum -a 256 | cut -d' ' -f1)
keyfile() { echo "$dir/assertion-$(printf %s "$1" | shasum -a 256 | cut -d' ' -f1).key"; }
present() { docker exec "$prefix-gw-w" sh -c "test -f '$1' && echo present || echo gone"; }
keys() { docker exec "$prefix-gw-w" sh -c "ls '$dir' | grep -c '\\.key\$' || true"; }
post "$W/v2/db/$D/protection" '{"attributes":[":v"],"sealed":true}' protection
post "$W/v1/db/$D/transact" "$bodies/seed-a1.json" seed-a1
post "$W/v1/db/$D/transact" "$bodies/seed-c1.json" seed-c1
ka=$(keyfile st2-seed-a1); kc=$(keyfile st2-seed-c1)
step "key files: $(keys); a1's $(present "$ka"); c1's $(present "$kc")"
post "$W/v2/db/$D/erase" "$(remove b2s-a acct/a/one)" removal-a1
t0=$(date +%s)
step "block the next publication: a non-empty directory where erase-2.json goes"
docker exec "$prefix-gw-w" sh -c "mkdir -p '$dir/erase-2.json/blocked'"
post "$W/v2/db/$D/erase" "$(remove b2s-c acct/c/one)" removal-c1-blocked-at-publication
step "c1's intent pending: $(docker exec "$prefix-gw-w" sh -c "test -f '$dir/pending.json' && echo yes || echo no")"
post "$R/v1/db/$D/read" '{"entityIds":["acct/b/one"]}' read-other-subject-while-pending
post "$W/v1/db/$D/transact" "$bodies/save-b1-0.json" save-other-subject-while-pending
grace=300
until (( $(date +%s) >= t0 + grace + 20 )); do sleep 5; done
step "B2_STACK at publication + grace + 20 s with c1's removal pending: a1's key file $(present "$ka"); c1's $(present "$kc"); key files $(keys)"
step "lift the block; resend c1's removal"
docker exec "$prefix-gw-w" sh -c "rm -rf '$dir/erase-2.json'"
post "$W/v2/db/$D/erase" "$(remove b2s-c acct/c/one)" removal-c1-resent
step "c1's intent pending after the resend: $(docker exec "$prefix-gw-w" sh -c "test -f '$dir/pending.json' && echo yes || echo no")"
sleep 3
step "after the resend: a1's key file $(present "$ka"); c1's $(present "$kc") (its grace counts from its first attempt's erasedAt)"
step "removal failures counted on the write gateway: $(curl -sS -m 10 "$W/v2/admin/scan-stats" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.stringify(JSON.parse(s).removalFailures??{}))}catch{console.log("?")}})')"
step done
