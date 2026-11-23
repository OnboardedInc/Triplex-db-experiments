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
mode=${1:?expected run, storage, storage-ordered, ceiling, scale, rolling, cache32, cache32-aged, production, production-full, fresh, tail, tail-combined, owner, fair or arm}
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
tx_cores=1
if [[ $mode == arm && ${DX_PREP1_CAMPAIGN:-comparison} =~ ^(storage(-ordered)?|ceiling|scale|tail(-combined)?)$ ]]; then
  # [DX-PREP1] Why: reserve the same JVM and container budget for every cache comparison.
  # Rejected: changing the heap or CPU as well as the object cache between the two S arms.
  tx_memory=30g
  if [[ ${4:-} =~ ^1-(cache|scale-(cache|wal-zgc))-S$ ]]; then tx_cache=16g; fi
  tx_java="-Xms1g -Xmx24g -XX:+UseG1GC -XX:MaxGCPauseMillis=50 -Ddatomic.objectCacheMax=$tx_cache -Ddatomic.prefetchProbes=true"
fi
if [[ ${DX_PREP1_CAMPAIGN:-} == scale && $mode == arm && ${4:-} != 1-scale-base-S ]]; then
  export DX_PREP1_TX_CPUS=0,7-8
  tx_cores=3
fi
if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^(scale|tail(-combined)?)$ && $mode == arm ]]; then
  pg_settings+=' -c fsync=on -c synchronous_commit=on -c full_page_writes=on -c wal_sync_method=fdatasync -c checkpoint_timeout=5min -c checkpoint_completion_target=0.9 -c checkpoint_flush_after=256kB -c min_wal_size=80MB -c max_wal_size=1GB -c log_checkpoints=on -c log_timezone=UTC'
  if [[ ${4:-} =~ ^1-(tail-(zgc|combined)|scale-wal-zgc)-S$ ]]; then
    collector=$(node --input-type=module -e 'import {collectorOptions} from "./lab/experiments/EXP-DX1/jvm1/launch.mjs"; console.log(collectorOptions("25", "ZGC", "tx", Number(process.argv[1])).join(" "))' "$tx_cores")
    tx_java="-Xms1g -Xmx24g $collector -Ddatomic.objectCacheMax=$tx_cache -Ddatomic.prefetchProbes=true"
    export DX_PREP1_TAIL_TX_ZGC=1
  fi
fi
up_args=(--port-write 8491 --port-read 8495 --cpus-tx "${DX_PREP1_TX_CPUS:-0}" --cpus-pg "${DX_PREP1_PG_CPUS:-1}"
  --cpus-gw-write "${DX_PREP1_WRITE_CPUS:-2-5}" --cpus-gw-read "${DX_PREP1_READ_CPUS:-6}"
  --pg-memory 8g --tx-memory "$tx_memory" --tx-java-opts "$tx_java"
  --object-cache-max "$tx_cache" --memory-index-threshold 256m --memory-index-max 1g
  --pg-settings "$pg_settings")
