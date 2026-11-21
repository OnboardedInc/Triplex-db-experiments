#!/usr/bin/env bash
# [DX-BM1] Why: isolate the roster, setup, and deadline fence in the dedicated bench unit.
# Rejected: keeping a failed fixture running or counting later seed verification as meeting the cutoff.
set -euo pipefail
mode=${1:?}
root=${2:?}
unit=${DX_BM1_PRIORITY_UNIT:?}
case $unit in
  bm1n21-publish-priority) prefix=tx2-dxt1-bm1-priorityn21 ;;
  bm1n21-publish-retry) prefix=tx2-dxt1-bm1-priorityn21r ;;
  bm1n21-publish-final) prefix=tx2-dxt1-bm1-priorityn21f ;;
  bm1n21-publish-roster) prefix=tx2-dxt1-bm1-priorityn21s ;;
  *) exit 2 ;;
esac
source_pin=0196b9952e496c883a24b9ed05ef17fa886dfb00
until_seed=2026-11-21T08:15:00Z
base=/var/tmp/triplex-bm1
repo=$root/build/repository
control=$root/control
[[ $root == "$base/day-n21/publish-priority" ]]
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1 DX_BARE_METAL_ROOT="$root/state"
export DX_STACK_EVIDENCE="$root/engine" DX_STACK_WAIT_FOR_TRANSACTOR=1 TRIPLEX_TRACE_LEVEL=off
export TRIPLEX_DATOMIC_LAYOUT=lean DX_QUIET_LOGS=1 DX_LIVE_PRIORITY=1 DX_FIELD_COALESCE=0 DX_PREDECESSOR_LOOKUP=0
export TX2_SWEEP_STRICT=1 TX2_W0_POINT_JOURNAL=1 TX2_W0_RESTORE_INDEXED_JOURNAL=1
export DX_GW_WRITE_MEMORY=5g DX_GW_READ_MEMORY=5g
gc=-Xlog:gc*,safepoint:stdout:time,uptime,level,tags
export DX_GW_WRITE_JAVA_OPTS="-Xms256m -Xmx4g -XX:+UseG1GC $gc"
export DX_GW_READ_JAVA_OPTS="-Xms256m -Xmx4g -XX:+UseG1GC $gc"
export PATH="$root/build/tools/bin:$PATH"
status() {
  local tmp="$base/.priorityn21-status"
  printf 'item=publish-priority state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$tmp"
  mv "$tmp" "$base/STATUS"
}
[[ $(systemd-detect-virt) == none ]]
if [[ $mode == cleanup ]]; then
  if [[ -f $root/owned ]]; then
    [[ $(cat "$root/owned") == "$source_pin" ]]
    cd "$repo"
    for role in pg tx gw-w gw-r; do
      docker logs --timestamps "$prefix-$role" > "$root/$role.log" 2>&1 || true
    done
    timeout 90 bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes || {
      status cleanup-failed operator-review
      exit 1
    }
    bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$root/remaining.txt"
    [[ ! -s $root/remaining.txt ]]
    rm -- "$root/owned"
  fi
  if [[ -f $root/full/collected.json ]]; then
    status measured collect
  elif [[ -f $root/seed-cutoff.txt ]]; then
    status seed-cutoff collect
  else
    status incomplete collect
  fi
  exit
fi
[[ $mode == run ]]
# [DX-BM1] Why: preparation runs separately so a failed image build cannot hold a database stack.
# Rejected: inferring readiness from an existing clone or a mutable image tag alone.
while systemctl is-active --quiet bm1n21-publish-build-final; do sleep 5; done
[[ $(cat "$root/build/results/bootstrap.exit") == 0 ]]
df -BG /var/tmp | awk 'NR==2 {exit ($4+0 < 5)}'
cd "$repo"
[[ $(git rev-parse HEAD) == "$source_pin" && -z $(git status --porcelain --untracked-files=no) && -z $(docker ps -q) ]]
sha256sum "$control"/publish-{overlay.py,priority.ts,priority.sh} > "$root/control-hashes.txt"
export TX2_CONFIG_DIR=$repo
export DX_WRITE_OPTIONS_ATTEMPT="$(cat /proc/sys/kernel/random/uuid)"
export TX2_WRITE_OPTIONS_ATTEMPT=$DX_WRITE_OPTIONS_ATTEMPT
export TRIPLEX_TRACE_SOURCE=$source_pin TRIPLEX_TRACE_SLOT=$prefix TRIPLEX_TRACE_RUN=$prefix
mkdir -p "$DX_STACK_EVIDENCE" "$DX_BARE_METAL_ROOT/locks" "$root/order" "$root/small" "$root/full"
python3 "$control/publish-overlay.py" "$repo"
runner=lab/experiments/EXP-DX1/actv-lazy/join/bm1-priority.ts
node --experimental-strip-types --check "$runner"
printf '%s\n' "$source_pin" > "$root/owned"
status startup native-order-and-small
bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --no-publish --cpus-tx 0 --cpus-pg 1 --cpus-gw-write 2 --cpus-gw-read 4 \
  --pg-memory 6g --tx-memory 8g --tx-java-opts "-Xms256m -Xmx6g -XX:+UseG1GC $gc"
