#!/usr/bin/env bash
# [DX-SRV2] One driver for every step of the rented-server session of srv1/SESSION-PLAN.md (at most 50 US dollars, 1
# billion records). Each step takes its options from ONE settings file and has a --dry-run that goes through the
# step's stages on the Mac toy. It never creates, rents or deletes a machine and holds no provider credential: creation
# stays with the orchestrator, deletion with the last-run driver (step `finish` prepares it and says so).
#
#   On the server, as root:   bash lab/experiments/EXP-DX1/srv2/session.sh STEP --settings /root/srv2.settings
#   On the Mac (dry run):     bash lab/experiments/EXP-DX1/srv2/session.sh STEP --dry-run --settings FILE
#   Spend only:               bash lab/experiments/EXP-DX1/srv2/session.sh spend --settings FILE
#
# STEP: stage a1 a2 a2b a9 a4 b1 b2 b3 b4 b5 b6 b7 a5 a6 a7 a8 b8 finish spend check
# The settings file is KEY=VALUE lines (srv2/session.settings.example names every key). It is private: it may hold
# server-side paths and private addresses, never credentials (object storage credentials stay in STORAGE_ENV, a second
# private file read only by `stage`). Nothing in this script or its records names a host, an address or an account.
#
# Every step: refuses when the session's spend estimate plus the step's high estimate plus 30 minutes of cleanup per
# running machine passes STOP_NEW_STEP (46); while it runs, a watcher stops it at DELETE_AT (48) and writes
# $OUT_ROOT/STOP-DELETE-NOW; it records run-record.json (step, commit, image IDs, options, settings digest, spend at
# start and end) in the step's evidence directory, which is where the server run writes it.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
step=${1:?usage: session.sh STEP [--dry-run] --settings FILE}; shift
dry=0 settings= action=
while (($#)); do
  case $1 in --dry-run) dry=1;; --settings) settings=${2:?}; shift;; --action) action=${2:?}; shift;;
    *) echo "session.sh: unknown argument $1" >&2; exit 2;; esac
  shift
done
[[ -n $settings && -f $settings ]] || { echo "session.sh: give --settings FILE" >&2; exit 2; }

# ---------- settings: one file, plain values only (no expansion, no spaces, no shell syntax) ----------
allowed=" SESSION MACHINE COMMIT BUILD OUT_ROOT SCRATCH WAL_ROOT PRICE_PER_HOUR SPEND_BEFORE STOP_NEW_STEP DELETE_AT
  CLEANUP_MINUTES MACHINE_A_STARTED MACHINE_B_STARTED MACHINE_A_ENDED MACHINE_B_ENDED DEMO_ROOT AGED_PGDATA_SOURCE
  AGE_HANDOFF_JSON AGE_HANDOFF_SHA256 SCALE1_IMAGE SCALE1_IMAGE_SHA256 SCALE1_TRANSFER_SHA256 AGE_JAVA AGE_DATOMIC_HOME
  FRESH_PGDATA_SOURCE STORAGE_ENV READ_AHEAD_OFF DX_REMOTE_READER_HOST SECOND_READER_LISTEN SECOND_READER_URL
  MACHINE1_PRIVATE DRY_ROOT DRY_IMAGE DRY_CHECKOUT EVIDENCE_HOST_DIR "
