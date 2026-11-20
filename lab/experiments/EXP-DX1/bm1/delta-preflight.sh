#!/usr/bin/env bash
# [DX-BM1] Why: run ACT2's own gate on this allocated server even when its published large-run launcher only accepts pooled scopes.
# Rejected: running the million-person workload to obtain the smaller gate or altering the builder's population.
set -euo pipefail
mode=${1:?run or clean}; dir=${2:?fresh item directory}; source=${3:?pushed ACT2 source}
[[ $(uname -s) == Linux && $EUID == 0 && $source =~ ^[a-f0-9]{40}$ ]]
repo=$dir/build/repository
case $dir in
  /var/tmp/triplex-bm1/night-n19/i0) slot=tx2-dxscale1-bm1n19delta ;;
  /var/tmp/triplex-bm1/night-n19/solon19|/var/tmp/triplex-bm1/night-n19/solon19b) slot=tx2-dxscale1-bm1${dir##*/} ;;
  *) exit 2 ;;
esac
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
  if [[ $slot != tx2-dxscale1-bm1n19delta ]]; then
    # [DX-BM1] Why: the published solo entry seeds exactly one account, runs both page references and checks its loaded DELTA releases.
    # Rejected: changing SCALE1 item 5 or reconstructing the missing outputs from the smaller gate.
    for size in 1000 100000; do
      where=$dir/solo-$size
      mkdir -m 700 "$where"
      gate=solo-check; count=6
      if [[ $size == 100000 ]]; then gate=solo; count=90; fi
      export DELTA_GATE=$gate
      node --input-type=module -e 'import fs from "node:fs"; import {randomUUID} from "node:crypto"; fs.writeFileSync(process.argv[1], JSON.stringify({source:process.env.TRIPLEX_TRACE_SOURCE,slot:process.env.TRIPLEX_TRACE_SLOT,nonce:randomUUID()})+"\n",{flag:"wx"});' "$where/request.json"
      if [[ $size == 100000 ]]; then
        node lab/bin/heavy.mjs --label DX-BM1-delta-100k -- taskset -c 3,5,6,7,9,10,11 node --import tsx lab/experiments/EXP-DX1/actv-delta/solo.ts "$where"
      else
        node lab/bin/heavy.mjs --label DX-BM1-delta-solo-1k -- node --import tsx --input-type=module -e '
          import fs from "node:fs"; import {solo} from "./lab/experiments/EXP-DX1/actv-delta/solo.ts";
          const d=process.argv[1]; await solo(d, JSON.parse(fs.readFileSync(d+"/request.json")),1000,6,console.log);
        ' "$where"
      fi
      node --import tsx --input-type=module -e '
        import fs from "node:fs"; import {checkSolo} from "./lab/experiments/EXP-DX1/actv-delta/solo-proof.ts";
        const [d,size,count]=process.argv.slice(1), b=JSON.parse(fs.readFileSync(d+"/request.json"));
        const r=checkSolo(d,b,Number(size),Number(count),process.env.DELTA_GATE);
        console.log(JSON.stringify({binding:b, subjects:r.subjects, offers:r.loaded.count, p99:r.loaded.p99, reference:r.reference.map(x=>x.release)}));
      ' "$where" "$size" "$count" > "$where/independent-check.json"
    done
  fi
  ;;
*) exit 2 ;;
esac