addr() {
  docker inspect --format "{{(index .NetworkSettings.Networks \"$prefix-net\").IPAddress}}" "$prefix-$1"
}
export DATOMIC_URL="http://$(addr gw-w):8080"
export DATOMIC_READ_URLS="http://$(addr gw-r):8080"
export TRIPLEX_LAB_SLOT_OWNER=$root/owner.json
[[ $(docker exec "$prefix-pg" psql -U postgres -Atc "SELECT current_setting('fsync'), current_setting('synchronous_commit'), current_setting('full_page_writes')") == 'on|on|on' ]]
python3 - "$source_pin" "$prefix" "$root" <<'PY'
import json, os, subprocess, sys
from pathlib import Path
source, prefix, root = sys.argv[1:]
root = Path(root)
roles = ("pg", "tx", "gw-w", "gw-r")
items = json.loads(subprocess.check_output(["docker", "inspect", *(prefix+"-"+role for role in roles)]))
assert len(items) == len({item["Id"] for item in items}) == len(roles)
assert all(item["Name"] == "/"+prefix+"-"+role and item["State"]["Running"] for role,item in zip(roles,items))
volume = prefix+"-pg-data"
assert any(m.get("Name") == volume for m in items[0]["Mounts"])
assert os.environ["DATOMIC_URL"] != os.environ["DATOMIC_READ_URLS"]
root.joinpath("owner.json").write_text(json.dumps(dict(mode="exclusive", source=source, prefix=prefix,
    container=prefix+"-gw-w", endpoint=os.environ["DATOMIC_URL"], volume=volume,
    roles={role:item["Id"] for role,item in zip(roles,items)}))+"\n")
root.joinpath("topology.json").write_text(json.dumps({role:dict(cpus=item["HostConfig"]["CpusetCpus"],
    memory=item["HostConfig"]["Memory"], image=item["Image"]) for role,item in zip(roles,items)})+"\n")
PY
status preflight seed
node lab/bin/heavy.mjs --label DX-BM1-priority-order -- node --experimental-strip-types "$runner" order "$root/order" 64 2
node lab/bin/heavy.mjs --label DX-BM1-priority-small -- node --experimental-strip-types "$runner" produce "$root/small" 64 2
node --experimental-strip-types "$runner" collect "$root/small" 64 2
status building-roster measure
remaining=$(( $(date -u -d "$until_seed" +%s) - $(date -u +%s) ))
(( remaining > 0 ))
# [DX-BM1] Why: the fence keeps the same native process and its seed in memory after it seals.
# Rejected: giving the seed-only timer authority to stop a measurement whose seed already verified.
node lab/bin/heavy.mjs --label DX-BM1-priority25k -- node --experimental-strip-types "$runner" produce "$root/full" 25000 30 &
measurement=$!
(
  sleep "$remaining"
  if [[ ! -s $root/full/seed-verified.json ]]; then
    date -u +%FT%TZ > "$root/seed-cutoff.txt"
    systemctl stop "$unit"
  fi
) &
fence=$!
while kill -0 "$measurement" 2>/dev/null && [[ ! -s $root/full/seed-verified.json ]]; do sleep 5; done
if [[ -s $root/full/seed-verified.json ]]; then status measuring collect; fi
wait "$measurement"
kill "$fence" 2>/dev/null || true
node --experimental-strip-types "$runner" collect "$root/full" 25000 30
