#!/usr/bin/env bash
# [DX-S4] Why: every owned container lives inside a bounded quiet window. Rejected: concurrent size runs (disturb latency peers).
set -euo pipefail
prefix=${1:?tx2-dxs4-PREFIX}; shift
[[ $prefix =~ ^tx2-dxs4-[a-z0-9-]+$ ]] || exit 2
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export S4_PREFIX=$prefix S4_EVIDENCE=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S4
export S4_INPUT=${S4_INPUT:-$S4_EVIDENCE/input}
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
mkdir -p "$S4_EVIDENCE/$prefix"
out=$S4_EVIDENCE/$prefix
[[ ! -e $out/started.txt ]] || { echo "fresh attempt prefix required" >&2; exit 2; }
timer= worker= held=false
cleanup() {
 rc=$?; trap - EXIT TERM INT
 [[ -z $worker ]] || { kill -KILL -- "-$worker" 2>/dev/null || kill -KILL "$worker" 2>/dev/null || true; }
 [[ -z $timer ]] || { kill "$timer" 2>/dev/null || true; wait "$timer" 2>/dev/null || true; }
 for c in $(docker ps -a --filter "name=^/${prefix}-" --format '{{.Names}}'); do
  docker logs "$c" > "$out/$c.log" 2>&1 || true
  docker stop -t 10 "$c" >> "$out/cleanup.log" 2>&1 || true
  docker rm -f "$c" >> "$out/cleanup.log" 2>&1 || true
 done
 for v in $(docker volume ls --filter "name=^${prefix}-" --format '{{.Name}}'); do docker volume rm "$v" >> "$out/cleanup.log" 2>&1 || true; done
 for n in $(docker network ls --filter "name=^${prefix}-" --format '{{.Name}}'); do docker network rm "$n" >> "$out/cleanup.log" 2>&1 || true; done
 docker ps -a --filter "name=^/${prefix}-" --format '{{.Names}}' > "$out/remaining-containers.txt"
 docker volume ls --filter "name=^${prefix}-" --format '{{.Name}}' > "$out/remaining-volumes.txt"
 docker network ls --filter "name=^${prefix}-" --format '{{.Name}}' > "$out/remaining-networks.txt"
 if [[ -s $out/remaining-containers.txt || -s $out/remaining-volumes.txt || -s $out/remaining-networks.txt ]]; then echo 'cleanup incomplete; retaining lock' >&2; exit 1; fi
 date -u +%FT%TZ > "$S4_EVIDENCE/last-release"
 printf '{"exit":%s,"finishedAt":"%s"}\n' "$rc" "$(date -u +%FT%TZ)" > "$out/exit.json"
 if $held; then rm "$lock/owner.json"; rmdir "$lock"; fi
 exit "$rc"
}
# [DX-S4] Why: rest is between our holds, including separate invocations. Rejected: an in-memory timer (lost on exit).
python3 - "$S4_EVIDENCE/last-release" <<'PY'
import pathlib,datetime,time,sys
p=pathlib.Path(sys.argv[1])
if p.exists():
 wait=120-(datetime.datetime.now(datetime.timezone.utc)-datetime.datetime.fromisoformat(p.read_text().strip().replace('Z','+00:00'))).total_seconds()
 if wait>0: print(f'DX-S4 resting {wait:.0f}s',file=sys.stderr); time.sleep(wait)
