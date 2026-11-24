#!/usr/bin/env bash
# [DX-ERA3] The review's top schedule on a real stack (Mac, toy, one ordinary heavy token):
#   DOCKER_HOST=unix://<lab VM socket> node lab/bin/heavy.mjs --label DX-ERA3-stack -- \
#     bash lab/experiments/EXP-DX1/era3/stack.sh NEW_ABSOLUTE_DIR BODIES_DIR OPTION
# OPTION 0 (database-wide, today's rule), 1 (per account), 2 (per account with the subject check). BODIES_DIR holds the
# request bodies written by era3/run.sh's "bodies" phase (the in-process attack's own frames).
# Stack: transactor, PostgreSQL storage, the PostgreSQL removal authority shared by a write and a read gateway, the
# production write switches (era2/fault.sh's set). Every container must run the image the stack pinned by ID.
#
# Schedule (D1 of era3/REVIEW.md, by a gateway killed during publication):
#   1. a1 (account a) and b1 (account b) saved; a derived-write ticket read (seq 0);
#   2. the authority's head row is held FOR UPDATE, so the removal of a1 stops inside its publication, after its
#      native commit; the write gateway is then killed (docker kill) and the row released;
#   3. on the read gateway, which shares the authority: the frontier, a save of a1, a frame with the old ticket and no
#      accounts (what every settlement and Publish caller on this branch sends), a frame with the old ticket naming a;
#   4. the removal is resumed on the read gateway with the same command; then the frame's document and a1 are read.
# Predictions (written 2026-11-24 before any stack run of this script):
#   OPTION 1 and 2: frontier seq 0 while pending; a1's save 409 CasConflict; the no-account frame 200 at a position
#   after the removal's native position; the account frame 409 CasConflict; the resumed removal 200 (seq 1); after it
#   the no-account frame's document answers "derived:<a1's value>" on a current read; a1 answers the marker.
#   OPTION 0: the no-account frame and the account frame 503 ErasureFrontierUnavailable while pending; resumed 200;
#   the document never exists. Shown wrong if: OPTION 1/2's no-account frame is refused, or OPTION 0's commits.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; option=${3:?0, 1 or 2}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ $option =~ ^[012]$ ]] || { echo "OPTION must be 0, 1 or 2" >&2; exit 2; }
for f in seed-a1 seed-b1 frame-any frame-acct own-save values; do [[ -s $bodies/$f.json ]] || { echo "missing $bodies/$f.json" >&2; exit 2; }; done
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxera3-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ERA3_PORT_WRITE:-18981} port_r=${DX_ERA3_PORT_READ:-18985}
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
env "${envs[@]}" "${gateway[@]}" DX_STACK_EVIDENCE="$out/evidence" DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
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
remove='{"commandId":"era3-stack-rm","selectors":[{"entityId":"acct/a/one","attribute":":v"}]}'

step "hold the authority's head row for update (the removal will stop inside its publication)"
psql_auth -c "BEGIN; SELECT 1 FROM triplex_removal.records WHERE scope='$db' AND record='head.json' FOR UPDATE; SELECT pg_sleep(120); ROLLBACK;" \
  > "$out/lock.log" 2>&1 &