allowed=" $(echo $allowed) "
settings_sha256=$( (command -v sha256sum >/dev/null && sha256sum "$settings" || shasum -a 256 "$settings") | cut -d' ' -f1)
while IFS= read -r line || [[ -n $line ]]; do
  [[ -z $line || $line == \#* ]] && continue
  [[ $line =~ ^([A-Z][A-Z0-9_]*)=([A-Za-z0-9_./:,+@=-]*)$ ]] || { echo "session.sh: settings line not KEY=plain-value: $line" >&2; exit 2; }
  [[ $allowed == *" ${BASH_REMATCH[1]} "* ]] || { echo "session.sh: unknown setting ${BASH_REMATCH[1]}" >&2; exit 2; }
  export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
done < "$settings"
need() { local v; for v; do [[ -n ${!v:-} ]] || { echo "session.sh: settings lack $v (step $step)" >&2; exit 2; }; done; }
need SESSION MACHINE COMMIT OUT_ROOT PRICE_PER_HOUR SPEND_BEFORE STOP_NEW_STEP DELETE_AT CLEANUP_MINUTES MACHINE_A_STARTED
[[ $MACHINE == A || $MACHINE == B ]] || { echo "session.sh: MACHINE is A or B" >&2; exit 2; }
[[ $COMMIT =~ ^[a-f0-9]{40}$ ]] || { echo "session.sh: COMMIT is a full 40-hex commit" >&2; exit 2; }
for v in STOP_NEW_STEP DELETE_AT PRICE_PER_HOUR SPEND_BEFORE; do [[ ${!v} =~ ^[0-9]+(\.[0-9]+)?$ ]] || { echo "session.sh: $v is a number" >&2; exit 2; }; done
[[ $(awk -v a="$STOP_NEW_STEP" -v b="$DELETE_AT" 'BEGIN{print (a<b && b<=50)}') == 1 ]] || { echo "session.sh: need STOP_NEW_STEP < DELETE_AT <= 50" >&2; exit 2; }
if ((dry)); then
  [[ $(uname -s) == Darwin ]] || { echo "session.sh: --dry-run runs on the Mac toy" >&2; exit 2; }
  need DRY_ROOT; [[ $DRY_ROOT == /* ]] || exit 2
  export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
  # The dry run writes where the server run would, under DRY_ROOT (so /var/tmp/srv2/a4 becomes $DRY_ROOT/var/tmp/srv2/a4).
  root() { printf '%s%s' "$DRY_ROOT" "$1"; }
else
  [[ $(uname -s) == Linux && $EUID == 0 ]] || { echo "session.sh: run as root on the rented Linux machine (or pass --dry-run on the Mac)" >&2; exit 2; }
  root() { printf '%s' "$1"; }
fi
EVID=$(root "$OUT_ROOT/$step")

# ---------- spend: elapsed machine minutes at PRICE_PER_HOUR, plus what was spent before ----------
# MACHINE_x_STARTED / _ENDED are epoch seconds the orchestrator writes from the provider's order and delete times.
. "$here/lib.sh"
guard() {  # refuse a new step past STOP_NEW_STEP; refuse anything past DELETE_AT
  local spent running high verdict
  read -r spent running < <(spend_now)
  high=$(step_high_minutes "$1")
  verdict=$(awk -v s="$spent" -v h="$high" -v r="$running" -v c="$CLEANUP_MINUTES" -v p="$PRICE_PER_HOUR" -v stop="$STOP_NEW_STEP" -v del="$DELETE_AT" \
    'BEGIN{ f=s+h/60*p*(r>0?r:1)+r*c/60*p; if (s>=del) print "delete"; else if (f>stop) print "refuse " f; else print "ok " f }')
  echo "[srv2] spend so far USD $spent, $running machine(s) running; step $1 high ${high} min; forecast after it: ${verdict#* }"
  case $verdict in
    delete*) mkdir -p "$(root "$OUT_ROOT")"; date -u +%FT%TZ > "$(root "$OUT_ROOT")/STOP-DELETE-NOW"
      echo "[srv2] STOP: spend is at or past USD $DELETE_AT. Copy evidence (session.sh finish) and delete this machine now." >&2; exit 99;;
    refuse*) echo "[srv2] REFUSED: step $1 would end past USD $STOP_NEW_STEP with cleanup; skip it (plan C.2 'If money runs short')." >&2; exit 98;;
  esac
}
watcher() {  # stops the step at DELETE_AT; runs beside it
  local target=$1 spent running
  while kill -0 "$target" 2>/dev/null; do
    sleep 60
    read -r spent running < <(spend_now)
    if awk -v s="$spent" -v d="$DELETE_AT" 'BEGIN{exit !(s>=d)}'; then
      mkdir -p "$(root "$OUT_ROOT")"; date -u +%FT%TZ > "$(root "$OUT_ROOT")/STOP-DELETE-NOW"
      echo "[srv2] spend USD $spent reached $DELETE_AT: stopping step $step; copy evidence and delete" >&2
      kill -TERM -- "-$target" 2>/dev/null || { pkill -TERM -P "$target" 2>/dev/null; kill -TERM "$target" 2>/dev/null; } || true
      return
    fi
  done
}

# ---------- records ----------
images_json() {
  if ((dry)); then
    printf '[%s]' "$( (docker image inspect --format '{"ref":"{{index .RepoTags 0}}","id":"{{.Id}}"}' "${DRY_IMAGE:-none}" 2>/dev/null || echo '{"ref":"none","id":null}') | paste -sd, -)"
  else
    node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); console.log(JSON.stringify(r.images ?? null))' "$BUILD/BUILD-v0.1.json" 2>/dev/null || echo null
  fi
}
record() {  # $1 phase (start|end), $2 exit code, then option assignments
  local phase=$1 code=$2; shift 2
  mkdir -p "$EVID"
  local spent running; read -r spent running < <(spend_now)
  SRV2_REPO=$repo node -e '
    const [file, phase, code, step, machine, commit, sha, dry, spent, running, images, ...opts] = process.argv.slice(1);
    const fs = require("fs"); const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    const at = new Date().toISOString();
    const rec = { ...prev, step, machine, commit, settingsSha256: sha, mode: dry === "1" ? "mac-dry-run" : "server",
      ...(dry === "1" ? { codeRan: require("child_process").execFileSync("git", ["-C", process.env.SRV2_REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() } : {}),
      images: JSON.parse(images), options: Object.fromEntries(opts.map((o) => [o.slice(0, o.indexOf("=")), o.slice(o.indexOf("=") + 1)])) };
    rec[phase] = { at, spendUsd: Number(spent), runningMachines: Number(running), ...(phase === "end" ? { exit: Number(code) } : {}) };
    fs.writeFileSync(file, JSON.stringify(rec, null, 2) + "\n");' \
    "$EVID/run-record.json" "$phase" "$code" "$step" "$MACHINE" "$COMMIT" "$settings_sha256" "$dry" "$spent" "$running" "$(images_json)" "$@"
}
run_step() {  # runs "$@" in its own process group with the spend watcher beside it; records start and end
  local opts=() code
  while [[ $1 != -- ]]; do opts+=("$1"); shift; done; shift
  guard "$step"
  record start 0 ${opts[@]+"${opts[@]}"}
  set +e
  # Its own process group where the command is a program (setsid on the server), so the watcher stops all of it.
  if [[ $(type -t "$1") != function ]] && command -v setsid >/dev/null; then setsid "$@" & else ( "$@" ) & fi
  local pid=$!
  watcher "$pid" & local w=$!
  wait "$pid"; code=$?
  kill "$w" 2>/dev/null; wait "$w" 2>/dev/null
  set -e
  record end "$code" ${opts[@]+"${opts[@]}"}
  echo "[srv2] step $step exit $code; record $EVID/run-record.json"
  return "$code"
}
heavy() { node "$repo/lab/bin/heavy.mjs" --label "DX-SRV2-dry-$step-$1" -- "${@:2}"; }

# ---------- the server's shared functions (the pages' part(), arm(), rd5_arm(), ACT7's prepare/held/discard) ----------
server_env() {
  need BUILD SCRATCH WAL_ROOT AGED_PGDATA_SOURCE AGE_HANDOFF_JSON AGE_HANDOFF_SHA256 SCALE1_IMAGE SCALE1_IMAGE_SHA256 \
    SCALE1_TRANSFER_SHA256 AGE_JAVA AGE_DATOMIC_HOME
  [[ -f $BUILD/BUILD-v0.1.json ]] || { echo "session.sh: no build at $BUILD (run stage first)" >&2; exit 2; }
  [[ $(node -p 'require(process.argv[1]).source' "$BUILD/BUILD-v0.1.json") == "$COMMIT" ]] || { echo "session.sh: the build is not COMMIT" >&2; exit 2; }
  cd "$BUILD/repository"
  [[ $(git rev-parse HEAD) == "$COMMIT" ]]
  export SCORECARD_WAL_DIRECTORY=$WAL_ROOT/card-wal WAL_DIR=$WAL_ROOT/study-wal
}
part() {  # $1 part, $2 new copy, $3 campaign, $4 fresh|1B, $5 tape, $6 profile, $7 window seconds, $8 reader; $EXTRA; $CROSS
  local source aged=() reader=() cross=()
  if [[ $4 == 1B ]]; then source=${PART_SOURCE:-$AGED_PGDATA_SOURCE}; aged=(--aged-bundle "$AGE_HANDOFF_JSON" --aged-bundle-sha256 "$AGE_HANDOFF_SHA256")
  else need FRESH_PGDATA_SOURCE; source=$FRESH_PGDATA_SOURCE; fi
  [[ $8 == tuned ]] && reader=(--reader tuned --read-permits 12)
  [[ -n ${CROSS:-} ]] && cross=(--cross-index "$CROSS")
  env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" ${EXTRA:-} \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    "$BUILD/tools/bin/node" lab/bin/scorecard.mjs --commit "$COMMIT" --out "$3" --arm "$1" \
    --age "$4" --tape "$5" --profile "$6" "${reader[@]}" "${cross[@]}" --credit-mode rolling6 --window-seconds "$7" \
    --jvm j21-g1 --write-jvm j21-g1 --tx-jvm j25-zgc --wal-directory "$SCORECARD_WAL_DIRECTORY" \
    --seed "$SCALE1_IMAGE" --image-sha256 "$SCALE1_IMAGE_SHA256" --transfer-sha256 "$SCALE1_TRANSFER_SHA256" \
    "${aged[@]}" --pgdata-source "$source" --pgdata "$2"
}
card_parts() {  # $1 campaign, $2 "1 2 3" or "1 2", then part's $4..$8
  local out=$1 parts=$2 n; shift 2
  for n in $parts; do
    local copy=$SCRATCH/card-$n-$$
    make_copy "$copy" "${PART_SOURCE:-}" || return 1
    part "$n" "$copy" "$out" "$@" || { remove_copy "$copy"; return 1; }
    remove_copy "$copy"
  done
}
rd5_arm() {  # $1 new copy, $2 new campaign directory, $3 deadline ms, $4 permits, $5 prefetch, $6 read-ahead off, $7 cache MiB
  env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD3_PINNED_SAVES=1 DX_RD3_WINDOWS=random \
    "DX_RD3_READ_PERMITS=$4" "DX_RD5_READ_PREFETCH=$5" "DX_RD5_READ_AHEAD_OFF=$6" "DX_RD5_READ_CACHE_MIB=$7" \
    ${DX_REMOTE_READER_HOST:+DX_REMOTE_READER_HOST=$DX_REMOTE_READER_HOST} ${DX_RD5_SECOND_READER:+DX_RD5_SECOND_READER=$DX_RD5_SECOND_READER} \
    DX_W1_SERIAL_APPLY=0 PREP1_LOOKUP_EVERY=0 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=pinned-saves "DX_RD1_PGDATA=$1" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$2" "$3" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6
}
rd5_config() {  # $1 name, $2 permits, $3 read-ahead off, $4 cache MiB, $5 minutes until its deadline
  local copy=$SCRATCH/rd5-$1-$$
  mkdir -p "$OUT_ROOT/$step/$1"
  make_copy "$copy" || return 1
  rd5_arm "$copy" "$OUT_ROOT/$step/$1/campaign" $(( $(date +%s%3N) + $5 * 60 * 1000 )) "$2" 1 "$3" "$4"; local c=$?
  remove_copy "$copy"; return $c
}
pinned_variant() {  # $1 variant (control|off-permits4|cut-only); the off ladder of the pinned pair, old pin, 1/16/256 seats
  local copy=$SCRATCH/pair-$1-$$ out=$OUT_ROOT/a1/$1
  mkdir -p "$out"; make_copy "$copy" || return 1
  env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" \
    "AGE_JAVA=$AGE_JAVA" "AGE_DATOMIC_HOME=$AGE_DATOMIC_HOME" DX_RD2_PINNED_PAIR=1 \
    "DX_RD2_PAIR_VARIANT=$1" DX_RD2_PAIR_PINS=old DX_RD2_PAIR_SEATS=1,16,256 \
    "DX_RD1_PGDATA_SOURCE=$AGED_PGDATA_SOURCE" DX_RD1_LADDER=off "DX_RD1_PGDATA=$copy" \
    ${DX_DRY_RUN_FIRST_OFFER:+DX_DRY_RUN_FIRST_OFFER=1} \
    bash lab/experiments/EXP-DX1/v01/study-server.sh "$COMMIT" "$out/pair" $(( $(date +%s%3N) + 20 * 60 * 1000 )) "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" \
    "$SCALE1_TRANSFER_SHA256" 1B per-person-ordered j21-g1 "$AGE_HANDOFF_JSON" "$AGE_HANDOFF_SHA256" "" "" \
    j25-zgc "$WAL_DIR" j21-g1 rolling6; local c=$?
  remove_copy "$copy"; return $c
}
demo_up() {  # bring-up of the sealed working copy with the given options; prints DEMO READY
  need DEMO_ROOT
  env "$@" DEMO_ROOT="$DEMO_ROOT" DEMO_ORIGINAL="${DEMO_ORIGINAL_OVERRIDE:-$AGED_PGDATA_SOURCE}" DEMO_HANDOFF="$AGE_HANDOFF_JSON" bash demo/server-up.sh --reset
}
demo_down() { env DEMO_ROOT="$DEMO_ROOT" bash demo/server-down.sh; }
act7_prepare() { PREPARED_PGDATA=$SCRATCH/act7-prepared-$$ PREPARED_WAL=$WAL_ROOT/act7-wal-$$; export PREPARED_PGDATA PREPARED_WAL
  bash lab/experiments/EXP-DX1/actv-lazy/act7/prepare-copy.sh "$1" "$PREPARED_PGDATA" "$PREPARED_WAL"; }
act7_discard() { rm -rf --one-file-system "$PREPARED_PGDATA" "$PREPARED_WAL"; }
held() {  # the rest of the environment comes from the caller; $TEMPLATE and $DX_LAZY_OUT set
  env "PATH=$BUILD/tools/bin:$PATH" "DX_V01_BUILD_RECEIPT=$BUILD/BUILD-v0.1.json" "$@" \
    bash lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
    "$COMMIT" "$SCALE1_IMAGE" "$SCALE1_IMAGE_SHA256" "$SCALE1_TRANSFER_SHA256" \
    "$TEMPLATE" "$PREPARED_PGDATA" "$PREPARED_WAL" "$DX_LAZY_OUT"
}
# The product's save path on the fast writers (S2's arm C) and the card's read options; A2 decides READ_AHEAD_OFF.
product_opts="DX_S2_PRODUCT=1 TX2_SUBJECT_WIDE=1 TX2_SUBJECT_HINTS=1 TX2_GENERAL_PREFETCH=1"
read_opts() { printf 'DX_READ_PREFETCH=1%s DX_V01_SAMPLE_EVERY=1' "$([[ ${READ_AHEAD_OFF:-0} == 1 ]] && printf ' DX_READ_AHEAD_OFF=1')"; }

# ---------- Mac dry runs (toy equivalents; each under one ordinary heavy token; times diagnostic) ----------
dry_card() {  # $1 name, then env assignments for the toy card (v01/mac.ts --fixture)
  need DRY_CHECKOUT
  local name=$1; shift
  (cd "$repo" && env DX_V01_TAPE=${TOY_TAPE:-production-S-noburst} DX_V01_READER=tuned DX_V01_READ_PERMITS=12 "$@" \
    node "$repo/lab/bin/heavy.mjs" --label "DX-SRV2-dry-$step-$name" -- \
    node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/mac.ts --fixture "$(git -C "$repo" rev-parse HEAD)" "$DRY_CHECKOUT" per-person-ordered rolling6)
  local f; f=$(ls -d "$DRY_CHECKOUT"/repository/runs/DX-V01/fixture-* | tail -1)
  mkdir -p "$EVID"; tar -czf "$EVID/$name.tar.gz" -C "$(dirname "$f")" "$(basename "$f")"
  cp "$f/SCORECARD-v0.1.md" "$EVID/$name-SCORECARD.md"
  node --no-warnings --experimental-transform-types "$here/dry-check.ts" card "$f" "$@"
}
dry_gate() {  # $1 name, $2 script (relative to the repository), then its arguments after OUT
  local name=$1 script=$2; shift 2
  mkdir -p "$EVID"
  (cd "$repo" && heavy "$name" bash "$script" "$EVID/$name" "$@")
}
plan_dry() {  # the server commands of this step, with every page script checked present and parseable at COMMIT
  local f
  for f in "$@"; do
    git -C "$repo" cat-file -e "$COMMIT:$f" 2>/dev/null || { echo "[srv2] MISSING at COMMIT: $f" >&2; return 1; }
    [[ $f != *.sh ]] || git -C "$repo" show "$COMMIT:$f" | bash -n || { echo "[srv2] bash syntax error: $f" >&2; return 1; }
  done
  echo "[srv2] $# page scripts present at ${COMMIT:0:9}: $*"
}

# ---------- the steps ----------
case $step in
spend)
  read -r s r < <(spend_now); echo "session spend USD $s; machines running $r; no new step past USD $STOP_NEW_STEP; delete at USD $DELETE_AT"; exit 0;;
check)  # settings and scripts only; no stack
  plan_dry lab/experiments/EXP-DX1/v01/build.ts demo/server-up.sh demo/server-down.sh lab/bin/scorecard.mjs \
    lab/experiments/EXP-DX1/v01/study-server.sh lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh \
    lab/experiments/EXP-DX1/actv-lazy/act7/prepare-copy.sh lab/experiments/EXP-DX1/rd5/second-reader.sh \
    lab/experiments/EXP-DX1/xq1/server.ts lab/experiments/EXP-DX1/xq3/server.ts lab/experiments/EXP-DX1/xq6/server.ts \
    lab/experiments/EXP-DX1/xq7/server.ts lab/experiments/EXP-DX1/xq10/server.ts lab/experiments/EXP-DX1/api1/server.ts \
    lab/experiments/EXP-DX1/jrn1/probe.ts lab/experiments/EXP-DX1/w3/threads-sampler.sh lab/experiments/EXP-DX1/srv2/session.sh
  guard check; exit 0;;
stage)  # A0 / B0: build at COMMIT, fetch and check the 1 billion cluster and the SCALE1 metadata, bring-up check, card dry run
  if ((dry)); then
    run_step -- bash -c '
      set -e
      '"$(declare -f plan_dry)"'
      COMMIT='"$COMMIT"' repo='"$repo"'
      plan_dry lab/experiments/EXP-DX1/v01/build.ts demo/server-up.sh demo/server/inventory.py lab/experiments/EXP-DX1/srv2/session.sh
      node --no-warnings --experimental-transform-types '"$here"'/dry-check.ts copy '"$EVID"'
      node --no-warnings --experimental-transform-types '"$here"'/dry-check.ts downloads '"$EVID"'
    '
  else
    need BUILD DEMO_ROOT STORAGE_ENV SCRATCH WAL_ROOT
    run_step -- bash -c '
      set -euo pipefail
      [[ -e '"$BUILD"' ]] || node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/v01/build.ts '"$COMMIT"' '"$BUILD"'
      free=$(df -P --block-size=1G '"$DEMO_ROOT"' | awk "NR==2{print \$4}"); echo "[srv2] free GB under DEMO_ROOT: $free (520 needed while the archive is kept)"
      mkdir -p '"$SCRATCH"' '"$WAL_ROOT"' '"$OUT_ROOT"'
      [[ $(stat -c %d '"$SCRATCH"') != $(stat -c %d '"$WAL_ROOT"') ]] || { echo "SCRATCH and WAL_ROOT must be on different drives" >&2; exit 2; }
      cd '"$BUILD"'/repository
      set -a; . '"$STORAGE_ENV"'; set +a   # AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_BUCKET: environment only
      DEMO_ROOT='"$DEMO_ROOT"' bash demo/server-up.sh --fetch     # fetch, both digests, extract, tree check, bring-up: DEMO READY
      bash demo/server-down.sh
      # The SCALE1 metadata directory (image.json, transfer.json) beside the fresh archive; pinned by digest.
      mkdir -p '"$SCALE1_IMAGE"'
      export RCLONE_CONFIG_S_TYPE=s3 RCLONE_CONFIG_S_PROVIDER=Other RCLONE_CONFIG_S_ENV_AUTH=false RCLONE_CONFIG_S_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
        RCLONE_CONFIG_S_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY RCLONE_CONFIG_S_ENDPOINT=$S3_ENDPOINT RCLONE_CONFIG_S_REGION=${AWS_DEFAULT_REGION:-us-east-1}
      rclone copy "s:$S3_BUCKET/fresh-a" '"$SCALE1_IMAGE"' --include image.json --include transfer.json
      unset RCLONE_CONFIG_S_ACCESS_KEY_ID RCLONE_CONFIG_S_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
      [[ $(sha256sum '"$SCALE1_IMAGE"'/image.json | cut -d" " -f1) == '"$SCALE1_IMAGE_SHA256"' ]]
      [[ $(sha256sum '"$SCALE1_IMAGE"'/transfer.json | cut -d" " -f1) == '"$SCALE1_TRANSFER_SHA256"' ]]
      [[ $(sha256sum '"$AGE_HANDOFF_JSON"' | cut -d" " -f1) == '"$AGE_HANDOFF_SHA256"' ]]
      [[ -f '"$AGE_DATOMIC_HOME"'/datomic-transactor-pro-1.0.7745.jar ]]
      echo "[srv2] staged: build, cluster, handoff, SCALE1 metadata, Datomic home"
    '
    if [[ $MACHINE == A ]]; then  # the card's dry run to its first offer, on its own copy (A0)
      server_env
      EXTRA="$product_opts $(read_opts)" DX_DRY_RUN_FIRST_OFFER=1 card_parts "$OUT_ROOT/stage/card-dry" "1" 1B production-S-noburst server-32 300 tuned \
        | tee "$OUT_ROOT/stage/card-dry.log"
      grep -q "DX-DRY-RUN first offer reached" "$OUT_ROOT/stage/card-dry.log"
    fi
  fi;;
a1)  # the flat-goodput check: three off ladders at the old pin, one copy each
  if ((dry)); then run_step variants=control,off-permits4,cut-only -- dry_gate read-cost lab/experiments/EXP-DX1/srv2/read-cost.sh
  else server_env; run_step variants=control,off-permits4,cut-only -- bash -c "$(declare -f make_copy remove_copy pinned_variant); set -e
      for v in control off-permits4 cut-only; do pinned_variant \$v; done"; fi;;
a2)  # uncached reads, RD5 command 1: pf3, pf3r, pf3c
  if ((dry)); then run_step configs=pf3,pf3r,pf3c -- dry_gate rd5 lab/experiments/EXP-DX1/rd5/gate.sh
  else server_env; run_step configs=pf3,pf3r,pf3c -- bash -c "$(declare -f make_copy remove_copy rd5_arm rd5_config); set -e
      rd5_config pf3 3 0 3072 20; rd5_config pf3r 3 1 3072 20; rd5_config pf3c 3 0 1536 20"; fi;;
a2b)  # the card's read configuration: 12 permits, prefetch, A2's read-ahead choice
  if ((dry)); then run_step permits=12 "readAheadOff=${READ_AHEAD_OFF:-0}" -- dry_gate rd5-p12 lab/experiments/EXP-DX1/rd5/gate.sh
  else server_env; run_step permits=12 "readAheadOff=${READ_AHEAD_OFF:-0}" -- bash -c "$(declare -f make_copy remove_copy rd5_arm rd5_config); set -e
      rd5_config pf12 12 ${READ_AHEAD_OFF:-0} 3072 22"; fi;;
a9)  # two readers (RD5 command 2): machine B runs the second reader, machine A the stack and odd seats to B
  if ((dry)); then run_step -- bash -c "set -e; $(declare -f plan_dry); COMMIT=$COMMIT repo=$repo; plan_dry lab/experiments/EXP-DX1/rd5/second-reader.sh lab/experiments/EXP-DX1/v01/study-server.sh
      echo '[srv2] A9 not possible on the Mac: the cross-machine reader path has never run anywhere (accepted risk, plan E.2 item 6)'"
  elif [[ $MACHINE == B ]]; then  # --action start0 (two-pf), switch (after A ended two-pf), stop (after A ended two-pfr)
    need SECOND_READER_LISTEN MACHINE1_PRIVATE BUILD
    second() { RD5_MACHINE1=$MACHINE1_PRIVATE RD5_LISTEN=$SECOND_READER_LISTEN RD5_IMAGE=$SCALE1_IMAGE RD5_REPO=$BUILD/repository \
      RD5_CPUS=0-2 RD5_PERMITS=3 RD5_PREFETCH=1 "RD5_READ_AHEAD_OFF=$1" RD5_HEAP_MIB=6144 RD5_CACHE_MIB=3072 RD5_MEMORY_MIB=9216 \
      "RD5_OUT=$OUT_ROOT/a9/second-$1" bash lab/experiments/EXP-DX1/rd5/second-reader.sh "$2"; }
    cd "$BUILD/repository"; EVID=$OUT_ROOT/a9/second-${action:?give --action start0, switch or stop}
    case $action in
      start0) run_step role=second-reader readAheadOff=0 -- second 0 start;;
      switch) second 0 stop; run_step role=second-reader readAheadOff=1 -- second 1 start;;
      stop) second 1 stop;;
      *) echo "session.sh a9: --action start0, switch or stop" >&2; exit 2;;
    esac
  else
    need DX_REMOTE_READER_HOST SECOND_READER_URL; server_env; export DX_RD5_SECOND_READER=$SECOND_READER_URL
    run_step role=first-reader -- bash -c "$(declare -f make_copy remove_copy rd5_arm rd5_config); set -e
      rd5_config two-pf 3 0 3072 25; rd5_config two-pfr 3 1 3072 30"
  fi;;
a4)  # the full card on the merged head: tuned reader, 12 permits, product save path, read options, classification
  if ((dry)); then run_step "EXTRA=$product_opts $(read_opts)" -- dry_card a4 $product_opts $(read_opts)
  else server_env; run_step "EXTRA=$product_opts $(read_opts)" -- bash -c "$(declare -f make_copy remove_copy part card_parts need); set -e
      EXTRA='$product_opts $(read_opts)' card_parts '$OUT_ROOT/a4/card' '1 2 3' 1B production-S-noburst server-32 300 tuned
      env PATH=$BUILD/tools/bin:\$PATH $BUILD/tools/bin/node lab/bin/scorecard.mjs --assemble --commit $COMMIT --out '$OUT_ROOT/a4/card'"; fi;;
b1)  # bring-up 1: journal probe, ID lists, sweep arms A and B (B writes, last), shapes arm C
  if ((dry)); then run_step -- dry_gate xq6 lab/experiments/EXP-DX1/xq6/gate.sh "$repo" dryrun.ts
  else server_env; run_step -- bash -c "set -e; $(declare -f demo_up demo_down need)
      demo_up DX_ID_LISTS=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6 DX_SWEEP_QUEUE_MS=5000
      ready=$DEMO_ROOT/ready.json; db=\$(node -p 'require(process.argv[1]).db' \$ready)
      ns=\$(node -p 'require(process.argv[1]).accounts?.[\"account-003\"]?.namespace ?? \"\"' \$ready)
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/jrn1/probe.ts http://127.0.0.1:18495 \$db 28309866 \
        \"\${ns}i9:00050000\" \"\${ns}i9:00000000\" --attribute :task/field-0 --far 87002 --entity-pages 200 --feed-pages 5 > $OUT_ROOT/b1/jrn1-probe-1b.jsonl
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq3/server.ts \$ready $OUT_ROOT/b1/xq3-1b account-003
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq6/server.ts \$ready $OUT_ROOT/b1/xq6-1b account-003
      demo_down"; fi;;
b2)  # bring-up 2: the question reader against sweeps on the main reader
  if ((dry)); then run_step -- dry_gate xq7 lab/experiments/EXP-DX1/xq7/gate.sh "$repo" dryrun.ts
  else server_env; secret=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
    run_step -- bash -c "set -e; $(declare -f demo_up demo_down need)
      demo_up DEMO_QUESTION_READER=1 DX_QUESTION_MAIN_REFUSES=0 DX_READ_IO_COUNTERS=1 DX_SWEEP=1 DX_ID_LISTS=1 DX_SWEEP_PERMITS=3 \
        DX_SWEEP_PER_ACCOUNT=3 DX_SWEEP_QUEUE_MS=5000 DX_SWEEP_CURSOR_SECRET=$secret DX_QUESTION_SWEEP_PERMITS=2 DX_QUESTION_SWEEP_PER_ACCOUNT=3 \
        DX_QUESTION_SWEEP_QUEUE_MS=5000 DX_QUESTION_INDEX_QUERY_PERMITS=1 DX_QUESTION_ID_LIST_QUEUE_MS=1000
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq7/server.ts $DEMO_ROOT/ready.json $OUT_ROOT/b2/xq7-1b
      demo_down"; fi;;
b3)  # API-call reads: today, batch1, floor; re-read and random; 64 and 256 callers; list page at 8
  if ((dry)); then run_step -- dry_gate api1 lab/experiments/EXP-DX1/api1/gate.sh server
  else server_env; run_step -- bash -c "set -e; $(declare -f demo_up demo_down need)
      demo_up DEMO_READER=tuned DX_READ_BATCH=1 DX_ID_LISTS=1 DX_INDEX_QUERY_PERMITS=4
      env PATH=$BUILD/tools/bin:\$PATH API1_WINDOW_SECONDS=60 API1_CALLERS=64,256 API1_LIST_CALLERS=8 API1_ARMS=today,batch1,floor \
        API1_SETS=reread,random API1_SAVES_PER_SECOND=23 API1_ALONE_CALLS=20 \
        $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/api1/server.ts $DEMO_ROOT/ready.json $OUT_ROOT/b3/api1-1b
      demo_down"; fi;;
b4)  # the commit-time index: backfill of a copy of the 1 billion database, 10,000 sampled subjects checked
  if ((dry)); then run_step -- dry_gate aged-index lab/experiments/EXP-DX1/real2/aged-gate.sh
  else server_env; run_step declaration=deep-6 -- bash -c "set -e
      cp -a --reflink=auto '$AGED_PGDATA_SOURCE' '$SCRATCH/backfilled'
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq1/server.ts backfill \
        --commit $COMMIT --declaration lab/experiments/EXP-DX1/xq1/declarations/deep-6.json \
        --aged-bundle $AGE_HANDOFF_JSON --aged-bundle-sha256 $AGE_HANDOFF_SHA256 \
        --pgdata-source $AGED_PGDATA_SOURCE --pgdata $SCRATCH/backfilled --out $OUT_ROOT/b4/backfill --verify-samples 1000"; fi;;
b5)  # the index save pair: card parts 1 and 2, index off and on, on copies of the backfilled database, product save path
  if ((dry)); then run_step -- plan_dry lab/bin/scorecard.mjs lab/experiments/EXP-DX1/xq1/server.ts lab/experiments/EXP-DX1/xq1/declarations/deep-6.json
  else server_env; run_step "EXTRA=$product_opts" -- bash -c "$(declare -f make_copy remove_copy part card_parts need); set -e
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq1/server.ts verify --commit $COMMIT \
        --declaration lab/experiments/EXP-DX1/xq1/declarations/deep-6.json --aged-bundle $AGE_HANDOFF_JSON --aged-bundle-sha256 $AGE_HANDOFF_SHA256 \
        --pgdata-source $SCRATCH/backfilled --pgdata $SCRATCH/verify-copy --out $OUT_ROOT/b5/verify; rm -rf --one-file-system $SCRATCH/verify-copy
      for x in off on; do c=; [[ \$x == on ]] && c=lab/experiments/EXP-DX1/xq1/declarations/deep-6.json
        PART_SOURCE=$SCRATCH/backfilled CROSS=\${c:-off} EXTRA='$product_opts' card_parts $OUT_ROOT/b5/pair-\$x '1 2' 1B production-S-noburst server-32 300 tuned; done"; fi;;
b6)  # the agreement gate at 1 billion: bring-up 3 on the backfilled copy, index against the exact sweep, account-003
  if ((dry)); then run_step -- plan_dry lab/experiments/EXP-DX1/xq10/server.ts demo/server-up.sh
  else server_env; run_step -- bash -c "set -e; $(declare -f demo_up demo_down need)
      DEMO_ORIGINAL_OVERRIDE=$SCRATCH/backfilled demo_up DX_CROSS_INDEX=1 DX_SWEEP=1 DX_SWEEP_SHAPES=all DX_SWEEP_PERMITS=6 DX_SWEEP_PER_ACCOUNT=6 DX_ID_LISTS=1
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq10/server.ts $DEMO_ROOT/ready.json $OUT_ROOT/b6/xq10-1b account-003
      demo_down"; fi;;
b7)  # the index question bench
  if ((dry)); then run_step -- plan_dry lab/experiments/EXP-DX1/xq1/server.ts
  else server_env; run_step -- bash -c "set -e
      $BUILD/tools/bin/node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq1/server.ts bench \
        --commit $COMMIT --aged-bundle $AGE_HANDOFF_JSON --aged-bundle-sha256 $AGE_HANDOFF_SHA256 \
        --pgdata-source $SCRATCH/backfilled --pgdata $SCRATCH/bench-copy --reader tuned \
        --questions q1,q2,q3,q4,q5 --accounts 3,4 --pins head,epoch --valid now,minus30d --cold-and-warm --quiet-account 7 --out $OUT_ROOT/b7/bench"; fi;;
a5)  # Publish at 100,000 subjects on the aged database: ACT3's twelve windows, the probe reading at least each receipt
  if ((dry)); then run_step -- bash -c "set -e; mkdir -p '$EVID/phases'
      printf 'DX_ACT3_SETTLE=0\nDX_ACT3_AT_LEAST=1\n' > '$EVID/phases/a5.env'
      cd '$repo'; node lab/bin/heavy.mjs --label DX-SRV2-dry-a5 -- bash lab/experiments/EXP-DX1/actv-lazy/act7/miniature.sh '$EVID/miniature' a5"
  else server_env; run_step -- bash -c "set -e; $(declare -f act7_prepare act7_discard held)
      TEMPLATE=$AGED_PGDATA_SOURCE; act7_prepare \$TEMPLATE; export TEMPLATE DX_LAZY_OUT=$OUT_ROOT/a5/publish-1b
      held DX_ACT7_AGED_BUNDLE=$AGE_HANDOFF_JSON DX_ACT7_AGED_PIN=$AGE_HANDOFF_SHA256 DX_HELD_PROFILE=server-32 DX_ACT3_SETTLE=0 DX_ACT3_AT_LEAST=1 DX_HELD_MINUTES=120
      act7_discard"; fi;;
a6)  # optional: settlement beside saves, three accounts at 1 billion (ACT7 (b))
  if ((dry)); then run_step -- plan_dry lab/experiments/EXP-DX1/actv-lazy/act7/miniature.sh lab/experiments/EXP-DX1/actv-lazy/join/held-server.sh
  else server_env; run_step -- bash -c "set -e; $(declare -f act7_prepare act7_discard held)
      echo 'A6: run actv-lazy/act7/RUN2.md section 6.4 exactly as written, with DX_ACT7_CONTROL=2:2400:300:200:600, using held() of this script'; exit 3"; fi;;
a7)  # optional: tape M with the creation option (S4's arm F)
  if ((dry)); then TOY_TAPE=production-M run_step "EXTRA=$product_opts DX_S3_OWNERS=1 DX_S4_CREATE=1" -- dry_card a7 $product_opts DX_S3_OWNERS=1 DX_S4_CREATE=1
  else server_env; run_step "EXTRA=$product_opts DX_S3_OWNERS=1 DX_S4_CREATE=1" -- bash -c "$(declare -f make_copy remove_copy part card_parts need); set -e
      EXTRA='$product_opts DX_S3_OWNERS=1 DX_S4_CREATE=1' card_parts $OUT_ROOT/a7/card-m '1 2' 1B production-M server-32 300 tuned"; fi;;
a8)  # optional: the 1,024-seat step with the waiting-read bound off and at 128, tuned reader, 90 s cells
  if ((dry)); then run_step -- plan_dry lab/experiments/EXP-DX1/w3/threads-sampler.sh
  else server_env; run_step -- bash -c "$(declare -f make_copy remove_copy part card_parts need); set -e
      for a in off on; do limit=; [[ \$a == on ]] && limit=DX_READ_WAIT_LIMIT=128
        bash lab/experiments/EXP-DX1/w3/threads-sampler.sh $OUT_ROOT/a8/rq-\$a-threads.jsonl & sampler=\$!
        EXTRA=\"DX_THREAD_COUNTERS=1 $(read_opts) \$limit\" card_parts $OUT_ROOT/a8/rq-\$a '1 2' 1B production-S-noburst server-32 90 tuned
        wait \$sampler; done"; fi;;
b8)  # optional: the card on the fresh database (430 million records), as A4
  if ((dry)); then run_step -- plan_dry lab/bin/scorecard.mjs
  else server_env; need FRESH_PGDATA_SOURCE; run_step "EXTRA=$product_opts $(read_opts)" -- bash -c "$(declare -f make_copy remove_copy part card_parts need); set -e
      PART_SOURCE=$FRESH_PGDATA_SOURCE EXTRA='$product_opts $(read_opts)' card_parts $OUT_ROOT/b8/card '1 2 3' fresh production-S-noburst server-32 300 tuned
      env PATH=$BUILD/tools/bin:\$PATH $BUILD/tools/bin/node lab/bin/scorecard.mjs --assemble --commit $COMMIT --out $OUT_ROOT/b8/card"; fi;;
finish)  # A10 / B10: evidence archives with checksums for the copy to the Mac, then hand the delete to the driver
  run_step -- bash -c "set -e
    out=$(root "$OUT_ROOT"); cd \"\$out\"
    rm -f srv2-$MACHINE-evidence.tar.gz SHA256SUMS
    tar --exclude='*.tar.gz' -czf srv2-$MACHINE-evidence.tar.gz \$(ls -A | grep -v '^srv2-')
    (command -v sha256sum >/dev/null && sha256sum srv2-$MACHINE-evidence.tar.gz || shasum -a 256 srv2-$MACHINE-evidence.tar.gz) > SHA256SUMS
    node -e 'const fs=require(\"fs\"); fs.writeFileSync(\"deletion-ready.json\", JSON.stringify({ machine: process.argv[1], at: new Date().toISOString(),
      archive: \"srv2-\" + process.argv[1] + \"-evidence.tar.gz\", sha256: fs.readFileSync(\"SHA256SUMS\",\"utf8\").split(\" \")[0],
      next: [\"copy the archive and SHA256SUMS to the Mac and check the digest there\", \"delete this machine through the provider (the driver; no script can)\",
             \"confirm the provider answers 404 for it\", \"write its ledger row\"] }, null, 2) + \"\\n\")' $MACHINE
    cat SHA256SUMS; echo '[srv2] deletion-ready.json written; this script cannot delete the machine: the driver deletes it and confirms 404'"
  ;;
*) echo "session.sh: unknown step $step" >&2; exit 2;;
esac
