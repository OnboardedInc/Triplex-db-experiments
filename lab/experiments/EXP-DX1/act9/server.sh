#!/usr/bin/env bash
# [DX-ACT9] The server run, for the day a machine is rented (never on the Mac): the many-accounts rung (200 publishing
# accounts publishing at once and then round after round: Publish, settle, deliver, read recorded notices; 1,000 thin
# accounts saving; ten more accounts enrolling) on a byte copy of the sealed 1 billion database, with removals on request
# in ONE deep account at a realistic rate (0.2 per second, 720 an hour) and a heavy one (10 per second), 600 s each.
# Arm "before": the per-account removal rule with tickets as the Publish branch sends them (TX2_ACCOUNT_TICKETS unset).
# Arm "after": TX2_ACCOUNT_TICKETS=1 on the client and both gateways. Each arm gets its own disposable copy; the
# protected field is added by ERASE2's trusted staging at the copy's head (the sealed database has none), and the
# database is moved per account before the first cell. Predictions: actv-lazy/ACCOUNT-TICKETS.md, the server section.
# Run as root from a clean clone at the branch head:
#   sudo env DEMO_ORIGINAL=<stopped 1B cluster> SCRATCH=<directory with 200 GB free on the NVMe> \
#     ERA2_SCOPE='<the database scope JSON from the aged-scorecard handoff>' \
#     bash lab/experiments/EXP-DX1/act9/server.sh OUT_DIR [ARMS (default "before after")] [CELLS (default "0.2 10")]
set -euo pipefail
out=${1:?output directory}; arms=(${2:-before after}); cells=(${3:-0.2 10})
: "${DEMO_ORIGINAL:?the stopped 1 billion cluster}" "${SCRATCH:?a scratch directory for the disposable copies}"
: "${ERA2_SCOPE:?the database scope JSON}"
[[ ${DX_BARE_METAL:-1} == 1 && $(uname -s) == Linux ]] || { echo "server.sh runs on the rented server only" >&2; exit 2; }
export DX_BARE_METAL=1 DOCKER_HOST=${DOCKER_HOST:-unix:///var/run/docker.sock}
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$repo"
mkdir -p "$out"
git rev-parse HEAD > "$out/source"
if [[ ! -f "$out/built" ]]; then
  pnpm install --frozen-lockfile > "$out/install.log" 2>&1
  for p in core datomic w0 qualification qlever xtdb; do (cd "packages/$p" && pnpm run build) >> "$out/install.log" 2>&1; done
  touch "$out/built"
fi
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs server)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_INT1_NATIVE_WRITE_READBACK=1
  DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_PERMITS=2 DX_SWEEP_PER_ACCOUNT=1 DX_SWEEP_GATE_EVICT=1 DX_REMOVAL_PER_ACCOUNT=1)
client=(TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1
  TX2_W0_RESTORE_INDEXED_JOURNAL=1 DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1 TX2_SETTLE_FRAMES=bytes
  TX2_SETTLE_PRECONDITION=progress TRIPLEX_DATOMIC_SHARED_AGENT=1 TX2_ENROL_BESIDE_SAVES=1 TX2_PUBLISH_BESIDE=1
  TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1 TRIPLEX_DATOMIC_LOADER_POSITION_ROWS=1 TX2_REMOVAL_PER_ACCOUNT=1
  DX_SCALE2_REMOVAL=1 DX_ACT9_CELL=1 DX_ACT9_REMOVER=deep DX_ACT9_SECONDS=600 DX_SCALE2_LIVE_AT_ONCE=1
  DX_SCALE2_THIN=1000 DX_SCALE2_PUBLISH=210 DX_SCALE2_LIVE_PUBLISH=200 DX_SCALE2_LATE=10 DX_SCALE2_PUBLISH_MAX=40
  DX_SCALE2_ADOPT_DEEP_PEOPLE=100000 DX_SCALE2_THIN_SHARE=0.35)