lock_pid=$!
sleep 2
( post "$W/v2/db/$db/erase" "$remove" removal-1 ) &
rm_pid=$!
committed=0
for i in $(seq 1 150); do
  n=$(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$db' AND record='pending.json'")
  curl -sS -m 10 -o "$out/replies/journal-poll.json" -H 'Content-Type: application/json' -X POST "$R/v2/db/$db/transactions" \
    --data-binary '{"after":0,"limit":100}' > /dev/null || true
  if [[ $n == 1 ]] && grep -q 'privacy-erasure' "$out/replies/journal-poll.json"; then committed=1; break; fi
  # Database-wide (OPTION 0) every read is refused while a removal is pending, so the journal cannot show it: an intent
  # pending while the removal's request is still blocked 3 s later means it is inside its publication (its native
  # commit answers or times out within 5 s, and only the publication waits on the held row).
  if [[ $n == 1 && $i -ge 15 ]] && kill -0 "$rm_pid" 2>/dev/null; then committed=2; break; fi
  sleep 0.2
done
step "intent pending and native commit visible: $committed (1: in the journal; 2: inferred, the request still blocked in publication)"
[[ $committed != 0 ]] || { echo "the removal never reached its publication" >&2; exit 1; }
step "kill the write gateway inside the removal's publication"
docker kill "$prefix-gw-w" > /dev/null
wait "$rm_pid" || true
psql_auth -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(120)%' AND pid <> pg_backend_pid()" >> "$out/lock.log" 2>&1 || true
wait "$lock_pid" 2>/dev/null || true; lock_pid=
sleep 2
step "pending intents: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$db' AND record='pending.json'")"

get "$R/v2/db/$db/erasure-frontier" frontier-while-pending
post "$R/v1/db/$db/read" '{"entityIds":["acct/a/one"]}' read-a1-while-pending
post "$R/v1/db/$db/transact" "$bodies/own-save.json" own-save-while-pending
post "$R/v1/db/$db/transact" "$bodies/frame-any.json" frame-any-while-pending
post "$R/v1/db/$db/transact" "$bodies/frame-acct.json" frame-acct-while-pending
post "$R/v2/db/$db/erase" "$remove" removal-resumed
post "$R/v1/db/$db/transact" "$bodies/frame-any.json" frame-any-resent-after-ack
post "$R/v1/db/$db/read" '{"entityIds":["notice:v1:era3-any"]}' read-doc-after-ack
post "$R/v1/db/$db/read" '{"entityIds":["acct/a/one"]}' read-a1-after-ack
post "$R/v2/db/$db/transactions" '{"after":0,"limit":100}' journal-after-ack
node - "$out" "$va" <<'JS' | tee "$out/verdict.json"
const fs = require("fs"), [out, va] = process.argv.slice(2);
const r = (n) => { try { return { status: Number(fs.readFileSync(`${out}/replies/${n}.status`, "utf8")), body: fs.readFileSync(`${out}/replies/${n}.json`, "utf8") }; } catch { return { status: 0, body: "" }; } };
const claimPos = (cmd) => { const j = r("journal-after-ack").body; const m = j.indexOf(cmd); return m < 0 ? null : m; };
const removal = (() => { try { return JSON.parse(r("removal-resumed").body); } catch { return {}; } })();
const verdict = {
  frontierWhilePending: (() => { try { return JSON.parse(r("frontier-while-pending").body); } catch { return null; } })(),
  valueReadableWhilePending: r("read-a1-while-pending").body.includes(va),
  ownSaveWhilePending: [r("own-save-while-pending").status, (r("own-save-while-pending").body.match(/"code":"([^"]+)"/) || [])[1]],
  frameNoAccountsWhilePending: [r("frame-any-while-pending").status, (r("frame-any-while-pending").body.match(/"code":"([^"]+)"/) || [])[1]],
  frameNamingAccountWhilePending: [r("frame-acct-while-pending").status, (r("frame-acct-while-pending").body.match(/"code":"([^"]+)"/) || [])[1]],
  removalResumed: [r("removal-resumed").status, removal.seq, removal.position],
  frameNoAccountsResentAfterAck: [r("frame-any-resent-after-ack").status, (r("frame-any-resent-after-ack").body.match(/"code":"([^"]+)"/) || [])[1]],
  frameNoAccountsPosition: (() => { try { return JSON.parse(r("frame-any-while-pending").body).position; } catch { return null; } })(),
  derivedCopyReadableAfterAck: r("read-doc-after-ack").body.includes(va),
  a1ReadableAfterAck: r("read-a1-after-ack").body.includes(va),
};
console.log(JSON.stringify(verdict, null, 1));
JS
