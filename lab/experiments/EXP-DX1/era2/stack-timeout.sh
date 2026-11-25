#!/usr/bin/env bash
# [DX-ERA2 fix pass] The removal's waits expiring on a real stack (Mac, toy, one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA2-stack -- \
#     bash lab/experiments/EXP-DX1/era2/stack-timeout.sh NEW_ABSOLUTE_DIR BODIES_DIR OPTION [WAIT_MS]
# OPTION 1 or 2 (per account; both now take the same removal path). WAIT_MS (default 25): how long each gateway waits
# for each of a removal's native transactions (TX2_REMOVAL_WAIT_MS) before it answers 503 with the transaction still
# queued. BODIES_DIR as for era3/stack.sh. Stack and image checks as era3/stack.sh.
# Schedule: a1 and b1 saved; a derived-write ticket read (seq 0); then the removal of a1 is sent to the write gateway
# again and again with the same command until it answers 200, and after every answer the read gateway gets a frame
# with the old ticket and no accounts, one naming account a, and a save of a1.
# Predictions (written 2026-11-24 before the first run): several 503 ErasureFrontierUnavailable answers before the 200
# (the waits expire at the declaration, the commit or both); every frame refused (503 while the removal is in flight,
# 409 ErasureFrontierChanged or CasConflict after); a1's saves refused once the removal committed; after the 200 the
# frames' documents do not exist, a1 answers the marker; no frame lands after the removal's position. Shown wrong if
# any frame commits after the removal's position or its document holds a1's value.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; option=${3:?1 or 2}; wait_ms=${4:-25}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ $option =~ ^[12]$ ]] || { echo "OPTION must be 1 or 2" >&2; exit 2; }
for f in seed-a1 seed-b1 frame-any frame-acct own-save values; do [[ -s $bodies/$f.json ]] || { echo "missing $bodies/$f.json" >&2; exit 2; }; done
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera2t-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA2_PORT_WRITE:-18971} port_r=${DX_ERA2_PORT_READ:-18975}
for p in "$port_w" "$port_r"; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $p is in use" >&2; exit 2; fi
done
lock_pid=
cleanup() {
  [[ -n $lock_pid ]] && kill "$lock_pid" 2>/dev/null || true
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$out/evidence/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes >/dev/null 2>&1 || true
}
trap cleanup EXIT
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs toy)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_PINNED_SHORTCUT=0 DX_PINNED_CUT_LOOKUP=0
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1)
[[ $option == 0 ]] || gateway+=(DX_REMOVAL_PER_ACCOUNT=1)
[[ $option == 2 ]] && gateway+=(DX_REMOVAL_SUBJECT_CHECK=1)
env "${envs[@]}" "${gateway[@]}" DX_REMOVAL_WAIT_MS="$wait_ms" DX_STACK_EVIDENCE="$out/evidence" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
  TRIPLEX_TRACE_LEVEL=off bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --port-write "$port_w" --port-read "$port_r" \
  "${args[@]}" > "$out/up.log" 2>&1 || { echo "stack did not start; see $out/up.log" >&2; exit 1; }
pinned=$(cut -d'|' -f1 "$out/evidence/$prefix/config/java-image.txt")
pg_pinned=$(docker image inspect --format '{{.Id}}' postgres:17-alpine)
for role in tx gw-w gw-r pg; do
  ran=$(docker inspect --format '{{.Image}}' "$prefix-$role")
  echo "$prefix-$role $ran" >> "$out/images-ran"
  want=$pinned; [[ $role == pg ]] && want=$pg_pinned
  [[ $ran == "$want" ]] || { echo "container $prefix-$role runs $ran, not the pinned $want" >&2; exit 1; }
done
echo "pinned $pinned pg $pg_pinned" >> "$out/images-ran"
W=http://127.0.0.1:$port_w R=http://127.0.0.1:$port_r
step() { echo "$(date +%H:%M:%S) $*" | tee -a "$out/steps.log"; }
# post URL BODY-FILE-OR-JSON NAME: the reply body to replies/NAME.json, the status to replies/NAME.status
post() {
  local url=$1 body=$2 name=$3 data
  if [[ -f $body ]]; then data=@$body; else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" --data-binary "$data" \
    > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  step "$name -> $(cat "$out/replies/$name.status") $(head -c 300 "$out/replies/$name.json" 2>/dev/null)"
}
get() { curl -sS -m 30 -o "$out/replies/$2.json" -w '%{http_code}' "$1" > "$out/replies/$2.status" || echo 000 > "$out/replies/$2.status"; step "$2 -> $(cat "$out/replies/$2.status") $(head -c 300 "$out/replies/$2.json")"; }
psql_auth() { docker exec -i "$prefix-pg" psql -XtA -v ON_ERROR_STOP=1 -U postgres -d removal_authority "$@"; }
va=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).a1)' "$bodies/values.json")

