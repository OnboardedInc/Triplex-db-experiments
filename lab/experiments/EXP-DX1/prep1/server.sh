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
mode=${1:?expected run, storage, storage-ordered, ceiling, tail, owner, fair or arm}
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
tx_memory=10g tx_cache=2g
tx_java='-Xms1g -Xmx6g -XX:+UseG1GC -XX:MaxGCPauseMillis=50'
pg_settings='-c shared_buffers=2GB -c track_wal_io_timing=on'
if [[ $mode == arm && ${DX_PREP1_CAMPAIGN:-comparison} =~ ^(storage(-ordered)?|ceiling|tail)$ ]]; then
  # [DX-PREP1] Why: reserve the same JVM and container budget for every cache comparison.
  # Rejected: changing the heap or CPU as well as the object cache between the two S arms.
  tx_memory=30g
  if [[ ${4:-} == 1-cache-S ]]; then tx_cache=16g; fi
  tx_java="-Xms1g -Xmx24g -XX:+UseG1GC -XX:MaxGCPauseMillis=50 -Ddatomic.objectCacheMax=$tx_cache -Ddatomic.prefetchProbes=true"
fi
if [[ ${DX_PREP1_CAMPAIGN:-} == tail && $mode == arm ]]; then
  pg_settings+=' -c fsync=on -c synchronous_commit=on -c full_page_writes=on -c wal_sync_method=fdatasync -c checkpoint_timeout=5min -c checkpoint_completion_target=0.9 -c checkpoint_flush_after=256kB -c min_wal_size=80MB -c max_wal_size=1GB -c log_checkpoints=on -c log_timezone=UTC'
  if [[ ${4:-} == 1-tail-zgc-S ]]; then
    collector=$(node --input-type=module -e 'import {collectorOptions} from "./lab/experiments/EXP-DX1/jvm1/launch.mjs"; console.log(collectorOptions("25", "ZGC", "tx", 1).join(" "))')
    tx_java="-Xms1g -Xmx24g $collector -Ddatomic.objectCacheMax=$tx_cache -Ddatomic.prefetchProbes=true"
    export DX_PREP1_TAIL_TX_ZGC=1
  fi
fi
up_args=(--port-write 8491 --port-read 8495 --cpus-tx "${DX_PREP1_TX_CPUS:-0}" --cpus-pg "${DX_PREP1_PG_CPUS:-1}"
  --cpus-gw-write "${DX_PREP1_WRITE_CPUS:-2-5}" --cpus-gw-read "${DX_PREP1_READ_CPUS:-6}"
  --pg-memory 8g --tx-memory "$tx_memory" --tx-java-opts "$tx_java"
  --object-cache-max "$tx_cache" --memory-index-threshold 256m --memory-index-max 1g
  --pg-settings "$pg_settings")
