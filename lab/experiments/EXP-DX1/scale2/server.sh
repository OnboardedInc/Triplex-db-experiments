#!/usr/bin/env bash
# [DX-SCALE2] The server test of many small accounts beside the ten deep ones, on the sealed 1 billion database, for
# the day a machine is rented (never on the Mac). Each rung gets a fresh working copy of the sealed cluster
# (demo/server-up.sh --reset: a byte copy, start, identity checks), adds its small accounts with scale2/mini.ts in
# adoption mode, runs the live window and the checks, and stops the stack. Run as root from a clean clone at $COMMIT:
#   sudo env DEMO_ORIGINAL=<stopped 1 billion cluster> DEMO_HANDOFF=<aged-scorecard.json> \
#     bash lab/experiments/EXP-DX1/scale2/server.sh OUT_DIR [RUNG ...]
# Rungs (default "1k 10k"): 1k = 1,000 thin accounts + 200 publishing accounts; 10k = 10,000 thin + 500 publishing;
# 100k = 100,000 thin + 1,000 publishing (long: about 30 million facts to load; run only if the first two say so).
# Every rung: the options of this branch on (sweep gates evicted, one HTTP agent per process, enrolment beside saves),
# the ID list route and the sweep on, the held write-gateway switches, the production study's revisit shape.
set -euo pipefail
out=${1:?output directory}; shift
rungs=("${@:-1k 10k}")
[[ ${#rungs[@]} == 1 && ${rungs[0]} == *" "* ]] && read -r -a rungs <<< "${rungs[0]}"
: "${DEMO_ORIGINAL:?the stopped 1 billion cluster}" "${DEMO_HANDOFF:?its aged-scorecard.json handoff}"
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$repo"
mkdir -p "$out"
git rev-parse HEAD > "$out/source"
# Build the client side once (the stack is built by demo/server-up.sh).
if [[ ! -f "$out/built" ]]; then
  pnpm install --frozen-lockfile > "$out/install.log" 2>&1
  for p in core datomic w0 qualification qlever xtdb; do (cd "packages/$p" && pnpm run build) >> "$out/install.log" 2>&1; done
  touch "$out/built"
fi
gateway=(DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_PERMITS=2 DX_SWEEP_PER_ACCOUNT=1 DX_SWEEP_GATE_EVICT=1
  TX2_SUBJECT_SAVE=1 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1 DX_W1_EXTRA=1 DX_W1_PREDECESSOR=1
  DX_W1_FAST_REPLY=1 DX_W1_JOURNAL_QUERY=1 DX_GROUP_COMMIT=0)
client=(TRIPLEX_DATOMIC_LAYOUT=lean TRIPLEX_DATOMIC_FAST_PATHS=save-wire TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1
  TX2_W0_RESTORE_INDEXED_JOURNAL=1 DX_SERVER_RECORD_TIME=1 DX_STRICT_RECORD_CLOCKS=1 TX2_SETTLE_FRAMES=bytes
  TX2_SETTLE_PRECONDITION=progress TRIPLEX_DATOMIC_SHARED_AGENT=1 TX2_ENROL_BESIDE_SAVES=1
  TRIPLEX_DATOMIC_BOUNDED_JOURNAL=1 TRIPLEX_DATOMIC_LOADER_POSITION_ROWS=1)
for rung in "${rungs[@]}"; do
  case $rung in
    1k) shape=(DX_SCALE2_THIN=1000 DX_SCALE2_PUBLISH=210 DX_SCALE2_LATE=10 DX_SCALE2_PUBLISH_MAX=40) ;;
    10k) shape=(DX_SCALE2_THIN=10000 DX_SCALE2_PUBLISH=510 DX_SCALE2_LATE=10 DX_SCALE2_PUBLISH_MAX=40) ;;
    100k) shape=(DX_SCALE2_THIN=100000 DX_SCALE2_PUBLISH=1010 DX_SCALE2_LATE=10 DX_SCALE2_PUBLISH_MAX=40) ;;
    *) echo "unknown rung $rung" >&2; exit 2 ;;
  esac
  r=$out/$rung
  mkdir -p "$r"
  env "${gateway[@]}" bash demo/server-up.sh --reset > "$r/up.log" 2>&1
  ready=/var/tmp/triplex-demo/ready.json
  w=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).writePort' "$ready")
  rd=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).readPort' "$ready")
  prefix=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).prefix' "$ready")
  status=0
  env "${client[@]}" "${shape[@]}" DX_SCALE2_ADOPT="$ready" DX_SCALE2_SEED="server-$rung" DX_SCALE2_WINDOW_S=600 \
    DX_SCALE2_RATE=40 DX_SCALE2_THIN_SHARE=0.35 DX_SCALE2_BUSY_RATE=8 DX_SCALE2_QUIET_RATE=1 DX_SCALE2_INFLIGHT=32 \
    DX_SCALE2_READERS=32 DX_SCALE2_SAMPLE=60 DX_SCALE2_LOAD_DEPTH=8 DX_SCALE2_LOAD_ROWS=1000 \
    DATOMIC_URL="http://127.0.0.1:$w" DATOMIC_READ_URLS="http://127.0.0.1:$rd" \
    node --no-warnings --expose-gc --experimental-transform-types --max-old-space-size=12288 \
    lab/experiments/EXP-DX1/scale2/mini.ts "$r" "http://127.0.0.1:$w" "http://127.0.0.1:$rd" "$prefix" > "$r/mini.log" 2>&1 || status=$?
  for role in gw-r gw-w tx; do docker logs "$prefix-$role" > "$r/$role.log" 2>&1 || true; done
  bash demo/server-down.sh > "$r/down.log" 2>&1 || true
  grep -E '"kind":"(PASS|load|enrolled|published|late-enrolment|window|feed|settlement)"' "$r/mini.log" | cut -c1-600 || tail -20 "$r/mini.log"
  [[ $status == 0 ]] || { echo "rung $rung failed ($status)" >&2; exit "$status"; }
done
tar -C "$out" -czf "$out.tar.gz" . && echo "evidence: $out.tar.gz"