PY
# [DX-S4] Why: recheck cooldown after acquisition as well as before waiting. Rejected: two concurrent invocations bypassing the two-minute rest.
rest_remaining() {
 python3 - "$S4_EVIDENCE/last-release" <<'PYREST'
import pathlib,datetime,sys,math
p=pathlib.Path(sys.argv[1]);wait=0
if p.exists():wait=120-(datetime.datetime.now(datetime.timezone.utc)-datetime.datetime.fromisoformat(p.read_text().strip().replace('Z','+00:00'))).total_seconds()
print(max(0,math.ceil(wait)))
PYREST
}
here=$(cd "$(dirname "$0")" && pwd)
while true; do
 if [[ ! -d $lock && $(rest_remaining) == 0 ]]; then
  # [DX-S4] Why: record the requested host sample before each hold. Rejected: interpreting missing ps/sysctl fields as a quiet host.
  quiet_rc=0
  sh "$here/host-quiet.sh" > "$out/host-quiet.json" 2> "$out/host-quiet.stderr" || quiet_rc=$?
  printf '%s\n' "$quiet_rc" > "$out/host-quiet.exit"
  python3 - "$out/host-quiet.json" <<'PYQUIET'
import json,sys
x=json.load(open(sys.argv[1]));assert isinstance(x['otherCpuPercent'],(int,float)) and isinstance(x['swapUsedMB'],(int,float))
PYQUIET
  df -k /System/Volumes/Data > "$out/df-before-hold.txt"
  python3 - "$out/df-before-hold.txt" <<'PYDISK'
import sys
assert int(open(sys.argv[1]).read().splitlines()[-1].split()[3])*1024 >= 15*1024**3,'Data volume below 15 GiB free'
PYDISK
 else
  sleep 5; continue
 fi
 if mkdir "$lock" 2>/dev/null; then
  if [[ $(rest_remaining) == 0 ]]; then break; fi
  rmdir "$lock"
 fi
 sleep 5
done
held=true
printf '{"id":"DX-S4","pid":%s}\n' "$$" > "$lock/owner.json"
trap cleanup EXIT
trap 'exit 124' TERM INT
here=$(cd "$(dirname "$0")" && pwd)
date -u +%FT%TZ > "$out/started.txt"
mkdir "$out/source"
cp "$here/"*.sh "$here/"*.py "$here/"*.sql "$here/"*.clj "$here/"*.mjs "$here/"*.yaml "$out/source/"
git rev-parse HEAD > "$out/source-head.txt"
(
 deadline=$((SECONDS+530))
 while ((SECONDS<deadline)); do
  sleep 10
  # [DX-S4] Why: batch component prefixes also own volume bytes. Rejected: monitoring only the parent name (misses sequential batch stores).
  used=0
  for c in $(docker ps -a --filter "name=^/${prefix}-" --format '{{.Names}}'); do
   case $c in
    *-pg) path=/var/lib/postgresql/data;;
    *-xtdb) path=/var/lib/xtdb;;
    *-indexer|*-qlever) path=/data;;
    *) continue;;
   esac
   k=$(docker exec "$c" du -sk "$path" 2>/dev/null | awk '{print $1}') || k=0
   used=$((used+${k:-0}))
  done
  if [[ ${used:-0} -gt 5500000 ]]; then echo 'disk watchdog: volume above 5.5 GB' >> "$out/watchdog.log"; kill -TERM $$; exit; fi
 done
 echo 'hold deadline' >> "$out/watchdog.log"; kill -TERM $$
) & timer=$!
python3 - "$out" <<'PY'
import shutil,json,datetime,pathlib,sys
free=int(__import__('subprocess').check_output(['df','-k','/System/Volumes/Data'],text=True).splitlines()[-1].split()[3])*1024
pathlib.Path(sys.argv[1],'admission.json').write_text(json.dumps({'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'free_bytes':free,'minimum_free_bytes':15*1024**3,'admitted':free>=15*1024**3})+'\n')
assert free>=15*1024**3, 'host disk under 15 GiB'
PY
docker image inspect postgres:17-alpine > "$out/images.json"
# [DX-S4] Why: execute the retained controller preimages, not mutable working files. Rejected: source hashes without the actual source bytes used.
if [[ $1 == bash && -f "$out/source/$(basename "$2")" ]]; then set -- bash "$out/source/$(basename "$2")" "${@:3}"; fi
set -m
"$@" & worker=$!
wait "$worker"
worker=
