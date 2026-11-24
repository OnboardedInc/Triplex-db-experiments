#!/usr/bin/env bash
# [DX-ERA2] The server run, for the day a machine is rented (never on the Mac): removal on request in ONE deep account of
# the sealed 1 billion database at a realistic and at a heavy rate, beside saves in 200 other accounts and a quiet
# account, with TX2_REMOVAL_PER_ACCOUNT off (arm 0) and on (arm 1). Each arm runs on its own disposable byte copy of the
# stopped cluster, which gets a removal policy for a new protected field by ERASE2's trusted staging (the 1 billion
# database was loaded without one; a populated scope refuses a public declaration). Run as root from a clean clone:
#   sudo env DEMO_ORIGINAL=<stopped 1B cluster> SCRATCH=<directory with 200 GB free on the NVMe> \
#     ERA2_SCOPE='<the database scope JSON from the aged-scorecard handoff>' ERA2_DEEP_KEY=<a deep account key, e.g. account-001> \
#     bash lab/experiments/EXP-DX1/era2/server.sh OUT_DIR [ARMS (default "0 1")] [CELLS (default "0 0.2 10")]
# Cells are removal rates per second in the deep account (0 is the control). Predictions: era2/REMOVAL-PER-ACCOUNT.md
# section 10. Written; not run anywhere (the staging step is ERASE2's, erase1/measure-server.ts lines 186-209).
set -euo pipefail
out=${1:?output directory}; arms=(${2:-0 1}); cells=(${3:-0 0.2 10})
: "${DEMO_ORIGINAL:?the stopped 1 billion cluster}" "${SCRATCH:?a scratch directory for the disposable copies}"
: "${ERA2_SCOPE:?the database scope JSON}" "${ERA2_DEEP_KEY:?the deep account that removes values}"
[[ ${DX_BARE_METAL:-1} == 1 && $(uname -s) == Linux ]] || { echo "server.sh runs on the rented server only" >&2; exit 2; }
export DX_BARE_METAL=1 DOCKER_HOST=${DOCKER_HOST:-unix:///var/run/docker.sock}
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$repo"
mkdir -p "$out"
git rev-parse HEAD > "$out/source"
if [[ ! -f "$out/built" ]]; then
  pnpm install --frozen-lockfile > "$out/install.log" 2>&1
  for p in core datomic w0 qualification; do (cd "packages/$p" && pnpm run build) >> "$out/install.log" 2>&1; done
  touch "$out/built"
fi
profile=()
while IFS= read -r line; do profile+=("$line"); done < <(node demo/server/profile.mjs server)
envs=() args=() sep=0
for line in "${profile[@]}"; do
  if [[ $line == -- ]]; then sep=1; elif [[ $sep == 0 ]]; then envs+=("$line"); else args+=("$line"); fi
done
gateway=(TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0 DX_INT1_NATIVE_WRITE_READBACK=1)
db=$(node -e 'const s=process.argv[1]; console.log("s2-"+Buffer.from(s).toString("base64url"))' "$ERA2_SCOPE")
for arm in "${arms[@]}"; do
  a=$out/arm-$arm; mkdir -p "$a"
  copy=$SCRATCH/era2-copy-$arm
  [[ ! -e $copy ]] || { echo "refusing an existing copy $copy" >&2; exit 2; }
  t0=$SECONDS; cp -a --reflink=auto "$DEMO_ORIGINAL" "$copy"; echo "copy_s=$((SECONDS - t0))" >> "$a/timings"
  prefix=tx2-dxscale1-removal-era2-$arm-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
  field=":era2/protected-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
  token=$(openssl rand -hex 24)
  t0=$SECONDS
  env "${envs[@]}" "${gateway[@]}" DX_REMOVAL_PER_ACCOUNT="$arm" DX_ERASE2_SCOPE="$ERA2_SCOPE" DX_ERASE2_FIELD="$field" \
    DX_ERASE_TOKEN="$token" TRIPLEX_ERASURE_WRAPPING_KEY="$(openssl rand -base64 32)" DX_STACK_EVIDENCE="$a/stack" \
    DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off \
    bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --pg-data "$copy" --port-write 18951 --port-read 18955 "${args[@]}" \
    > "$a/up.log" 2>&1
  echo "up_s=$((SECONDS - t0))" >> "$a/timings"
  head=$(curl -fsS "http://127.0.0.1:18951/v1/db/$db/basis" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).position.v))')
  curl -fsS -X POST "http://127.0.0.1:18951/erase1/server-protection" -H "x-erase1-token: $token" \
    -H 'content-type: application/json' --data "$(node -e 'console.log(JSON.stringify({scope: process.argv[1], position: Number(process.argv[2])}))' "$ERA2_SCOPE" "$head")" \
    > "$a/protection.json"
  status=0
  for cell in "${cells[@]}"; do
    env ERA2_DB="$db" ERA2_SSN="$field" ERA2_REMOVAL_KEYS="$ERA2_DEEP_KEY" ERA2_PER_ACCOUNT="$arm" ERA2_LABEL="arm$arm-r$cell" \
      ERA2_ACCOUNTS=202 ERA2_SUBJECTS=5 ERA2_REMOVAL_RATE="$cell" ERA2_SECONDS=600 ERA2_SAVE_RATE=200 ERA2_SAME_RATE=8 \
      ERA2_QUIET_RATE=3.5 ERA2_CONTEST_RATE=2 ERA2_READERS=32 ERA2_INFLIGHT=48 ERA2_FRAME_RATE=10 ERA2_BACKOFF_MS=10 \
      node --no-warnings --experimental-transform-types --max-old-space-size=8192 lab/experiments/EXP-DX1/era2/fault.ts "$a" \
      http://127.0.0.1:18951 http://127.0.0.1:18955 > "$a/arm$arm-r$cell.log" 2>&1 || status=$?
    grep -E '"kind":"(PASS|FAIL|result)"' "$a/arm$arm-r$cell.log" | cut -c1-1500 || tail -20 "$a/arm$arm-r$cell.log"
  done
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$a/$role.log" 2>&1 || true; done
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes > "$a/down.log" 2>&1 || true
  rm -rf "$copy"
  [[ $status == 0 ]] || { echo "arm $arm failed ($status)" >&2; exit "$status"; }
done
tar -C "$out" -czf "$out.tar.gz" . && echo "evidence: $out.tar.gz"