nonce() { cat /proc/sys/kernel/random/uuid; }
clean() {
  if [[ -n ${owned:-} ]]; then
    bash "$stack/down.sh" "$owned" --volumes || return 1
    if [[ ${DX_PREP1_CAMPAIGN:-comparison} != comparison ]]; then
      # [DX-PREP1] Why: only publish an arm after this fresh stack's resources are gone.
      # Rejected: treating a best-effort teardown as confirmed cleanup.
      local remaining
      remaining=$(docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' &&
        docker volume ls --format '{{.Name}}')
      [[ ! $remaining =~ (^|$'\n')"$owned-" ]]
    fi
  fi
}
stop_observer() {
  if [[ -n ${observer_pid:-} ]]; then
    kill -TERM "$observer_pid" 2>/dev/null || true
    local status=0
    wait "$observer_pid" || status=$?
    unset observer_pid
    return "$status"
  fi
}
unmount_wal() {
  if [[ -n ${mounted_wal:-} ]]; then
    [[ $(findmnt -nro SOURCE --mountpoint "$mounted_wal") == /dev/nvme1n1 ]] || return 1
    if [[ ${wal_created:-0} == 1 ]]; then
      [[ ${wal_owner:-} =~ ^tx2-dxprep1-[a-f0-9]{8}-1-tail-wal-s$ && ! -L $mounted_wal/$wal_owner ]] || return 1
      rm -rf --one-file-system -- "$mounted_wal/$wal_owner" || return 1
    fi
    umount "$mounted_wal" || return 1
    unset mounted_wal DX_PREP1_TAIL_WAL_MOUNT wal_created
  fi
}
on_exit() {
  ret=$?
  trap - EXIT
  stop_observer || ret=1
  # Keep the WAL mounted if the owned stack could not be removed.
  if clean; then unmount_wal || ret=1; else ret=1; fi
  exit "$ret"
}
trap on_exit EXIT
trap 'exit 143' TERM INT
if [[ $mode == ceiling ]]; then
  [[ $# == 6 ]]
  exec timeout --kill-after=40s 3560s bash "$here/server.sh" ceiling-timed "$out" "$source" "$4" "$5" "$6"
elif [[ $mode == ceiling-timed ]]; then
  [[ $# == 6 && $4 == /* && ! -e $out && -z $(docker ps -q) ]]
  parent=$(realpath -e "$4")
  [[ -f $parent/seed.pgdump && $(head -c 5 "$parent/seed.pgdump") == PGDMP ]]
  mkdir "$out" "$DX_STACK_EVIDENCE"
  export DX_PREP1_CAMPAIGN=ceiling DX_PREP1_FAIR_CREDITS=0
  "${producer[@]}" adopt-scale "$parent" "$5" "$6" > "$seed"
  ln -s "$parent/seed.pgdump" "$dump"
  "${producer[@]}" plan > "$out/plan.json"
  dump_pin=$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1])).dumpSha256' "$seed")
  [[ $dump_pin =~ ^[a-f0-9]{64}$ ]]
  (cd "$out"; sha256sum seed.json; printf '%s  seed.pgdump\n' "$dump_pin"; sha256sum plan.json) > "$out/SEAL.sha256"
  tag=$(nonce); tag=${tag%%-*}
  printf '%s\n' "$tag" > "$prefix_file"
  printf '%s\n' "$source" > "$out/source"
  chmod a-w "$out"/{SEAL.sha256,source,seed.json,plan.json,prefix}
  # [DX-PREP1] Why: restore the full seed once and use disjoint cohorts in one time-bounded run.
  # Rejected: counting two unbounded restores against the one-hour experiment.
  owned="tx2-dxprep1-$tag-1-ceiling-s"
  bash "$here/server.sh" arm "$out" "$source" 1-ceiling-S
  unset owned
elif [[ $mode == fair || $mode == owner || $mode == storage || $mode == storage-ordered || $mode == tail ]]; then
  [[ $# == 4 ]]
  # [DX-PREP1] Why: cap time from seed verification through the last cleanup.
  # Rejected: four independent timeouts that let restore and teardown exceed the hour.
  total=3520
  if [[ $mode == storage ]]; then total=7000; fi
  if [[ $mode == storage-ordered ]]; then total=1050; fi
  if [[ $mode == tail ]]; then total=4460; fi
  exec timeout --kill-after=40s "${total}s" bash "$here/server.sh" "$mode-timed" "$out" "$source" "$4"
elif [[ $mode == fair-timed || $mode == owner-timed || $mode == storage-timed || $mode == storage-ordered-timed || $mode == tail-timed ]]; then
  [[ $# == 4 && $4 == /* && ! -e $out && -z $(docker ps -q) ]]
  parent=$(realpath -e "$4")
  if [[ $mode == tail-timed ]]; then
    command -v bpftrace >/dev/null
    taskset -c 7 true
    [[ -f /sys/fs/cgroup/cgroup.controllers && -b /dev/nvme1n1 && $(lsblk -nr -o TYPE /dev/nvme1n1) == disk ]]
    [[ $(findmnt -nro SOURCE /) == /dev/nvme0n1p2 && -z $(findmnt -rn -S /dev/nvme1n1) && -z $(ls -A /sys/class/block/nvme1n1/holders) ]]
    [[ $(blkid -p -s TYPE -o value /dev/nvme1n1) == ext4 ]] || { echo 'Prepare and reserve the second NVMe filesystem before launch' >&2; exit 2; }
    unset DX_PREP1_TAIL_WAL_MOUNT DX_PREP1_TAIL_TX_ZGC DX_BM1_WAL_MOUNT DX_BM1_WAL_AB DX_JAVA DX_DATOMIC_IMAGE_RECEIPT DX_JVM1_PG_RESTORE
    export DX_PREP1_TX_CPUS=0 DX_PREP1_PG_CPUS=1 DX_PREP1_WRITE_CPUS=2-5 DX_PREP1_READ_CPUS=6
    export DX_INT1_GATEWAYS=original
    java25=$(DX_JAVA=25 DX_DATOMIC_IMAGE_RECEIPT="${DX_PREP1_JAVA25_RECEIPT:-}" node lab/config/datomic/runtime.mjs image)
    docker image inspect "$java25" >/dev/null
  fi
  [[ -d $parent && -f $parent/SEAL.sha256 && $(head -c 5 "$parent/seed.pgdump") == PGDMP ]]
  python3 - "$parent/SEAL.sha256" <<'PY'
import re
import sys
from pathlib import Path
lines = Path(sys.argv[1]).read_text().splitlines()
assert len(lines) == 3
assert all(re.fullmatch(r"[a-f0-9]{64}  " + re.escape(name), line)
           for line, name in zip(lines, ("seed.json", "seed.pgdump", "plan.json"), strict=True))
PY
  (cd "$parent"; sha256sum --strict -c SEAL.sha256)
  mkdir "$out" "$DX_STACK_EVIDENCE"
  tag=$(nonce); tag=${tag%%-*}
  printf '%s\n' "$tag" > "$prefix_file"
  printf '%s\n' "$source" > "$out/source"
  export DX_PREP1_CAMPAIGN=${mode%-timed} DX_PREP1_FAIR_CREDITS=0
  # [DX-PREP1] Why: restore the exact earlier sealed bytes into each fresh stack without duplicating its dump.
  # Rejected: fresh seed generation or carrying an edited database from one policy into the other.
  cp "$parent/SEAL.sha256" "$out/comparison.SEAL.sha256"
  ln -s "$parent/seed.json" "$seed"
  ln -s "$parent/seed.pgdump" "$dump"
  "${producer[@]}" plan > "$out/plan.json"
  (cd "$out"; head -n 2 comparison.SEAL.sha256; sha256sum plan.json) > "$out/SEAL.sha256"
  chmod a-w "$out"/{comparison.SEAL.sha256,SEAL.sha256,source,plan.json,prefix}
  cells=(1-off-S 1-on-S 2-on-S 2-off-S)
  arm_limit=830
  if [[ $mode == owner-timed ]]; then cells=(1-group-K 1-old-S 1-fixed-S); fi
  if [[ $mode == storage-timed ]]; then
    cells=(1-group-K 1-old-S 1-fixed-S 1-prefetch-S 1-cache-S 1-ordered-S)
    arm_limit=950
  elif [[ $mode == storage-ordered-timed ]]; then
    # [DX-PREP1] Why: append only the new arm after the earlier pin has started its controls.
    # Rejected: repeating five completed controls or drawing a different seed for the new arm.
    cells=(1-ordered-S)
    arm_limit=950
  elif [[ $mode == tail-timed ]]; then
    cells=(1-tail-control-S 1-tail-wal-S 1-tail-zgc-S 1-tail-fair-S)
    arm_limit=1070
  fi
  for cell in "${cells[@]}"; do
    owned="tx2-dxprep1-$tag-${cell,,}"
    if [[ $cell == 1-tail-wal-S ]]; then
      # [DX-PREP1] Why: use only the reserved second NVMe for this arm's fresh WAL files.
      # Rejected: formatting a device, mounting it during controls, or falling back to root transparently.
      wal_owner=$owned
      mkdir "$out/wal-mount"
      mounted_wal=$out/wal-mount
      mount -t ext4 -o rw,relatime,errors=remount-ro /dev/nvme1n1 "$mounted_wal"
      export DX_PREP1_TAIL_WAL_MOUNT=$mounted_wal
      mkdir -m 0700 "$mounted_wal/$wal_owner"
      wal_created=1
      findmnt --json --mountpoint "$mounted_wal" -o SOURCE,TARGET,FSTYPE > "$out/wal-mount.json"
    fi
    timeout --foreground --kill-after=20s "${arm_limit}s" bash "$here/server.sh" arm "$out" "$source" "$cell"
    unset owned
    unmount_wal
    if [[ $mode == tail-timed ]]; then
      mv "$out/$cell/summary.tmp" "$out/$cell/summary.json"
      mv "$out/$cell/tail-summary.tmp" "$out/$cell/tail-summary.json"
    fi
  done
elif [[ $mode == run ]]; then
  [[ $# == 3 && -z $(docker ps -q) ]]
  export DX_PREP1_CAMPAIGN=comparison
  export TX2_SUBJECT_NUMERIC_OWNER=0 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_ORDERED_IDS=0
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
  [[ $# == 4 ]]
  if [[ ${DX_PREP1_CAMPAIGN:-comparison} == fair ]]; then
    [[ $cell =~ ^(1|2)-(off|on)-S$ && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == owner ]]; then
    [[ $cell =~ ^1-(group-K|old-S|fixed-S)$ && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == storage ]]; then
    [[ $cell =~ ^1-(group-K|old-S|fixed-S|prefetch-S|cache-S|ordered-S)$ && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == storage-ordered ]]; then
    [[ $cell == 1-ordered-S && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == ceiling ]]; then
    [[ $cell == 1-ceiling-S && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == tail ]]; then
    [[ $cell =~ ^1-tail-(control|wal|zgc|fair)-S$ && $(cat "$out/source") == "$source" ]]
  else
    [[ $cell =~ ^(1|2|4)-(0-K|1-S|2-S|3-K)$ ]]
  fi
  tag=$(cat "$prefix_file")
  [[ $tag =~ ^[0-9a-f]{8}$ && -z $(docker ps -q) ]]
  if [[ ${DX_PREP1_CAMPAIGN:-comparison} == ceiling ]]; then
    # The stack rehashes the dump before pg_restore. Check the other sealed files here.
    (cd "$out"; sed -n '1p;3p' SEAL.sha256 | sha256sum --strict -c > /dev/null)
  else
    (cd "$out"; sha256sum --strict -c SEAL.sha256 > /dev/null)
  fi
  export DX_PREP1_DUMP="$dump" DX_PREP1_DUMP_SHA=$(awk '$2=="seed.pgdump" {print $1}' "$out/SEAL.sha256")
  export DX_PREP1_WRITERS=${cell%%-*}
  export DX_PREP1_SUBJECT=0 DX_GROUP_COMMIT=1 DX_LIVE_PRIORITY=1
  export TX2_SUBJECT_NUMERIC_OWNER=0 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_ORDERED_IDS=0
  if [[ $cell == *-S ]]; then export DX_PREP1_SUBJECT=1 DX_GROUP_COMMIT=0 DX_LIVE_PRIORITY=0; fi
  if [[ $cell == 1-fixed-S || $cell == 1-prefetch-S || $cell == 1-ordered-S || $cell == 1-ceiling-S || $cell == 1-tail-*-S ]]; then export TX2_SUBJECT_NUMERIC_OWNER=1; fi
  if [[ $cell == 1-prefetch-S ]]; then export TX2_SUBJECT_PREFETCH=1; fi
  if [[ $cell == 1-ordered-S || $cell == 1-ceiling-S || $cell == 1-tail-*-S ]]; then export TX2_SUBJECT_ORDERED_IDS=1; fi
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
  if [[ ${DX_PREP1_CAMPAIGN:-} == tail ]]; then
    bash "$here/tail-pg.sh" settings "$owned" > "$dir/pg-settings.json"
    pids=()
    for role in pg tx gw-w gw-r; do pids+=("$(docker inspect --format '{{.State.Pid}}' "$owned-$role")"); done
    taskset -c 7 python3 "$here/tail-observe.py" record "$dir" "$DX_STACK_EVIDENCE/$owned/stack.json" "$source" \
      "$DX_WRITE_OPTIONS_ATTEMPT" "${pids[@]}" > "$dir/observer.log" 2>&1 &
    observer_pid=$!
    for ((i=0;i<100;i++)); do
      if grep -qs $'^START\t' "$dir/postgres-spans.tsv"; then break; fi
      kill -0 "$observer_pid"
      sleep .1
    done
    grep -q $'^START\t' "$dir/postgres-spans.tsv"
    bash "$here/tail-pg.sh" sentinel "$owned" > "$dir/probe-pid.txt"
    python3 "$here/tail-observe.py" sentinel "$dir" "$(head -n 1 "$dir/probe-pid.txt")"
    bash "$here/tail-pg.sh" stats "$owned" > "$dir/pg-before.json"
  fi
  "${producer[@]}" arm "$cell" "$seed" "$dir" "$owned" "$source" "$DX_WRITE_OPTIONS_ATTEMPT" \
    "$DX_STACK_EVIDENCE/$owned/stack.json" http://127.0.0.1:8495 "${urls[@]}"
  if [[ ${DX_PREP1_CAMPAIGN:-} == tail ]]; then
    bash "$here/tail-pg.sh" stats "$owned" > "$dir/pg-after.json"
    docker stop -t 15 "$owned-gw-w" "$owned-gw-r" >/dev/null
  fi
  docker stop -t 30 "$owned-tx" >/dev/null
  if [[ ${DX_PREP1_CAMPAIGN:-} == tail ]]; then
    stop_observer
    docker logs --timestamps "$owned-pg" > "$dir/postgres.log" 2>&1
  fi
  python3 "$here/server-collect.py" "$out/plan.json" "$dir" "$trace/prep1-native.ndjson" > "$dir/summary.tmp"
  if [[ ${DX_PREP1_CAMPAIGN:-} == tail ]]; then
    python3 "$here/tail-report.py" "$dir" "$trace" "$dir/summary.tmp"
  fi
  clean
  unset owned
  if [[ ${DX_PREP1_CAMPAIGN:-} != tail ]]; then mv "$dir/summary.tmp" "$dir/summary.json"; fi
else exit 2
fi
