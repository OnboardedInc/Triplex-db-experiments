#!/usr/bin/env bash
set -euo pipefail

# [DX-PREP1] Why: the bench owner alone executes this sequence on its assigned physical host.
# Rejected: falling back to the Mac, reusing an active stack, or timing restore as a save.
[[ $(uname -s) == Linux && ${DX_BARE_METAL:-0} == 1 && $(id -u) == 0 ]]
[[ $(systemd-detect-virt || true) == none ]]
export DOCKER_HOST=unix:///var/run/docker.sock
repo=$(git rev-parse --show-toplevel)
cd "$repo"
here=lab/experiments/EXP-DX1/prep1
stack=lab/experiments/EXP-DX1/stack
mode=${1:?expected run or arm}
out=${2:?provide an absolute new output directory}
source=${3:?provide the pinned Git commit}
[[ "$out" == /* && "$source" =~ ^[a-f0-9]{40}$ && $(git rev-parse HEAD) == "$source" && -z $(git status --porcelain) ]]
seed="$out/seed.json"
dump="$out/seed.pgdump"
prefix_file="$out/prefix"
export DX_STACK_EVIDENCE="$out/engines" DX_BARE_METAL_ROOT="$out" DX_STACK_WAIT_FOR_TRANSACTOR=1
export DX_PREP1_SERVER=1 DX_W1_EXTRA=1 DX_INT1_NATIVE_WRITE_READBACK=1 DX_PREDECESSOR_LOOKUP=1
export DX_GROUP_QUEUE_CLOCK=1 DX_GROUP_REUSE_PREPARED=1 DX_GROUP_MAX_MEMBERS=8 DX_W1_FAST_REPLY=1
export DX_SMALL_ROWS=0 DX_W1_LEDGER=0 DX_W1_PACKED_JOURNAL=0 DX_FIELD_COALESCE=0 DX_COMMIT_HINTS=false
export DX_NATIVE_SETTINGS_READBACK=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off
unset DX_WRITE_BUDGET_US
export DX_GW_WRITE_ENTITY_CACHE_BYTES=268435456 DX_GW_READ_ENTITY_CACHE_BYTES=268435456
producer=(node --import tsx "$here/server-produce.ts")
up_args=(--port-write 8491 --port-read 8495 --cpus-tx "${DX_PREP1_TX_CPUS:-0}" --cpus-pg "${DX_PREP1_PG_CPUS:-1}"
  --cpus-gw-write "${DX_PREP1_WRITE_CPUS:-2-5}" --cpus-gw-read "${DX_PREP1_READ_CPUS:-6}"
  --pg-memory 8g --tx-memory 10g --tx-java-opts '-Xms1g -Xmx6g -XX:+UseG1GC -XX:MaxGCPauseMillis=50'
  --object-cache-max 2g --memory-index-threshold 256m --memory-index-max 1g
  --pg-settings '-c shared_buffers=2GB -c track_wal_io_timing=on')
nonce() { cat /proc/sys/kernel/random/uuid; }
clean() {
  if [[ -n ${owned:-} ]]; then
    bash "$stack/down.sh" "$owned" --volumes
  fi
}
on_exit() { ret=$?; trap - EXIT; clean; exit "$ret"; }
trap on_exit EXIT
trap 'exit 143' TERM INT
if [[ $mode == run ]]; then
  [[ $# == 3 && -z $(docker ps -q) ]]
  mkdir "$out"
  tag=$(nonce); tag=${tag%%-*}
  printf '%s\n' "$tag" > "$prefix_file"
  mkdir "$DX_STACK_EVIDENCE"
  "${producer[@]}" plan > "$out/plan.json"
  # A preseed stage is outside timed arms and leaves only a portable, checksummed PostgreSQL seal.
  owned="tx2-dxprep1-$tag-seed"
  export DX_PREP1_WRITERS=1 DX_PREP1_SUBJECT=0 DX_GROUP_COMMIT=0 DX_LIVE_PRIORITY=0
  unset DX_PREP1_DUMP
  export DX_WRITE_OPTIONS_ATTEMPT=$(nonce)
  export DX_GW_WRITE_JAVA_OPTS='-Xms512m -Xmx4g -XX:+UseG1GC'
  export DX_GW_READ_JAVA_OPTS='-Xms256m -Xmx3g -XX:+UseG1GC'
  export DX_GW_WRITE_MEMORY=6g DX_GW_READ_MEMORY=5g
  bash "$stack/up.sh" "$owned" "${up_args[@]}" > "$out/seed-start.log" 2>&1
  "${producer[@]}" seed http://127.0.0.1:8495 "$seed" "$tag"
  docker exec "$owned-pg" pg_dump -U postgres -Fc -Z1 -d datomic > "$dump"
  [[ $(head -c 5 "$dump") == PGDMP ]]
  (cd "$out"; sha256sum seed.json seed.pgdump plan.json > SEAL.sha256)
  chmod a-w "$seed" "$dump" "$out/plan.json" "$out/SEAL.sha256"
  docker stop -t 30 "$owned-tx" >/dev/null
  clean
  unset owned
  for n in 1 2 4; do
    for entry in 0-K 1-S 2-S 3-K; do
      cell="$n-$entry"
      # [DX-PREP1] Why: abort and preserve a slow arm, including startup, feed verification and cleanup.
      # Rejected: silently extending a stalled 24-cell comparison past the arm budget.
      if ! timeout -k 20s 1740s bash "$here/server.sh" arm "$out" "$source" "$cell"; then
        owned="tx2-dxprep1-$tag-${cell,,}"
        exit 1
      fi
    done
  done
elif [[ $mode == arm ]]; then
  cell=${4:?arm}
  [[ $# == 4 && $cell =~ ^(1|2|4)-(0-K|1-S|2-S|3-K)$ ]]
  tag=$(cat "$prefix_file")
  [[ $tag =~ ^[0-9a-f]{8}$ && -z $(docker ps -q) ]]
  (cd "$out"; sha256sum -c SEAL.sha256 > /dev/null)
  export DX_PREP1_DUMP="$dump" DX_PREP1_DUMP_SHA=$(awk '$2=="seed.pgdump" {print $1}' "$out/SEAL.sha256")
  export DX_PREP1_WRITERS=${cell%%-*}
  export DX_PREP1_SUBJECT=0 DX_GROUP_COMMIT=1 DX_LIVE_PRIORITY=1
  if [[ $cell == *-S ]]; then export DX_PREP1_SUBJECT=1 DX_GROUP_COMMIT=0 DX_LIVE_PRIORITY=0; fi
  export DX_WRITE_OPTIONS_ATTEMPT=$(nonce)
  # Hold total configured writer heap and the writer CPU mask fixed across peer counts.
  export DX_GW_WRITE_JAVA_OPTS="-Xms$((512/DX_PREP1_WRITERS))m -Xmx$((4096/DX_PREP1_WRITERS))m -XX:+UseG1GC"
  export DX_GW_WRITE_MEMORY="$((6144/DX_PREP1_WRITERS))m"
  export DX_GW_READ_JAVA_OPTS='-Xms256m -Xmx3g -XX:+UseG1GC' DX_GW_READ_MEMORY=5g
  owned="tx2-dxprep1-$tag-${cell,,}"
  dir="$out/$cell"
  mkdir "$dir"
  cat /proc/sys/kernel/random/boot_id > "$dir/boot-id"
  bash "$stack/up.sh" "$owned" "${up_args[@]}" > "$dir/start.log" 2>&1
  urls=()
  for ((i=0;i<DX_PREP1_WRITERS;i++)); do urls+=("http://127.0.0.1:$((8491+i))"); done
  trace="$DX_STACK_EVIDENCE/$owned/trace/raw"
  # [DX-PREP1] Why: retain effective JVM flags and pause logs for the transactor, read peer and every write peer.
  # Rejected: inferring role settings from requested flags or aggregating all writers into a single pause file.
  [[ -s "$trace/prep1-gc-tx.log" && -s "$trace/prep1-gc-gw-r.log" ]]
  for ((i=1;i<=DX_PREP1_WRITERS;i++)); do
    role=w; if ((i>1)); then role=w$i; fi
    [[ -s "$trace/prep1-gc-gw-$role.log" ]]
  done
  "${producer[@]}" arm "$cell" "$seed" "$dir" "$owned" "$source" "$DX_WRITE_OPTIONS_ATTEMPT" \
    "$DX_STACK_EVIDENCE/$owned/stack.json" http://127.0.0.1:8495 "${urls[@]}"
  docker stop -t 30 "$owned-tx" >/dev/null
  python3 "$here/server-collect.py" "$out/plan.json" "$dir" "$trace/prep1-native.ndjson" > "$dir/summary.json"
  clean
  unset owned
else exit 2
fi