db=$(node -e 'const s=process.argv[1]; console.log("s2-"+Buffer.from(s).toString("base64url"))' "$ERA2_SCOPE")
for arm in "${arms[@]}"; do
  [[ $arm == before || $arm == after ]] || { echo "arm is before or after" >&2; exit 2; }
  a=$out/arm-$arm; mkdir -p "$a"
  copy=$SCRATCH/act9-copy-$arm
  [[ ! -e $copy ]] || { echo "refusing an existing copy $copy" >&2; exit 2; }
  t0=$SECONDS; cp -a --reflink=auto "$DEMO_ORIGINAL" "$copy"; echo "copy_s=$((SECONDS - t0))" >> "$a/timings"
  prefix=tx2-dxscale1-removal-act9-$arm-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
  field=":act9/protected-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
  token=$(openssl rand -hex 24)
  extra=(); armclient=()
  [[ $arm == after ]] && { extra=(DX_ACCOUNT_TICKETS=1); armclient=(TX2_ACCOUNT_TICKETS=1); }
  t0=$SECONDS
  env "${envs[@]}" "${gateway[@]}" "${extra[@]}" DX_REMOVAL_TRIES_LOG=1 \
    DX_ERASE2_SCOPE="$ERA2_SCOPE" DX_ERASE2_FIELD="$field" \
    DX_ERASE_TOKEN="$token" TRIPLEX_ERASURE_WRAPPING_KEY="$(openssl rand -base64 32)" DX_STACK_EVIDENCE="$a/stack" \
    DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
    bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --pg-data "$copy" --port-write 18961 --port-read 18965 "${args[@]}" \
    > "$a/up.log" 2>&1
  echo "up_s=$((SECONDS - t0))" >> "$a/timings"
  for role in tx gw-w gw-r pg; do echo "$prefix-$role $(docker inspect --format '{{.Image}}' "$prefix-$role")"; done > "$a/images-ran"
  head=$(curl -fsS "http://127.0.0.1:18961/v1/db/$db/basis" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).position.v))')
  curl -fsS -X POST "http://127.0.0.1:18961/erase1/server-protection" -H "x-erase1-token: $token" \
    -H 'content-type: application/json' --data "$(node -e 'console.log(JSON.stringify({scope: process.argv[1], position: Number(process.argv[2])}))' "$ERA2_SCOPE" "$head")" \
    > "$a/protection.json"
  node -e 'const fs=require("fs"); fs.writeFileSync(process.argv[1], JSON.stringify({version:"triplex-demo-ready/1", database:process.argv[2],
    scope:process.argv[3], prefix:process.argv[4], writePort:18961, readPort:18965})+"\n")' "$a/ready.json" "$db" "$ERA2_SCOPE" "$prefix"
  status=0 k=0
  for cell in "${cells[@]}"; do
    # Each cell adds its own small accounts (an index offset past the earlier cells' keys) to the same database.
    env "${client[@]}" "${armclient[@]}" DATOMIC_URL=http://127.0.0.1:18961 DATOMIC_READ_URLS=http://127.0.0.1:18965 \
      DX_SCALE2_ADOPT="$a/ready.json" DX_SCALE2_INDEX_OFFSET=$((10 + k * 1300)) DX_SCALE2_SEED="act9-$arm-$k" \
      DX_ACT9_RATE="$cell" DX_ACT9_FIELD="$field" \
      node --no-warnings --expose-gc --experimental-transform-types --max-old-space-size=16384 \
      lab/experiments/EXP-DX1/scale2/mini.ts "$a/cell-$cell" http://127.0.0.1:18961 http://127.0.0.1:18965 "$prefix" \
      > "$a/cell-$cell.log" 2>&1 || status=$?
    grep -E '"kind":"(PASS|act9-cell|settlement|late-enrolment)"' "$a/cell-$cell.log" | cut -c1-3000 || tail -20 "$a/cell-$cell.log"
    k=$((k + 1))
  done
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$a/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes > "$a/down.log" 2>&1 || true
  rm -rf "$copy"
  [[ $status == 0 ]] || { echo "arm $arm failed ($status)" >&2; exit "$status"; }
done
tar -C "$out" -czf "$out.tar.gz" . && echo "evidence: $out.tar.gz"
