#!/usr/bin/env bash
# [DX-N1] Why: alternate fresh VM/native arms within one lease. Rejected: comparing different host windows.
source "$(dirname "$0")/common.sh"
prefix=${1:?usage: matched.sh tx2-dxn1-PREFIX}; valid_prefix "$prefix"
cd "$REPO"; resources
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export DX_STACK_EVIDENCE=$EVIDENCE/matched
mkdir -p "$DX_STACK_EVIDENCE"
mkdir "$DX_STACK_EVIDENCE/$prefix"
python3 "$HERE/prepare-matched.py"
cp "$HERE/generated/provenance.json" "$DX_STACK_EVIDENCE/$prefix/"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
held=false; supervisor=; client=; timer=; arm_prefix=; arm_kind=
stop_arm() {
 if [[ -n $client ]]; then kill "$client" 2>/dev/null || true; wait "$client" 2>/dev/null || true; client=; fi
 if [[ -n $supervisor ]]; then kill "$supervisor" 2>/dev/null || true; wait "$supervisor" 2>/dev/null || true; supervisor=; fi
 if [[ -n $arm_prefix ]]; then
  if [[ $arm_kind == vm ]]; then
   for role in pg tx gw-w gw-r; do docker logs "$arm_prefix-$role" > "$DX_STACK_EVIDENCE/$arm_prefix/$role.log" 2>&1 || true; done
   if docker container inspect "$arm_prefix-driver" >/dev/null 2>&1; then
    docker stop -t 5 "$arm_prefix-driver" >/dev/null || true
    mkdir -p "$DX_STACK_EVIDENCE/$arm_prefix/driver"
    docker cp "$arm_prefix-driver:/driver/." "$DX_STACK_EVIDENCE/$arm_prefix/driver/"
    docker rm "$arm_prefix-driver" >/dev/null
   fi
   bash lab/experiments/EXP-DX1/stack/down.sh "$arm_prefix" --volumes
   if docker volume inspect "$arm_prefix-driver" >/dev/null 2>&1; then docker volume rm "$arm_prefix-driver"; fi
   [[ -z $(docker ps -a --filter "name=^/$arm_prefix-" --format '{{.Names}}') ]] || return 1
  else
   bash "$HERE/down.sh" "$arm_prefix"
   tar -czf "$EVIDENCE/$arm_prefix.tar.gz" -C "$NATIVE/runs" "$arm_prefix"
  fi
 fi
}
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $timer ]] || kill "$timer" 2>/dev/null || true
 stop_arm || { echo 'cleanup failed; retaining lock' >&2; exit 1; }
 sh lab/bin/host-quiet.sh > "$DX_STACK_EVIDENCE/$prefix/host-after.txt" 2>&1 || true
 if [[ $held == true ]]; then rm "$lock/owner.json"; rmdir "$lock"; fi
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
held=true; printf '{"id":"DX-N1","pid":%s}\n' "$$" > "$lock/owner.json"
node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),1140000)' "$$" & timer=$!
sh lab/bin/host-quiet.sh > "$DX_STACK_EVIDENCE/$prefix/host-before.txt" 2>&1 || true
export DX_TX_HEAP=3g DX_TX_MEMORY=4g DX_OBJECT_CACHE=1g DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g DX_PG_MEMORY=2g
export DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g
export DX_DRIVER_ENV='TRIPLEX_DATOMIC_LAYOUT=lean'
for repeat in 1 2; do
 for arm_kind in vm native; do
  next_prefix=$prefix-$arm_kind-$repeat
  [[ ! -e $NATIVE/runs/$next_prefix && ! -e $DX_STACK_EVIDENCE/$next_prefix ]] || { echo "use a fresh prefix" >&2; exit 2; }
  for role in pg tx gw-w gw-r; do
    if docker container inspect "$next_prefix-$role" >/dev/null 2>&1; then echo "container already exists" >&2; exit 2; fi
  done
  arm_prefix=$next_prefix
  resources
  mkdir -p "$DX_STACK_EVIDENCE/$arm_prefix"
  sh lab/bin/host-quiet.sh > "$DX_STACK_EVIDENCE/$arm_prefix/host-before.txt" 2>&1 || true
  if [[ $arm_kind == vm ]]; then
   unset TX2_NATIVE_PIDS DX_N1_OUTPUT TX2_NATIVE_RUN_DIR
   bash lab/experiments/EXP-DX1/stack/up.sh "$arm_prefix" --no-publish --cpus-pg 0 --cpus-tx 0,1 --cpus-gw-write 1 --cpus-gw-read 2,3 --gw-java-opts '-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=25 -Ddatomic.objectCacheMax=1g' --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_buffers=64MB' > "$DX_STACK_EVIDENCE/$arm_prefix/up.log" 2>&1
   node "$HERE/command.mjs" bash lab/experiments/EXP-DX1/stack/run-in-vm.sh "$arm_prefix" --cpus 4,5,6,7 --memory 5g -- bash "$HERE/matched-client.sh" > "$DX_STACK_EVIDENCE/$arm_prefix/client.log" 2>&1 & client=$!
  else
   bash "$HERE/up.sh" "$arm_prefix" > "$DX_STACK_EVIDENCE/$arm_prefix/up.log" 2>&1 & supervisor=$!
   run=$NATIVE/runs/$arm_prefix
   for ((i=0;i<240;i++)); do [[ ! -f $run/ready.json ]] || break; kill -0 "$supervisor" 2>/dev/null || exit 1; sleep 1; done
   [[ -f $run/ready.json ]] || exit 1
   python3 - "$run/ready.json" "$DX_STACK_EVIDENCE/$prefix-vm-$repeat/stack.json" <<'PYVERIFY'
import json,sys
native=json.load(open(sys.argv[1])); vm=json.load(open(sys.argv[2]))
assert native['originalGatewaySourceHash']==vm['gatewaySourceSha256'], 'gateway business source differs between matched arms'
PYVERIFY
   export DATOMIC_URL=http://127.0.0.1:28403 DATOMIC_READ_URLS=http://127.0.0.1:28404 TRIPLEX_DATOMIC_LAYOUT=lean
   export DX_N1_OUTPUT=$run/driver
   export TX2_NATIVE_PIDS=$(python3 -c 'import json,sys; print(json.dumps({k:v["pid"] for k,v in json.load(open(sys.argv[1]))["pids"].items()}))' "$run/ready.json")
   mkdir "$run/driver"; python3 "$HERE/bind.py" "$run"
   /usr/sbin/taskpolicy -d default -t 0 -l 0 node "$HERE/command.mjs" bash "$HERE/matched-client.sh" > "$run/client.log" 2>&1 & client=$!
   /usr/sbin/taskpolicy -B -p "$client"
   ps -o pid,ppid,stat,ni,flags,command -p "$client" > "$run/client-policy.txt"
  fi
  wait "$client"; client=
  stop_arm
  sh lab/bin/host-quiet.sh > "$DX_STACK_EVIDENCE/$arm_prefix/host-after.txt" 2>&1 || true
  arm_prefix=
 done
done
