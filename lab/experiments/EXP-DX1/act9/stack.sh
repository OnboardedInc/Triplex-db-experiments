#!/usr/bin/env bash
# [DX-ACT9] Gate (e)'s top cases on a real stack (Mac, toy, one ordinary heavy token; the caller sets
# DX_DATOMIC_IMAGE_RECEIPT so the stack starts this branch's image by ID):
#   DOCKER_HOST=unix://<lab VM socket> DX_DATOMIC_IMAGE_RECEIPT=<receipt> node lab/bin/heavy.mjs --label DX-ACT9-stack -- \
#     bash lab/experiments/EXP-DX1/act9/stack.sh NEW_ABSOLUTE_DIR BODIES_DIR ARM MODE
# BODIES_DIR: era3/run.sh's "bodies" phase (the review's frames); the deliveries below are made from them.
# ARM: before (the per-account removal rule; the gateways without TX2_ACCOUNT_TICKETS) or after (with it).
# MODE: publication (the review's D1: the removal of a1 stops inside its publication, after its native commit, and its
# gateway is killed) or declared (the removal stops after its native declaration, before its intent is recorded: the
# authority's record table is locked, and its gateway is killed). Every option of the merged branches is on
# (TX2_IMPORT_WHOLE_SUBJECT too). Stack: transactor, PostgreSQL storage, the PostgreSQL removal authority shared by a
# write and a read gateway, the production write switches; a second, unprotected database is the recipient.
# On the read gateway, while the removal is stopped, with tickets read before it (seq 0): a frame naming a, a frame
# naming b, a frame naming no account (into the source); a delivery naming a, one naming b, one naming no account
# (into the recipient, a cross-database ticket from the source). Then the removal is resumed, the a-delivery is sent
# again with its old ticket, and every document and both journals are read.
# Predictions (written 2026-11-24 before any run of this script):
#   publication, both arms: frames a and no-account 503; frame b 200; deliveries a and no-account 503; delivery b 200
#     (after) or 503 (before: the source's database-wide check refuses every account while a removal is pending);
#     resumed 200 (seq 1); the a-delivery again 409; a1's value in no document, journal page or recipient record.
#   declared, both arms: frame a 409 (the fence: a's counter is negated), the no-account frame 409 (the declared
#     sequence moved), frame b 200; delivery a 503 (after: a's negated counter) or 200 (before: the database-wide check
#     sees no intent; the removal has not begun in the authority, so this is a copy made before it, section 5);
#     delivery b 200; no-account delivery 200 (the same database-wide check); resumed 200; the a-delivery again 409.
#   Shown wrong if: after, anything of b is refused; any arm, a write naming a commits after the declaration, or a1's
#   value appears after the removal anywhere but in a copy the verdict lists as made before it.
set -euo pipefail
out=${1:?new absolute output directory}; bodies=${2:?bodies directory}; arm=${3:?before or after}; mode=${4:?publication or declared}
[[ $out == /* && ! -e $out ]] || { echo "give a new absolute output directory" >&2; exit 2; }
[[ $arm == before || $arm == after ]] || exit 2
[[ $mode == publication || $mode == declared ]] || exit 2
for f in seed-a1 seed-b1 frame-any frame-acct values; do [[ -s $bodies/$f.json ]] || { echo "missing $bodies/$f.json" >&2; exit 2; }; done
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}" "${DX_DATOMIC_IMAGE_RECEIPT:?start the stack from the image of this branch, by ID}"
export DOCKER_HOST
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo"
mkdir -p "$out/evidence" "$out/replies" "$out/bodies"
git rev-parse HEAD > "$out/source"
prefix=tx2-dxact9s-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')
echo "$prefix" > "$out/prefix"
port_w=${DX_ACT9_PORT_WRITE:-18951} port_r=${DX_ACT9_PORT_READ:-18955}
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
  DX_ERASURE_SQL=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_REMOVAL_PER_ACCOUNT=1 TX2_IMPORT_WHOLE_SUBJECT=1)
[[ $arm == after ]] && gateway+=(DX_ACCOUNT_TICKETS=1)
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
post() {
  local url=$1 body=$2 name=$3 data
  if [[ -f $body ]]; then data=@$body; else data=$body; fi
  curl -sS -m 90 -o "$out/replies/$name.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST "$url" --data-binary "$data" \
    > "$out/replies/$name.status" || echo 000 > "$out/replies/$name.status"
  step "$name -> $(cat "$out/replies/$name.status") $(head -c 300 "$out/replies/$name.json" 2>/dev/null)"
}
get() { curl -sS -m 30 -o "$out/replies/$2.json" -w '%{http_code}' "$1" > "$out/replies/$2.status" || echo 000 > "$out/replies/$2.status"; step "$2 -> $(cat "$out/replies/$2.status") $(head -c 300 "$out/replies/$2.json")"; }
psql_auth() { docker exec -i "$prefix-pg" psql -XtA -v ON_ERROR_STOP=1 -U postgres -d removal_authority "$@"; }
newscope() { node -e 'console.log(JSON.stringify(JSON.stringify(["triplex-scope-v1","test",process.argv[1],require("crypto").randomUUID(),0])))' "$1"; }

post "$W/v1/db/create" "{\"scope\":$(newscope act9-stack),\"layout\":\"lean\",\"strictRecordClocks\":true}" create
db=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/create.json")
post "$W/v1/db/create" "{\"scope\":$(newscope act9-recipient),\"layout\":\"lean\",\"strictRecordClocks\":true}" create-recipient
rdb=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).db)' "$out/replies/create-recipient.json")
echo "$db $rdb" > "$out/db"
# The bodies: the review's frames, renamed with names of the same length (each row text carries its name's length).
node - "$bodies" "$out/bodies" "$db" <<'JS'
const fs = require("fs"), [src, dst, db] = process.argv.slice(2);
const v = JSON.parse(fs.readFileSync(src + "/values.json", "utf8"));
const make = (from, pairs, accounts, source) => {
  let t = fs.readFileSync(`${src}/${from}.json`, "utf8");
  for (const [a, b] of pairs) { if (a.length !== b.length) throw new Error("length " + a + " " + b); t = t.split(a).join(b); }
  const j = JSON.parse(t);
  delete j.erasureAccounts; if (accounts) j.erasureAccounts = accounts;
  if (source) j.erasureSourceDatabase = db;
  return j;
};
const out = {
  "frame-a": make("frame-acct", [], ["a"], false),
  "frame-b": make("frame-acct", [["st-frame-acct", "st-frame-bbbb"], ["notice:v1:era3-acct", "notice:v1:act9-fr-b"], [v.a1, v.b1]], ["b"], false),
  "frame-any": make("frame-any", [], null, false),
  "deliver-a": make("frame-acct", [["st-frame-acct", "st-deliver-a1"], ["notice:v1:era3-acct", "notice:v1:act9-dl-a"]], ["a"], true),
  "deliver-b": make("frame-acct", [["st-frame-acct", "st-deliver-b1"], ["notice:v1:era3-acct", "notice:v1:act9-dl-b"], [v.a1, v.b1]], ["b"], true),
  "deliver-any": make("frame-any", [["st-frame-any", "st-deliv-any"], ["notice:v1:era3-any", "notice:v1:act9-dla"]], null, true),
};
if (v.a1.length !== v.b1.length) throw new Error("values differ in length");
for (const [k, j] of Object.entries(out)) fs.writeFileSync(`${dst}/${k}.json`, JSON.stringify(j));
JS
post "$W/v2/db/$db/protection" '{"attributes":[":v"],"sealed":false}' protection
post "$W/v2/db/$db/removal-per-account" '{}' move
post "$W/v1/db/$db/transact" "$bodies/seed-a1.json" seed-a1
post "$W/v1/db/$db/transact" "$bodies/seed-b1.json" seed-b1
get "$W/v2/db/$db/erasure-frontier" ticket
remove='{"commandId":"act9-stack-rm","selectors":[{"entityId":"acct/a/one","attribute":":v"}]}'

if [[ $mode == publication ]]; then
  step "hold the authority's head row for update (the removal will stop inside its publication)"
  psql_auth -c "BEGIN; SELECT 1 FROM triplex_removal.records WHERE scope='$db' AND record='head.json' FOR UPDATE; SELECT pg_sleep(120); ROLLBACK;" \
    > "$out/lock.log" 2>&1 &
else
  step "lock the authority's record table against writes (the removal will stop after its declaration, at its intent)"
  psql_auth -c "BEGIN; LOCK TABLE triplex_removal.records IN EXCLUSIVE MODE; SELECT pg_sleep(120); ROLLBACK;" > "$out/lock.log" 2>&1 &
fi
lock_pid=$!
sleep 2
( post "$W/v2/db/$db/erase" "$remove" removal-1 ) &
rm_pid=$!
reached=0
for i in $(seq 1 150); do
  if [[ $mode == publication ]]; then
    n=$(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$db' AND record='pending.json'")
    curl -sS -m 10 -o "$out/replies/journal-poll.json" -H 'Content-Type: application/json' -X POST "$R/v2/db/$db/transactions" \
      --data-binary '{"after":0,"limit":100}' > /dev/null || true
    if [[ $n == 1 ]] && grep -q 'privacy-erasure' "$out/replies/journal-poll.json"; then reached=1; break; fi
  else
    # the removal's intent write waits on the table lock: its declaration (the transaction before it) has committed
    n=$(psql_auth -c "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query ILIKE '%triplex_removal.records%' AND query NOT ILIKE '%pg_sleep%'")
    if [[ $n -ge 1 ]] && kill -0 "$rm_pid" 2>/dev/null; then reached=1; break; fi
  fi
  sleep 0.2
done
step "the removal stopped at its $mode: $reached"
[[ $reached == 1 ]] || { echo "the removal never reached its $mode" >&2; exit 1; }
step "kill the write gateway"
docker kill "$prefix-gw-w" > /dev/null
wait "$rm_pid" || true
psql_auth -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(120)%' AND pid <> pg_backend_pid()" >> "$out/lock.log" 2>&1 || true
wait "$lock_pid" 2>/dev/null || true; lock_pid=
sleep 2
step "pending intents: $(psql_auth -c "SELECT count(*) FROM triplex_removal.records WHERE scope='$db' AND record='pending.json'")"
get "$R/v2/db/$db/erasure-frontier?account=a&since=0" frontier-a-while-stopped
get "$R/v2/db/$db/erasure-frontier?account=b&since=0" frontier-b-while-stopped
for k in frame-a frame-b frame-any; do post "$R/v1/db/$db/transact" "$out/bodies/$k.json" "$k-while-stopped"; done
for k in deliver-a deliver-b deliver-any; do post "$R/v1/db/$rdb/transact" "$out/bodies/$k.json" "$k-while-stopped"; done
post "$R/v2/db/$db/erase" "$remove" removal-resumed
post "$R/v1/db/$rdb/transact" "$out/bodies/deliver-a.json" deliver-a-again-after
post "$R/v1/db/$db/transact" "$out/bodies/frame-a.json" frame-a-again-after
post "$R/v1/db/$db/read" '{"entityIds":["acct/a/one","notice:v1:era3-acct","notice:v1:act9-fr-b","notice:v1:era3-any"]}' read-source-after
post "$R/v1/db/$rdb/read" '{"entityIds":["notice:v1:act9-dl-a","notice:v1:act9-dl-b","notice:v1:act9-dla"]}' read-recipient-after
post "$R/v2/db/$db/transactions" '{"after":0,"limit":200}' journal-source-after
post "$R/v2/db/$rdb/transactions" '{"after":0,"limit":200}' journal-recipient-after
get "$R/v2/db/$db/erasure-frontier?account=a&since=0" frontier-a-after
node - "$out" "$arm" "$mode" "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).a1)' "$bodies/values.json")" <<'JS' | tee "$out/verdict.json"
const fs = require("fs"), [out, arm, mode, va] = process.argv.slice(2);
const r = (n) => { try { return { status: Number(fs.readFileSync(`${out}/replies/${n}.status`, "utf8")), body: fs.readFileSync(`${out}/replies/${n}.json`, "utf8") }; } catch { return { status: 0, body: "" }; } };
const sc = (n) => [r(n).status, (r(n).body.match(/"code":"([^"]+)"/) || [])[1] ?? null];
const removal = (() => { try { return JSON.parse(r("removal-resumed").body); } catch { return {}; } })();
const has = (n) => r(n).body.split(va).length - 1;
const verdict = { arm, mode,
  whileStopped: Object.fromEntries(["frame-a", "frame-b", "frame-any", "deliver-a", "deliver-b", "deliver-any"].map((k) => [k, sc(k + "-while-stopped")])),
  frontierA: (() => { try { return JSON.parse(r("frontier-a-while-stopped").body); } catch { return null; } })(),
  removalResumed: [r("removal-resumed").status, removal.seq, removal.position],
  deliverAAgainAfter: sc("deliver-a-again-after"), frameAAgainAfter: sc("frame-a-again-after"),
  // a1's removed value after the removal: in the source's documents and journal, the recipient's documents and journal
  removedValueCopies: { sourceRead: has("read-source-after"), sourceJournal: has("journal-source-after"),
    recipientRead: has("read-recipient-after"), recipientJournal: has("journal-recipient-after") },
  // a copy that committed while the removal had not recorded its intent (declared only) is a copy made before it
  copiesMadeBeforeIntent: mode === "declared" ? ["deliver-a", "deliver-any", "frame-any", "frame-a"].filter((k) => r(k + "-while-stopped").status === 200) : [],
};
console.log(JSON.stringify(verdict, null, 1));
JS
