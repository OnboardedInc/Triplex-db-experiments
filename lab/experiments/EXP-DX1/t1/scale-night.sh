#!/usr/bin/env bash
# [DX-T1-15] Why: the explicit 24-GiB campaign keeps one lease through all three stages and the return to 16 GiB.
# Rejected: dropping the lease between arms, using the default VM, or treating an attempted restore as read-back.
set -euo pipefail
mode=${1:---plan}; tag=${2:-tx2-dxt1-scale-night}; night_date=${3:-}
[[ $# -le 3 && $tag =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
[[ -z $night_date || $night_date =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || exit 2
t1=lab/experiments/EXP-DX1/t1
stack=lab/experiments/EXP-DX1/stack
if [[ $mode == --plan ]]; then
  printf '%s\n' 'Plan only. Execute requires an explicitly selected night, a clean DX-T1 branch, and 28 GiB free.'
  printf '%s\n' 'Hold the measurement lease, verify 16 GiB / 8 CPUs on triplex2 and an idle daemon, then restart triplex2 at 24 GiB.'
  printf '%s\n' 'No default profile or Docker context change. Retain nohlt, eight CPUs, and the original Docker data mount discard setting.'
  printf '  %s-zero: 100000 subjects, 900s smoke with zero readers, compact journal.\n' "$tag"
  printf '  %s-reader: 100000 subjects, one reader isolate, up to 64 readers, exact local reads and independent oracle.\n' "$tag"
  printf '  %s-w0: 100000 subjects, activation from a fresh clone, full world and durable publication readback.\n' "$tag"
  printf '%s\n' 'Records go to private DX-T1 evidence. At 06:00 local begin cleanup and restore. On failure retain completed stages.'
  printf '%s\n' 'Read back 16 GiB, eight CPUs, nohlt, original disk mount and seal inventory before releasing the lease.'
  exit
fi
[[ $mode == --execute && -n $night_date && $(uname -s) == Darwin && ${DX_BARE_METAL:-0} == 0 ]] || exit 2
source "$stack/platform.sh"
unset DOCKER_CONTEXT
git diff --quiet && git diff --cached --quiet && [[ -z $(git ls-files --others --exclude-standard) ]] || {
  echo 'Commit all campaign source before admission.' >&2; exit 2;
}
[[ $(git branch --show-current) == exp/DX-T1-tracing ]] || { echo 'Run from the DX-T1 branch.' >&2; exit 2; }
source_sha=$(git rev-parse HEAD)
command -v colima >/dev/null
export DX_STACK_EVIDENCE=$DX_EVIDENCE_ROOT/DX-T1
out=$DX_STACK_EVIDENCE/$tag-session
lock=$DX_LAB_ROOT/locks/measure
umask 077
deadline=$(node --input-type=module - "$night_date" <<'JS'
import { checkNightWindow, nightWindow } from "./lab/experiments/EXP-DX1/t1/night-window.mjs";
const now = Date.now();
const window = nightWindow(now, process.argv[2]);
checkNightWindow(window, now, 360);
console.log(new Date(window.endAt - 45 * 60000).toISOString());
JS
)
mkdir "$out"
printf '%s\n' "$source_sha" > "$out/head.txt"
printf '%s\n' "$deadline" > "$out/cleanup-deadline.txt"
# [DX-T1-15] Why: stop an arm before morning and reserve time for cleanup and restoration, including lease wait.
# Rejected: starting a 100k seed near the end of the night based on the controller's initial check.
room() {
  node -e 'const [deadline,minutes]=process.argv.slice(1); if(Date.now()+Number(minutes)*60000>=Date.parse(deadline)){console.error("Insufficient time before the 06:00 local restore deadline");process.exit(75)}' "$deadline" "$1"
  python3 -c 'import shutil;assert shutil.disk_usage(".").free>=28*1024**3, "less than 28 GiB for 100k evidence and spill"'
}
while ! mkdir "$lock" 2>/dev/null; do room 315; sleep 5; done
child= timer= active= restore_needed=0
lease() {
  printf '{"id":"DX-T1","pid":%s,"kind":"scale-night","prefix":"%s","activeArm":"%s"}\n' "$$" "$tag" "$active" > "$lock/owner.part"
  mv "$lock/owner.part" "$lock/owner.json"
}
default_context() {
  # Docker uses this client setting only when no explicit host is supplied. Read it without opening another daemon.
  python3 - <<'PY_CONTEXT'
import json,os,pathlib
p=pathlib.Path(os.environ.get("DOCKER_CONFIG",str(pathlib.Path.home()/".docker")))/"config.json"
assert not p.is_file() or json.loads(p.read_text()).get("currentContext","default") in ("","default"), "Global Docker context is not default"
PY_CONTEXT
}
no_running() {
  local names
  names=$(docker ps -q) || return
  [[ -z $names ]]
}
restart_isolated() {
  local ids policy id
  no_running || return
  ids=$(docker ps -aq) || return
  for id in $ids; do
    policy=$(docker container inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$id") || return
    # [DX-T1-15] Why: an always-restart resident can reappear after the daemon restart even when stopped now.
    # Rejected: stopping a resident as part of restoration or proceeding with a known auto-start conflict.
    [[ $policy != always ]] || return 1
  done
}
signatures() {
  docker volume inspect --format '{{.Name}} {{.Driver}} {{.CreatedAt}}' \
    tx2-dxh5-seed-1000-pg-data tx2-dxh8-seed-10000-pg-data tx2-dxs5-seed-100000-pg-data
}
mount_options() {
  colima ssh --profile triplex2 -- findmnt -n -o OPTIONS -M /var/lib/docker
}
has_discard() { [[ ",$1," == *,discard,* ]]; }
verify_guest() {
  local wanted=$1 out_file=$2
  docker info --format '{{.NCPU}} {{.MemTotal}}' > "$out_file" || return
  python3 - "$out_file" "$wanted" <<'PY' || return
import sys
n, mem = map(int,open(sys.argv[1]).read().split())
wanted=int(sys.argv[2]); assert n==8 and (wanted-1)*1024**3 <= mem <= wanted*1024**3, (n,mem,wanted)
PY
  colima ssh --profile triplex2 -- grep -qw nohlt /proc/cmdline || return
  signatures > "$out_file.seeds" || return
  cmp -s "$out/seeds-before.txt" "$out_file.seeds"
}
resize() {
  local wanted=$1 running_mount
  # [DX-T1-15] Why: change only the named profile's runtime RAM; the saved profile and global Docker context stay intact.
  # Rejected: global docker context use, disk growth, or stopping a resident to make room.
  if docker info >/dev/null 2>&1; then
    no_running || return 1
    colima stop --profile triplex2 || return
  fi
  colima start --profile triplex2 --cpus 8 --memory "$wanted" --activate=false --save-config=false || return
  running_mount=$(mount_options) || return
  if has_discard "$mount_before" && ! has_discard "$running_mount"; then
    colima ssh --profile triplex2 -- sudo mount -o remount,discard /var/lib/docker || return
  elif ! has_discard "$mount_before" && has_discard "$running_mount"; then
    colima ssh --profile triplex2 -- sudo mount -o remount,nodiscard /var/lib/docker || return
  fi
  running_mount=$(mount_options) || return
  printf '%s\n' "$running_mount" > "$out/mount-$wanted.txt" || return
  if has_discard "$mount_before"; then has_discard "$running_mount" || return
  else ! has_discard "$running_mount" || return
  fi
  verify_guest "$wanted" "$out/guest-$wanted.txt" && default_context
}
inventory() {
  bash "$stack/up.sh" "$1" --inventory > "$out/${1#"$tag-"}-remaining.txt" &&
    [[ ! -s $out/${1#"$tag-"}-remaining.txt ]]
}
cleanup() {
  local rc=$?
  trap - EXIT
  trap '' TERM INT
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true; wait "$child" || true; fi
  if [[ -n $timer ]]; then kill "$timer" 2>/dev/null || true; wait "$timer" 2>/dev/null || true; fi
  if [[ -n $active ]] && ! inventory "$active"; then
    echo 'An owned stage still has resources or could not be inventoried. Retaining lease for orchestrator recovery.' | tee "$out/recovery-needed.txt" >&2
    exit 1
  fi
  if [[ $restore_needed == 1 ]] && ! resize 16 >> "$out/resize.log" 2>&1; then
    echo '16-GiB restoration did not verify. Retaining lease for orchestrator recovery.' | tee "$out/recovery-needed.txt" >&2
    exit 1
  fi
  rm -f "$lock/owner.json" "$lock/owner.part"
  rmdir "$lock"
  printf '%s\n' "$rc" > "$out/exit.txt"
  printf 'Campaign exit %s. Evidence %s\n' "$rc" "$out"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
lease
room 315
default_context
restart_isolated || { echo 'Triplex2 must be idle before a resize, with no always-restart containers.' >&2; exit 75; }
for name in "$tag-zero" "$tag-reader" "$tag-w0"; do
  [[ ! -e $DX_STACK_EVIDENCE/$name ]] && inventory "$name" || exit 2
done
signatures > "$out/seeds-before.txt"
verify_guest 16 "$out/guest-before.txt"
mount_before=$(mount_options)
[[ -n $mount_before ]] || exit 2
printf '%s\n' "$mount_before" > "$out/mount-before.txt"
restore_needed=1
resize 24 >> "$out/resize.log" 2>&1
no_running || { echo 'A container started during the VM restart.' >&2; exit 75; }
(trap - EXIT TERM INT; exec node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),Math.max(0,Date.parse(process.argv[2])-Date.now()))' "$$" "$deadline") & timer=$!
export DX_SCALE_NIGHT_LEASE_PID=$$ DX_ACTIVATION_STOP_AT=$deadline
export DX_NS_PROFILE=smoke DX_COMPILER_POLICY=early TRIPLEX_TRACE_LEVEL=summary DX_PG_CENSUS=0
unset DX_NIGHT_WINDOW DX_BOUNDED_MEMORY_TRIAL TRIPLEX_TRACE_COMPONENTS DX_R3_PAIR_LEASE_PID DX_PAIR_LEASE_ID
session_rc=0
stage() {
  local suffix=$1 minutes=$2 rc=0
  shift 2
  room "$minutes"
  [[ $(git rev-parse HEAD) == "$source_sha" ]] && git diff --quiet && git diff --cached --quiet || exit 2
  active=$tag-$suffix
  lease
  (trap - EXIT TERM INT; exec "$@") > "$out/$suffix.log" 2>&1 & child=$!
  wait "$child" || rc=$?
  child=
  printf '%s\n' "$rc" > "$out/$suffix.exit"
  printf '%s exit %s\n' "$active" "$rc"
  inventory "$active" || exit 1
  active=
  lease
  if [[ $rc != 0 ]]; then session_rc=$rc; fi
}
stage zero 90 bash "$t1/run.sh" real "$tag-zero" --rung 100k --zero-readers --match-duration-s 900 --seed-budget-s 10800 --writer-deadline-ms 600000
stage reader 90 bash "$t1/run.sh" real "$tag-reader" --rung 100k --reader-threads 1 --max-readers 64 --reader-ladder-only --level-s 30 --match-duration-s 200 --seed-budget-s 10800
stage w0 120 bash "$t1/activation.sh" --execute "$tag-w0" 100000 clone no-live
exit "$session_rc"
