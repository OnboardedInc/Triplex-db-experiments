#!/usr/bin/env bash
# [DX-N1] The key pool on a toy stack with the PostgreSQL removal authority (DX_ERASURE_SQL=1), every option off, one
# ordinary heavy token:
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-N1-stack -- \
#     bash lab/experiments/EXP-DX1/n1-keys/stack.sh NEW_ABSOLUTE_DIR BODIES_DIR [REF]
# The stack (transactor, PostgreSQL storage and authority, a write and a read gateway) runs the runtime image the stack
# pins by ID and the gateway source of REF (default HEAD of this checkout). BODIES_DIR: the bodies n1-keys/pool.clj
# prints with N1_MODE=bodies (one-K.json: one protected value; big300-K.json: 300; burst100-K.json: 100).
# Steps, on one sealed database declared on the write gateway:
#   S0  one save on the write gateway (it served the declaration): the control;
#   S1  saves on the read gateway, which never served the declaration, back to back until one is stored;
#   S2  the write gateway restarted for real (docker restart), then saves on it back to back until one is stored;
#   S3  one save of 300 protected values on the write gateway, three times 2 s apart;
#   S4  four saves of 100 protected values each on the write gateway, back to back;
#   S5  a second sealed database declared on the read gateway; its first save sent to the write gateway;
#   end reads of stored values on both gateways (decoded with keys taken from the pool).
# Every answer is in steps.log and replies/; N1_STACK lines summarise each step.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; ref=${3:-HEAD}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ -s $bodies/one-0.json && -s $bodies/big300-0.json && -s $bodies/burst100-0.json ]] || { echo "missing bodies in $bodies" >&2; exit 2; }
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/gw" "$out/gwtmp"
git rev-parse "$ref^{commit}" > "$out/source"
prefix=tx2-dxn1s-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_N1_PORT_WRITE:-19151} port_r=${DX_N1_PORT_READ:-19155}
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
env "${envs[@]}" DX_ERASURE_SQL=1 DX_STACK_EVIDENCE="$out/evidence" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
  TRIPLEX_TRACE_LEVEL=off bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" \
  --gateway-src "$out/gw" "${args[@]}" > "$out/up.log" 2>&1 || { echo "stack did not start; see $out/up.log" >&2; exit 1; }
pinned=$(cut -d'|' -f1 "$out/evidence/$prefix/config/java-image.txt")
check_images() {
  for role in tx gw-w gw-r; do
    ran=$(docker inspect --format '{{.Image}}' "$prefix-$role")
    echo "$1 $prefix-$role $ran" >> "$out/images-ran"
    [[ $ran == "$pinned" ]] || { echo "container $prefix-$role runs $ran, not the pinned $pinned" >&2; exit 1; }
  done
}
check_images start
W=http://127.0.0.1:$port_w R=http://127.0.0.1:$port_r
now() { perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000'; }
step() { echo "$(date +%H:%M:%S) $*" | tee -a "$out/steps.log" >&2; }
n=0 last=''
post() { # URL BODY NAME: sets $last to "STATUS CODE"
  local url=$1 body=$2 name=$3 data code
  n=$((n + 1)); name="$(printf '%03d' $n)-$name"
  if [[ -f $body ]]; then data=@$body; else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" \
    --data-binary "$data" > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  code=$(grep -o '"code":"[^"]*"' "$out/replies/$name.json" 2>/dev/null | head -1 | sed 's/"code":"//; s/"$//' || true)
  last="$(cat "$out/replies/$name.status") ${code:-}"
  step "$name -> $last"
}
wait_up() { for i in $(seq 1 180); do curl -sS -m 5 -o /dev/null "$1/health" && return 0; sleep 0.5; done; return 1; }
new_db() { # URL NAME: creates and declares a sealed database; sets $db
  local scope; scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","n1-stack",require("crypto").randomUUID(),0])))')
  post "$1/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" "create-$2"
  db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/$(printf '%03d' $n)-create-$2.json")
  post "$1/v2/db/$db/protection" '{"attributes":[":v"],"sealed":true}' "protection-$2"
}
k=0
until_stored() { # URL DB LABEL: saves of one protected value back to back until one is stored (40 tries)
  local url=$1 d=$2 label=$3 t0 tries=0 refused=0 first='' answers=''
  t0=$(now)
  while (( tries < 40 )); do
    post "$url/v1/db/$d/transact" "$bodies/one-$k.json" "$label-one-$k"; k=$((k + 1)); tries=$((tries + 1))
    if [[ $last == "200 " ]]; then first=$(( $(now) - t0 )); break; fi
    refused=$((refused + 1)); answers="$answers${last// /:},"
  done
  echo "N1_STACK $label {\"sent\":$tries,\"refused\":$refused,\"firstStoredMs\":${first:-null},\"refusedAnswers\":\"${answers%,}\"}" | tee -a "$out/summary"
}

new_db "$W" d1; D1=$db
post "$W/v1/db/$D1/transact" "$bodies/one-$k.json" "s0-control"; k=$((k + 1))
echo "N1_STACK S0-control {\"answer\":\"$last\"}" | tee -a "$out/summary"
until_stored "$R" "$D1" "S1-read-gateway-never-declared"
t_restart=$(now)
docker restart "$prefix-gw-w" > /dev/null
wait_up "$W"; check_images restarted
step "write gateway restarted and healthy after $(( $(now) - t_restart )) ms"
until_stored "$W" "$D1" "S2-after-a-real-restart"
s3=''
for j in 0 1 2; do
  post "$W/v1/db/$D1/transact" "$bodies/big300-$j.json" "s3-big300-$j"; s3="$s3${last// /:},"; sleep 2
done
echo "N1_STACK S3-one-save-of-300 {\"answers\":\"${s3%,}\"}" | tee -a "$out/summary"
s4=''
for j in 0 1 2 3; do post "$W/v1/db/$D1/transact" "$bodies/burst100-$j.json" "s4-burst100-$j"; s4="$s4${last// /:},"; done
echo "N1_STACK S4-burst-of-4x100 {\"answers\":\"${s4%,}\"}" | tee -a "$out/summary"
new_db "$R" d2; D2=$db
post "$W/v1/db/$D2/transact" "$bodies/one-$k.json" "s5-first-save-other-gateway"; k=$((k + 1))
echo "N1_STACK S5-new-database-declared-elsewhere {\"firstSave\":\"$last\"}" | tee -a "$out/summary"
post "$R/v1/db/$D1/read" '{"entityIds":["acct/a/n1s-one-0-0"]}' "end-read-control-on-read"
grep -q 'secret-n1s-one-0-0' "$out/replies/$(printf '%03d' $n)-end-read-control-on-read.json" && rc=1 || rc=0
echo "N1_STACK end {\"controlValueReadOnReadGateway\":$rc}" | tee -a "$out/summary"
step done