if [[ ${DX_PREP1_CAMPAIGN:-} == rolling && $mode == arm ]]; then
  # [DX-PREP1] Why: consume the very same profile policy as the scorecard.
  # Rejected: hand-maintaining an almost-identical set of Java flags and SQL settings.
  mapfile -t profile < <(node --input-type=module -e '
    import {rollingLaunchProfile} from "./lab/experiments/EXP-DX1/prep1/rolling-launch.mjs";
    const p = rollingLaunchProfile(process.argv[1]);
    console.log([JSON.stringify(p), p.tx.cpus, p.pg.cpus, p["gw-w"].cpus, p["gw-r"].cpus,
      p.tx.memoryMiB, p.pg.memoryMiB, p["gw-w"].memoryMiB, p["gw-r"].memoryMiB,
      p.tx.flags.join(" "), p["gw-w"].flags.join(" "), p["gw-r"].flags.join(" "), p.tx.cacheMiB,
      p.index.threshold,p.index.max,Object.entries(p.pg.settings).map(([k,v]) => "-c "+k+"="+v).join(" "),
      p["gw-w"].major].join("\n"));' "${4:?}")
  [[ ${#profile[@]} == 17 ]]
  up_args=(--port-write 8491 --port-read 8495 --cpus-tx "${profile[1]}" --cpus-pg "${profile[2]}"
    --cpus-gw-write "${profile[3]}" --cpus-gw-read "${profile[4]}" --tx-memory "${profile[5]}m" --pg-memory "${profile[6]}m"
    --tx-java-opts "${profile[9]}" --object-cache-max "${profile[12]}m" --memory-index-threshold "${profile[13]}"
    --memory-index-max "${profile[14]}" --pg-settings "${profile[15]}")
  export DX_TX_JAVA=25 DX_GW_WRITE_JAVA="${profile[16]}" DX_LAUNCH_PROFILE=server
fi
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
      [[ ${wal_owner:-} =~ ^tx2-dxprep1-[a-f0-9]{8}-1-tail-(wal|combined)-s$ && ! -L $mounted_wal/$wal_owner ]] || return 1
      rm -rf --one-file-system -- "$mounted_wal/$wal_owner" || return 1
    fi
    umount "$mounted_wal" || return 1
    unset mounted_wal DX_PREP1_TAIL_WAL_MOUNT wal_created
  fi
}
clear_scale_wal() {
  if [[ -n ${scale_wal_owned:-} ]]; then
    [[ $(findmnt -nro SOURCE --mountpoint "$scale_wal_mount") == "${scale_wal_device:-/dev/nvme1n1}" &&
       $scale_wal_owned == "$scale_wal_mount/$owned" &&
       $owned =~ ^tx2-dxprep1-[a-f0-9]{8}-1-(scale-wal-zgc|barrier6|rolling(6|8|12|16)|rolling6(-tx5)?(-cache32)?|fresh(-zgc)?(6|12)|prod(r|s|s-394)(-cache32)?)-s$ &&
       ! -L $scale_wal_owned ]] || return 1
    rm -rf --one-file-system -- "$scale_wal_owned" || return 1
    unset scale_wal_owned DX_PREP1_SCALE_WAL_DIR
  fi
}
on_exit() {
  ret=$?
  trap - EXIT
  if [[ -n ${sender_pid:-} ]]; then kill -TERM "$sender_pid" 2>/dev/null || true; wait "$sender_pid" || true; fi
  stop_observer || ret=1
  # Keep the WAL mounted if the owned stack could not be removed.
  if clean; then unmount_wal && clear_scale_wal || ret=1; else ret=1; fi
  exit "$ret"
}
trap on_exit EXIT
trap 'exit 143' TERM INT
if [[ $mode == ceiling ]]; then
  [[ $# == 6 || ($# == 8 && $7 == --pg-data) ]]
  exec timeout --kill-after=40s 3560s bash "$here/server.sh" ceiling-timed "${@:2}"
elif [[ $mode == rolling ]]; then
  [[ $# == 10 && $7 == --pg-data && $9 == --wal-mount && -z ${DX_PREP1_FRESH_CREDITS:-}${DX_PREP1_CACHE32:-}${DX_PREP1_AGED:-} ]]
  limit=8960
  if [[ ${DX_PREP1_ROLLING_ARM:-} == rolling6-tx5 ]]; then limit=2060; fi
  exec timeout --kill-after=40s "${limit}s" bash "$here/server.sh" rolling-timed "${@:2}"
elif [[ $mode == cache32 ]]; then
  [[ $# == 10 && $7 == --pg-data && $9 == --wal-mount && -z ${DX_PREP1_FRESH_CREDITS:-}${DX_PREP1_ROLLING_ARM:-}${DX_PREP1_AGED:-} ]]
  export DX_PREP1_CACHE32=1
  exec timeout --kill-after=40s 3560s bash "$here/server.sh" rolling-timed "${@:2}"
elif [[ $mode == production || $mode == production-full ]]; then
  # [DX-REAL2] Why: replay the production-shaped neighbour tape on Saturday's rolling-6 arms and fresh cut.
  # Rejected: mixing it with another rolling choice or the aged cut (its seed fields differ).
  [[ $# == 10 && $7 == --pg-data && $9 == --wal-mount &&
     -z ${DX_PREP1_FRESH_CREDITS:-}${DX_PREP1_ROLLING_ARM:-}${DX_PREP1_CACHE32:-}${DX_PREP1_AGED:-}${DX_REAL2_SET:-} ]]
  unset DX_REAL2_PARAMS
  limit=3560
  export DX_REAL2_SET=hour
  if [[ $mode == production-full ]]; then export DX_REAL2_SET=full; limit=9900; fi
  exec timeout --kill-after=40s "${limit}s" bash "$here/server.sh" rolling-timed "${@:2}"
elif [[ $mode == cache32-aged ]]; then
  # [DX-PREP1] Why: run Saturday's three-core 32 GiB arm unchanged on AGE1's sealed one-billion cut.
  # Rejected: a second arm (five cores) or a 16 GiB control inside the 75-minute server cap.
  [[ $# == 13 && $7 == --pg-data && $9 == --wal-mount && ${11} == --aged-bundle && ${12} == /* && ${13} =~ ^[a-f0-9]{64}$ &&
     -z ${DX_PREP1_FRESH_CREDITS:-}${DX_PREP1_ROLLING_ARM:-}${DX_PREP1_CACHE32:-}${DX_PREP1_AGED:-} ]]
  bundle=$(realpath -e "${12}")
  [[ -f $bundle && $(sha256sum "$bundle" | cut -d ' ' -f 1) == "${13}" ]]
  export DX_PREP1_CACHE32=1 DX_PREP1_AGED=1 DX_PREP1_AGED_BUNDLE=$bundle DX_PREP1_AGED_SHA=${13}
  exec timeout --kill-after=40s 2700s bash "$here/server.sh" rolling-timed "${@:2:9}"
elif [[ $mode == fresh ]]; then
  [[ $# == 12 && $7 == --pg-data && $9 == --wal-mount &&
     ${11} == --write-jvm && ${12} == j25-zgc && -z ${DX_PREP1_ROLLING_ARM:-}${DX_PREP1_CACHE32:-}${DX_PREP1_AGED:-} ]]
  export DX_PREP1_FRESH_CREDITS=${DX_PREP1_FRESH_CREDITS:-6}
  [[ $DX_PREP1_FRESH_CREDITS =~ ^(6|12)$ ]]
  exec timeout --kill-after=40s 7160s bash "$here/server.sh" rolling-timed "${@:2:9}"
elif [[ $mode == scale ]]; then
  [[ $# == 10 && $7 == --pg-data && $9 == --wal-mount ]]
  exec timeout --kill-after=40s 2660s bash "$here/server.sh" scale-timed "${@:2}"
elif [[ $mode == ceiling-timed || $mode == scale-timed || $mode == rolling-timed ]]; then
  if [[ $mode == scale-timed || $mode == rolling-timed ]]; then
    [[ $# == 10 && $7 == --pg-data && $9 == --wal-mount && ${10} == /* ]]
    scale_wal_mount=$(realpath -e "${10}")
    scale_wal_device=$(findmnt -nro SOURCE --mountpoint "$scale_wal_mount")
    [[ $scale_wal_mount != *[,\"$'\n']* && $(findmnt -nro FSTYPE --mountpoint "$scale_wal_mount") == ext4 ]]
    if [[ $mode == rolling-timed ]]; then
      disk_of() { lsblk -ndo PKNAME,KNAME "$1" | awk 'NF==2 {print $1} NF==1 {print $1}'; }
      docker_root=$(docker info --format '{{.DockerRootDir}}')
      data_disk=$(disk_of "$(findmnt -nro SOURCE --target "$docker_root/volumes")")
      wal_disk=$(disk_of "$scale_wal_device")
      [[ $data_disk =~ ^nvme[0-9]+n[0-9]+$ && $wal_disk =~ ^nvme[0-9]+n[0-9]+$ && $data_disk != "$wal_disk" ]]
      export DX_PREP1_ROLLING_WAL_DEVICE=$scale_wal_device
      if [[ ${DX_PREP1_CACHE32:-} == 1 || ${DX_REAL2_SET:-} == full ]]; then
        # [DX-PREP1] Why: preserve at least 10 GiB outside the 79 GiB of role caps (:GiB, not advertised GB).
        # Rejected: treating the server SKU size as MemTotal or budgeting only Java heap.
        host_kib=$(awk '$1 == "MemTotal:" && $3 == "kB" {print $2}' /proc/meminfo)
        [[ $host_kib =~ ^[0-9]+$ ]]
        (( host_kib >= 89*1024*1024 ))
      fi
    else
      [[ $scale_wal_device == /dev/nvme1n1 && $(findmnt -nro SOURCE /) == /dev/nvme0n1p2 ]]
    fi
    [[ -f /sys/fs/cgroup/cgroup.controllers ]]
    last_cpu=8; if [[ $mode == rolling-timed ]]; then last_cpu=11; fi
    for ((cpu=0;cpu<=last_cpu;cpu++)); do taskset -c "$cpu" true; done
    core_count=$(lscpu -p=CPU,CORE,SOCKET | awk -F, -v max="$last_cpu" '$1 ~ /^[0-9]+$/ && $1 <= max {print $2 ":" $3}' | sort -u | wc -l)
    [[ $core_count == $((last_cpu+1)) ]]
    unset DX_PREP1_SCALE_WAL_DIR DX_PREP1_TAIL_TX_ZGC DX_JAVA DX_TX_JAVA DX_GW_WRITE_JAVA DX_DATOMIC_IMAGE_RECEIPT DX_BM1_WAL_MOUNT DX_BM1_WAL_AB
    export DX_PREP1_TX_CPUS=0 DX_PREP1_PG_CPUS=1 DX_PREP1_WRITE_CPUS=2-5 DX_PREP1_READ_CPUS=6 DX_INT1_GATEWAYS=original
    java25=$(DX_JAVA=25 DX_DATOMIC_IMAGE_RECEIPT="${DX_PREP1_JAVA25_RECEIPT:-}" node lab/config/datomic/runtime.mjs image)
    docker image inspect "$java25" >/dev/null
  else
    [[ $# == 6 || ($# == 8 && $7 == --pg-data) ]]
  fi
  [[ $4 == /* && ! -e $out && -z $(docker ps -q) ]]
  parent=$(realpath -e "$4")
  unset DX_PREP1_PGDATA DX_PREP1_DUMP DX_JVM1_PG_RESTORE
  seed_mode=()
  if [[ $# -ge 8 ]]; then
    [[ $8 == /* ]]
    DX_PREP1_PGDATA=$(realpath -e "$8")
    [[ -d $DX_PREP1_PGDATA && $DX_PREP1_PGDATA != *[,\"$'\n']* && $DX_PREP1_PGDATA != / ]]
    export DX_PREP1_PGDATA
    seed_mode=(--pg-data)
    if [[ $mode == rolling-timed ]]; then
      # [DX-PREP1] Why: bound each disposable clone and its raw telemetry before the first arm.
      # Rejected: starting copies when removing an older database would be needed to finish.
      seed_bytes=$(du -sB1 -- "$DX_PREP1_PGDATA" | cut -f1)
      data_free=$(df -B1 --output=avail "$docker_root/volumes" | tail -n1)
      wal_free=$(df -B1 --output=avail "$scale_wal_mount" | tail -n1)
      evidence_free=$(df -B1 --output=avail "$(dirname "$out")" | tail -n1)
      (( data_free > seed_bytes+32*1024**3 && wal_free > 16*1024**3 && evidence_free > 16*1024**3 ))
    fi
  else
    [[ -f $parent/seed.pgdump && $(head -c 5 "$parent/seed.pgdump") == PGDMP ]]
  fi
  mkdir "$out" "$DX_STACK_EVIDENCE"
  export DX_PREP1_CAMPAIGN=${mode%-timed} DX_PREP1_FAIR_CREDITS=0
  aged_mode=()
  if [[ ${DX_PREP1_AGED:-} == 1 ]]; then
    [[ $mode == rolling-timed && ${DX_PREP1_CACHE32:-} == 1 && ${#seed_mode[@]} == 1 ]]
    [[ $(sha256sum "$DX_PREP1_AGED_BUNDLE" | cut -d ' ' -f 1) == "$DX_PREP1_AGED_SHA" ]]
    aged_mode=(--aged-bundle "$DX_PREP1_AGED_BUNDLE" "$DX_PREP1_AGED_SHA")
  else
    unset DX_PREP1_AGED_BUNDLE DX_PREP1_AGED_SHA
  fi
  "${producer[@]}" adopt-scale "$parent" "$5" "$6" "${seed_mode[@]}" "${aged_mode[@]}" > "$seed"
  "${producer[@]}" plan > "$out/plan.json"
  if [[ -n ${DX_PREP1_PGDATA:-} ]]; then
    (cd "$out"; sha256sum seed.json plan.json) > "$out/SEAL.sha256"
  else
    ln -s "$parent/seed.pgdump" "$dump"
    dump_pin=$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1])).dumpSha256' "$seed")
    [[ $dump_pin =~ ^[a-f0-9]{64}$ ]]
    (cd "$out"; sha256sum seed.json; printf '%s  seed.pgdump\n' "$dump_pin"; sha256sum plan.json) > "$out/SEAL.sha256"
  fi
  tag=$(nonce); tag=${tag%%-*}
  printf '%s\n' "$tag" > "$prefix_file"
  printf '%s\n' "$source" > "$out/source"
  chmod a-w "$out"/{SEAL.sha256,source,seed.json,plan.json,prefix}
  if [[ $mode == scale-timed || $mode == rolling-timed ]]; then
    # [DX-PREP1] Why: reopen the same stopped cut independently for each transactor policy.
    # Rejected: letting earlier edits warm the people and leaves for later treatments.
    findmnt --json --mountpoint "$scale_wal_mount" -o SOURCE,TARGET,FSTYPE > "$out/scale-wal-mount.json"
    selected=(1-scale-base-S 1-scale-cache-S 1-scale-wal-zgc-S)
    arm_limit=850
    if [[ $mode == rolling-timed ]]; then
      arm_limit=2950
      if [[ -n ${DX_REAL2_SET:-} ]]; then
        # [DX-REAL2] Why: the hour set fits one rented hour; the full set is four separate stacks.
        if [[ $DX_REAL2_SET == hour ]]; then selected=(1-prodR-S 1-prodS-394-S)
        else selected=(1-prodR-S 1-prodS-S 1-prodR-cache32-S 1-prodS-cache32-S); fi
      elif [[ ${DX_PREP1_CACHE32:-} == 1 && ${DX_PREP1_AGED:-} == 1 ]]; then
        # [DX-PREP1] Why: the 176 GB copy happens inside the arm; allow about seven minutes for it.
        arm_limit=2400
        selected=(1-rolling6-cache32-S)
      elif [[ ${DX_PREP1_CACHE32:-} == 1 ]]; then
        arm_limit=1740
        selected=(1-rolling6-cache32-S 1-rolling6-tx5-cache32-S)
      elif [[ -n ${DX_PREP1_FRESH_CREDITS:-} ]]; then
        [[ $DX_PREP1_FRESH_CREDITS =~ ^(6|12)$ && -z ${DX_PREP1_ROLLING_ARM:-} ]]
        arm_limit=2340
        selected=("1-rolling$DX_PREP1_FRESH_CREDITS-S" "1-fresh$DX_PREP1_FRESH_CREDITS-S" "1-fresh-zgc$DX_PREP1_FRESH_CREDITS-S")
      elif [[ -n ${DX_PREP1_ROLLING_ARM:-} ]]; then
        [[ $DX_PREP1_ROLLING_ARM =~ ^(barrier6|rolling(6|8|12|16)|rolling6-tx5)$ ]]
        selected=("1-$DX_PREP1_ROLLING_ARM-S")
      else
        selected=(1-barrier6-S 1-rolling6-S 1-rolling12-S)
      fi
    fi
    for cell in "${selected[@]}"; do
      owned="tx2-dxprep1-$tag-${cell,,}"
      if [[ $cell == 1-scale-wal-zgc-S || $mode == rolling-timed ]]; then
        mkdir -m 0700 "$scale_wal_mount/$owned"
        scale_wal_owned=$scale_wal_mount/$owned
        export DX_PREP1_SCALE_WAL_DIR=$scale_wal_owned
      fi
      limit_for_cell=$arm_limit
      if [[ -n ${DX_REAL2_SET:-} ]]; then
        # Two- and four-cell arms get Saturday's two-rate cache32 allowance; the three-rate arms its three-rate one.
        case $cell in 1-prodS-394-S) limit_for_cell=1500 ;; 1-prodS-S|1-prodS-cache32-S) limit_for_cell=2950 ;; *) limit_for_cell=1740 ;; esac
      fi
      timeout --foreground --kill-after=20s "${limit_for_cell}s" bash "$here/server.sh" arm "$out" "$source" "$cell"
      clear_scale_wal
      unset owned
      mv "$out/$cell/summary.tmp" "$out/$cell/summary.json"
    done
  else
    # [DX-PREP1] Why: the original ceiling uses disjoint cohorts in one restored database.
    # Rejected: counting two unbounded restores against the one-hour experiment.
    owned="tx2-dxprep1-$tag-1-ceiling-s"
    bash "$here/server.sh" arm "$out" "$source" 1-ceiling-S
    unset owned
  fi
elif [[ $mode == fair || $mode == owner || $mode == storage || $mode == storage-ordered || $mode =~ ^tail(-combined)?$ ]]; then
  [[ $# == 4 ]]
  # [DX-PREP1] Why: cap time from seed verification through the last cleanup.
  # Rejected: four independent timeouts that let restore and teardown exceed the hour.
  total=3520
  if [[ $mode == storage ]]; then total=7000; fi
  if [[ $mode == storage-ordered ]]; then total=1050; fi
  if [[ $mode == tail ]]; then total=4460; fi
  if [[ $mode == tail-combined ]]; then total=1760; fi
  exec timeout --kill-after=40s "${total}s" bash "$here/server.sh" "$mode-timed" "$out" "$source" "$4"
elif [[ $mode == fair-timed || $mode == owner-timed || $mode == storage-timed || $mode == storage-ordered-timed || $mode =~ ^tail(-combined)?-timed$ ]]; then
  [[ $# == 4 && $4 == /* && ! -e $out && -z $(docker ps -q) ]]
  parent=$(realpath -e "$4")
  if [[ $mode =~ ^tail(-combined)?-timed$ ]]; then
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
  elif [[ $mode == tail-combined-timed ]]; then
    cells=(1-tail-combined-S)
    arm_limit=1610
  fi
  for cell in "${cells[@]}"; do
    owned="tx2-dxprep1-$tag-${cell,,}"
    if [[ $cell =~ ^1-tail-(wal|combined)-S$ ]]; then
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
    if [[ $mode =~ ^tail(-combined)?-timed$ ]]; then
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
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == scale ]]; then
    [[ $cell =~ ^1-scale-(base|cache|wal-zgc)-S$ && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == rolling ]]; then
    [[ $cell =~ ^1-(barrier6|rolling(6|8|12|16)|rolling6(-tx5)?(-cache32)?|fresh(-zgc)?(6|12)|prod(R|S|S-394)(-cache32)?)-S$ && $(cat "$out/source") == "$source" ]]
    if [[ $cell == 1-prod* ]]; then [[ -n ${DX_REAL2_SET:-} ]]; else [[ -z ${DX_REAL2_SET:-} ]]; fi
    if [[ $cell == 1-rolling6-tx5-S || $cell == 1-rolling6*-cache32-S || $cell == 1-prod*-cache32-S ]]; then
      if [[ $cell == 1-prod*-cache32-S ]]; then [[ ${DX_REAL2_SET:-} == full ]]
      elif [[ $cell == *-cache32-S ]]; then [[ ${DX_PREP1_CACHE32:-} == 1 ]]
      else [[ ${DX_PREP1_ROLLING_ARM:-} == rolling6-tx5 ]]; fi
      export DX_JVM1_TX_PROPERTIES='{"index-parallelism":1}'
    fi
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == tail ]]; then
    [[ $cell =~ ^1-tail-(control|wal|zgc|fair)-S$ && $(cat "$out/source") == "$source" ]]
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == tail-combined ]]; then
    [[ $cell == 1-tail-combined-S && $(cat "$out/source") == "$source" ]]
  else
    [[ $cell =~ ^(1|2|4)-(0-K|1-S|2-S|3-K)$ ]]
  fi
  tag=$(cat "$prefix_file")
  [[ $tag =~ ^[0-9a-f]{8}$ && -z $(docker ps -q) ]]
  if [[ -n ${DX_PREP1_PGDATA:-} ]]; then
    [[ ${DX_PREP1_CAMPAIGN:-} =~ ^(ceiling|scale|rolling)$ && ! -e $dump ]]
    (cd "$out"; sha256sum --strict -c SEAL.sha256 > /dev/null)
    unset DX_PREP1_DUMP DX_PREP1_DUMP_SHA
    export DX_PREP1_SEED_SHA=$(sha256sum "$seed" | cut -d ' ' -f 1)
  elif [[ ${DX_PREP1_CAMPAIGN:-comparison} == ceiling ]]; then
    # Keep the seed and plan checks outside the dump restore.
    (cd "$out"; sed -n '1p;3p' SEAL.sha256 | sha256sum --strict -c > /dev/null)
  else
    (cd "$out"; sha256sum --strict -c SEAL.sha256 > /dev/null)
  fi
  if [[ -z ${DX_PREP1_PGDATA:-} ]]; then
    export DX_PREP1_DUMP="$dump" DX_PREP1_DUMP_SHA=$(awk '$2=="seed.pgdump" {print $1}' "$out/SEAL.sha256")
  fi
  export DX_PREP1_WRITERS=${cell%%-*}
  export DX_PREP1_SUBJECT=0 DX_GROUP_COMMIT=1 DX_LIVE_PRIORITY=1
  export TX2_SUBJECT_NUMERIC_OWNER=0 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_ORDERED_IDS=0
  if [[ $cell == *-S ]]; then export DX_PREP1_SUBJECT=1 DX_GROUP_COMMIT=0 DX_LIVE_PRIORITY=0; fi
  if [[ $cell == 1-fixed-S || $cell == 1-prefetch-S || $cell == 1-ordered-S || $cell == 1-ceiling-S || $cell == 1-tail-*-S || $cell == 1-scale-*-S ]]; then export TX2_SUBJECT_NUMERIC_OWNER=1; fi
  if [[ $cell == 1-prefetch-S ]]; then export TX2_SUBJECT_PREFETCH=1; fi
  if [[ $cell == 1-ordered-S || $cell == 1-ceiling-S || $cell == 1-tail-*-S || $cell == 1-scale-*-S ]]; then export TX2_SUBJECT_ORDERED_IDS=1; fi
  export DX_WRITE_OPTIONS_ATTEMPT=$(nonce)
  # Hold total configured writer heap and the writer CPU mask fixed across peer counts.
  export DX_GW_WRITE_JAVA_OPTS="-Xms$((512/DX_PREP1_WRITERS))m -Xmx$((4096/DX_PREP1_WRITERS))m -XX:+UseG1GC"
  export DX_GW_WRITE_MEMORY="$((6144/DX_PREP1_WRITERS))m"
  export DX_GW_READ_JAVA_OPTS='-Xms256m -Xmx3g -XX:+UseG1GC' DX_GW_READ_MEMORY=5g
  if [[ ${DX_PREP1_CAMPAIGN:-} == rolling ]]; then
    export TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_ORDERED_IDS=1
    export DX_GW_WRITE_JAVA_OPTS="${profile[10]}" DX_GW_READ_JAVA_OPTS="${profile[11]}"
    export DX_GW_WRITE_MEMORY="${profile[7]}m" DX_GW_READ_MEMORY="${profile[8]}m"
  fi
  owned="tx2-dxprep1-$tag-${cell,,}"
  dir="$out/$cell"
  mkdir "$dir"
  cat /proc/sys/kernel/random/boot_id > "$dir/boot-id"
  bash "$stack/up.sh" "$owned" "${up_args[@]}" > "$dir/start.log" 2>&1
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^(scale|rolling)$ ]]; then bash "$here/tail-pg.sh" settings "$owned" > "$dir/pg-settings.json"; fi
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
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
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
  args=(arm "$cell" "$seed" "$dir" "$owned" "$source" "$DX_WRITE_OPTIONS_ATTEMPT"
    "$DX_STACK_EVIDENCE/$owned/stack.json" http://127.0.0.1:8495 "${urls[@]}")
  if [[ ${DX_PREP1_CAMPAIGN:-} == rolling ]]; then
    printf '%s\n' "${profile[0]}" > "$dir/launch-profile.json"
    if [[ $cell == 1-rolling6-tx5-S || $cell == 1-rolling6*-cache32-S || $cell == 1-prod*-cache32-S ]]; then
      attempt="$DX_STACK_EVIDENCE/$owned"
      docker logs "$owned-gw-w" > "$dir/gw-w-placement.log" 2>&1
      node "$here/rolling-launch.mjs" "$cell" "$dir/launch-profile.json" "$attempt/tx-startup-wait.log" \
        "$dir/gw-w-placement.log" "$attempt/config/sql.properties"
    fi
    taskset -c 9 "${producer[@]}" "${args[@]}" & sender_pid=$!
    taskset -c 10 python3 "$here/rolling-counters.py" "$dir" "$DX_STACK_EVIDENCE/$owned/containers.json" \
      "$owned" "$source" "$DX_WRITE_OPTIONS_ATTEMPT" "$sender_pid" > "$dir/observer.log" 2>&1 & observer_pid=$!
    while kill -0 "$sender_pid" 2>/dev/null && kill -0 "$observer_pid" 2>/dev/null; do sleep 1; done
    if [[ ! -s $dir/complete.json ]] && ! kill -0 "$observer_pid" 2>/dev/null; then
      wait "$observer_pid"
      exit 1
    fi
    wait "$sender_pid"; unset sender_pid
    wait "$observer_pid"; unset observer_pid
  else
    "${producer[@]}" "${args[@]}"
  fi
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
    bash "$here/tail-pg.sh" stats "$owned" > "$dir/pg-after.json"
  fi
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^(scale|rolling|tail(-combined)?)$ ]]; then
    docker stop -t 15 "$owned-gw-w" "$owned-gw-r" >/dev/null
  fi
  docker stop -t 30 "$owned-tx" >/dev/null
  if [[ ${DX_PREP1_CAMPAIGN:-} == rolling ]]; then
    docker logs --timestamps "$owned-pg" > "$dir/postgres.log" 2>&1
  fi
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
    stop_observer
    docker logs --timestamps "$owned-pg" > "$dir/postgres.log" 2>&1
  fi
  python3 "$here/server-collect.py" "$out/plan.json" "$dir" "$trace/prep1-native.ndjson" > "$dir/summary.tmp"
  if [[ ${DX_PREP1_CAMPAIGN:-} =~ ^tail(-combined)?$ ]]; then
    python3 "$here/tail-report.py" "$dir" "$trace" "$dir/summary.tmp"
  fi
  clean
  unset owned
  if [[ ! ${DX_PREP1_CAMPAIGN:-} =~ ^(scale|rolling|tail(-combined)?)$ ]]; then mv "$dir/summary.tmp" "$dir/summary.json"; fi
else exit 2
fi
