#!/usr/bin/env bash
# [DX-BM1] Why: run ACT2's own gate on this allocated server even when its published large-run launcher only accepts pooled scopes.
# Rejected: running the million-person workload to obtain the smaller gate or altering the builder's population.
set -euo pipefail
mode=${1:?run or clean}; dir=${2:?fresh item directory}; source=${3:?pushed ACT2 source}
[[ $(uname -s) == Linux && $EUID == 0 && $dir == /var/tmp/triplex-bm1/night-n19/i0 && $source =~ ^[a-f0-9]{40}$ ]]
repo=$dir/build/repository
slot=tx2-dxscale1-bm1n19delta
cd "$repo"
[[ $(git rev-parse HEAD) == "$source" && -z $(git status --porcelain --untracked-files=no) ]]
export PATH="$dir/build/tools/bin:$PATH" DX_BARE_METAL=1 DX_BARE_METAL_ROOT=$dir
export DOCKER_HOST=unix:///var/run/docker.sock DX_STACK_EVIDENCE=$dir/engines
stack=lab/experiments/EXP-DX1/stack
case $mode in
clean)
  if [[ -e $dir/ownership ]]; then
    read -r who built nonce < "$dir/ownership"
    [[ $who == "$slot" && $built == "$source" && $nonce =~ ^[a-f0-9-]{36}$ ]]
    for role in pg tx gw-w gw-r; do
      if docker container inspect "$slot-$role" > "$dir/$role.inspect.json" 2>/dev/null; then
        docker logs "$slot-$role" > "$dir/$role.log" 2>&1 || true
      fi
    done
    bash "$stack/down.sh" "$slot" --volumes
  fi
  bash "$stack/up.sh" "$slot" --inventory > "$dir/remaining.txt"
  [[ ! -s $dir/remaining.txt ]]
  printf 'clean %s\n' "$(date -u +%FT%TZ)" > "$dir/cleanup.txt"
  ;;
run)
  [[ ! -e $dir/ownership && ! -e $dir/preflight ]]
  [[ $(df -Pk "$dir" | awk 'NR==2{print $4}') -gt 5242880 ]]
  running=$(docker ps -q)
  [[ -z $running ]]
  bash "$stack/up.sh" "$slot" --inventory > "$dir/before.txt"
  [[ ! -s $dir/before.txt ]]
  nonce=$(cat /proc/sys/kernel/random/uuid)
  printf '%s %s %s\n' "$slot" "$source" "$nonce" > "$dir/ownership"
  export TRIPLEX_TRACE_RUN=$slot TRIPLEX_TRACE_SLOT=$slot TRIPLEX_TRACE_SOURCE=$source
  export TRIPLEX_TRACE_LEVEL=summary TRIPLEX_TRACE_GATEWAY=1 TRIPLEX_TRACE_NODE=1 DX_QUIET_LOGS=1 DX_STACK_WAIT_FOR_TRANSACTOR=1
  export DX_GW_WRITE_MEMORY=6g DX_GW_READ_MEMORY=6g
  export TRIPLEX_DATOMIC_LAYOUT=lean TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1
  bash "$stack/up.sh" "$slot" --no-publish --cpus-tx 0 --cpus-pg 1 --cpus-gw-write 2 --cpus-gw-read 4,8 \
    --pg-memory 6g --tx-memory 6g --tx-java-opts '-Xms256m -Xmx5g -XX:+UseG1GC -Xlog:gc=info:file=/trace/tx-gc.log' \
    --object-cache-max 2560m --pg-settings '-c shared_buffers=1GB -c max_wal_size=8GB -c synchronous_commit=on -c fsync=on -c full_page_writes=on -c track_io_timing=on -c track_wal_io_timing=on'
  address() { docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$slot-$1"; }
  write_ip=$(address gw-w); read_ip=$(address gw-r)
  [[ -n $write_ip && -n $read_ip && $write_ip != "$read_ip" ]]
  export DATOMIC_URL="http://$write_ip:8080" DELTA_READER_URL="http://$read_ip:8080"
  node lab/bin/heavy.mjs --label DX-BM1-delta-preflight -- node --import tsx --input-type=module -e '
    import {guardDelta} from "./lab/experiments/EXP-DX1/actv-delta/preflight.ts";
    const [dir, source, slot, nonce] = process.argv.slice(1);
    console.log(JSON.stringify(guardDelta(dir, {source, slot, nonce}, process.env)));
  ' "$dir/preflight" "$source" "$slot" "$nonce"
  ;;
*) exit 2 ;;
esac