scope=$(node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test","era3-stack",require("crypto").randomUUID(),0])))')
post "$W/v1/db/create" "{\"scope\":$scope,\"layout\":\"lean\",\"strictRecordClocks\":true}" create
db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/create.json")
echo "$db" > "$out/db"
post "$W/v2/db/$db/protection" '{"attributes":[":v"],"sealed":false}' protection
[[ $option == 0 ]] || post "$W/v2/db/$db/removal-per-account" '{}' move
post "$W/v1/db/$db/transact" "$bodies/seed-a1.json" seed-a1
post "$W/v1/db/$db/transact" "$bodies/seed-b1.json" seed-b1
get "$W/v2/db/$db/erasure-frontier" ticket
remove='{"commandId":"era2-timeout-rm","selectors":[{"entityId":"acct/a/one","attribute":":v"}]}'
done=0
for k in $(seq 1 150); do
  post "$W/v2/db/$db/erase" "$remove" "removal-$k"
  st=$(cat "$out/replies/removal-$k.status")
  post "$R/v1/db/$db/transact" "$bodies/frame-any.json" "frame-any-$k"
  post "$R/v1/db/$db/transact" "$bodies/frame-acct.json" "frame-acct-$k"
  post "$R/v1/db/$db/transact" "$bodies/own-save.json" "own-$k"
  if [[ $st == 200 ]]; then done=$k; break; fi
  sleep 0.2
done
step "removal answered 200 after $done attempts"
post "$R/v1/db/$db/read" '{"entityIds":["notice:v1:era3-any"]}' read-doc-any
post "$R/v1/db/$db/read" '{"entityIds":["notice:v1:era3-acct"]}' read-doc-acct
post "$R/v1/db/$db/read" '{"entityIds":["acct/a/one"]}' read-a1
post "$R/v2/db/$db/transactions" '{"after":0,"limit":1000}' journal
node - "$out" "$va" "$done" <<'JS' | tee "$out/verdict.json"
const fs = require("fs"), [out, va, done] = process.argv.slice(2);
const r = (n) => { try { return { status: Number(fs.readFileSync(`${out}/replies/${n}.status`, "utf8")), body: fs.readFileSync(`${out}/replies/${n}.json`, "utf8") }; } catch { return null; } };
const code = (x) => x ? x.status + " " + ((x.body.match(/"code":"([^"]+)"/) || [])[1] || "") : "none";
const tally = (prefix) => { const t = {}; for (let k = 1; k <= Number(done || 150); k++) { const x = r(prefix + k); if (!x) continue; const c = code(x); t[c] = (t[c] || 0) + 1; } return t; };
const final = (() => { try { return JSON.parse(r("removal-" + done).body); } catch { return {}; } })();
const pos = (x) => { try { const p = JSON.parse(x.body).position; return Number(p?.v ?? p); } catch { return null; } };
const landed = []; for (const f of ["frame-any-", "frame-acct-"]) for (let k = 1; k <= Number(done || 150); k++) { const x = r(f + k); if (x && x.status === 200) landed.push({ frame: f + k, position: pos(x) }); }
const verdict = {
  attempts: Number(done), removals: tally("removal-"), framesNoAccounts: tally("frame-any-"), framesNamingAccount: tally("frame-acct-"),
  ownSaves: tally("own-"), removal: { seq: final.seq, position: final.position }, framesLanded: landed,
  framesLandedAfterRemoval: landed.filter((x) => x.position > final.position).length,
  derivedCopyReadable: [r("read-doc-any"), r("read-doc-acct")].some((x) => x && x.body.includes(va)),
  a1Readable: r("read-a1").body.includes(va),
};
console.log(JSON.stringify(verdict, null, 1));
JS
