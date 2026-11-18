#!/usr/bin/env bash
# [DX-BM1] Why: independent terminal items stay sealed and the next item can start after a clean failure.
# Rejected: SSH-bound arms, overlapping timed runs, or trusting an exit code as a performance verdict.
set -euo pipefail
mode=${1:---plan}
if [[ $mode == --plan ]]; then
  printf '%s\n' 'Wait for first v3 pair; seal its evidence; fixed gaps; latest pushed 100k zero/reader/activation; second v3 pair; WAL A/B if the deadline allows.'
  printf '%s\n' 'Resume repeats the failed loaded arm. Continue takes over after the already-started 100k zero arm and uses the patched source for the two full pairs.'
  exit
fi
[[ ( $mode == --run || $mode == --resume || $mode == --continue ) && $# == 4 && $EUID == 0 &&
  $(uname -s) == Linux && $(systemd-detect-virt) == none ]] || exit 2
root=/var/tmp/triplex-bm1
first=$root/first-b
batch=${2:?new batch id}
first_source=${3:?named first study source}
stop=${4:?UTC cutoff}
[[ $batch =~ ^[a-z0-9]{1,12}$ && $first_source =~ ^[a-f0-9]{40}$ &&
  $stop =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || exit 2
cutoff=$(date -u -d "$stop" +%s)
runner=$(cd "$(dirname "$0")" && pwd)
queue_dir=$root/queue-$batch
mkdir "$queue_dir"
logs=$queue_dir/logs
mkdir "$logs"
runner_source=$(git -C "$runner" rev-parse HEAD)
printf '%s\n' "$runner_source" > "$logs/runner-source.txt"
origin=https://github.com/OnboardedInc/Triplex-db-experiments.git
prefix=tx2-dxt1-bm1-$batch
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
export DOCKER_HOST=unix:///var/run/docker.sock DEBIAN_FRONTEND=noninteractive TURBO_TELEMETRY_DISABLED=1
export DX_COMPILER_POLICY=early DX_NATIVE_GATES=0 DX_CPUS_DRIVER=3,5,6,7 DX_WORKER_CPUS=5,6,7
export DX_BARE_METAL=1 TRIPLEX_BENCH_SPILL_MAX_BYTES=137438953472
unset DX_NIGHT_WINDOW DX_IDLE_SENTINEL DX_IDLE_REFUSAL_PROBE DX_IDLE_TCP TRIPLEX_TRACE_COMPONENTS
t1=lab/experiments/EXP-DX1/t1
system_path=$PATH

use_checkout() {
  work=$1
  export PATH="$work/tools/bin:$system_path"
  export DX_BARE_METAL_ROOT=$work/state DOCKER_CONFIG=$work/docker-config
  export DX_STACK_EVIDENCE=$DX_BARE_METAL_ROOT/evidence/DX-T1 TRIPLEX_TRACE_EVIDENCE=$DX_BARE_METAL_ROOT/evidence
  unset DX_ORACLE_ROOT
  cd "$work/repository"
}

stamp() { date -u '+%FT%TZ'; }

seal() {
  local tag=$1 run=$2
  shift 2
  [[ -d $run && ! -e "$root/bundles/$tag" ]] || return 0
  # [DX-BM1] Why: compress terminal evidence before starting the next measured item, on unassigned cores.
  # Rejected: allowing checksums/compression to compete with the pinned timed roles.
  taskset -c 9,10,11 bash "$runner/bundle.sh" "$root" "$tag" "$run" "$@" ||
    printf '%s archive error %s\n' "$(stamp)" "$tag" >&2
}

run_step() {
  local tag=$1 requested_max=$2 minimum=$3 directory=$4
  shift 4
  local log=$logs/$tag.log exit_file=$logs/$tag.exit
  local remaining=$((cutoff - $(date +%s) - 180)) rc=0
  if ((remaining < minimum)); then
    printf 'Budget cutoff leaves %ss before cleanup; require %ss for %s\n' "$remaining" "$minimum" "$tag" > "$log"
    rc=75
  elif [[ -e $DX_BARE_METAL_ROOT/locks/measure ]] || [[ -n $(docker ps -q) ]]; then
    printf 'A prior holder still owns bench resources\n' > "$log"
    rc=75
  else
    if ((remaining > requested_max)); then remaining=$requested_max; fi
    printf '%s start %s max=%ss\n' "$(stamp)" "$tag" "$remaining"
    timeout --foreground --signal=TERM --kill-after=150s "${remaining}s" "$@" > "$log" 2>&1 || rc=$?
  fi
  printf '%s\n' "$rc" > "$exit_file"
  printf '%s exit %s %s\n' "$(stamp)" "$tag" "$rc"
  if [[ ! -e $DX_BARE_METAL_ROOT/locks/measure && -z $(docker ps -q) ]]; then
    seal "$tag" "$directory" "$log" "$exit_file"
  else
    printf '%s retained resources for %s; evidence not yet stable\n' "$(stamp)" "$tag" >&2
  fi
}

seal_study() {
  local tag=$1
  local suffix arm
  for suffix in off-before zero ladder off-after session; do
    arm=$tag-$suffix
    seal "$arm" "$DX_STACK_EVIDENCE/$arm"
  done
}

use_checkout "$first"
[[ $(git rev-parse HEAD) == "$first_source" ]]
python3 "$runner/smoke-check.py" "$DX_STACK_EVIDENCE/tx2-dxt1-native-smoke" "$first_source"
printf '%s waiting for first v3 study\n' "$(stamp)"
while [[ $(systemctl show triplex-bm1-study-a -p ActiveState --value) =~ ^(activating|active|deactivating|reloading)$ ]]; do
  if (( $(date +%s) + 780 >= cutoff )); then exit 75; fi
  sleep 600
done
systemctl show triplex-bm1-study-a -p ActiveState -p Result -p ExecMainStatus > "$logs/first-study-status.txt" || true
test ! -e "$DX_BARE_METAL_ROOT/locks/measure"
# [DX-BM1] Why: continuation is admitted while the prior batch's isolated scale child is still running.
# Rejected: require global quiescence before reaching the explicit wait for that child.
if [[ $mode != --continue ]]; then test -z "$(docker ps -q)"; fi
seal tx2-dxt1-bm1-smoke-a "$root/first/state/evidence/DX-T1/tx2-dxt1-native-smoke" \
  "$root/first/bootstrap.log" "$root/first-controller.log"
seal tx2-dxt1-bm1-smoke-b "$DX_STACK_EVIDENCE/tx2-dxt1-native-smoke" \
  "$first/bootstrap.log" "$root/first-b-controller.log"
seal_study tx2-dxt1-bm1-pair-a
seal tx2-dxt1-bm1-pair-a-controller "$DX_STACK_EVIDENCE/tx2-dxt1-bm1-pair-a-session" \
  "$root/study-a.log" "$logs/first-study-status.txt"

gap=$prefix-gaps
if [[ $mode == --continue ]]; then
  gap=tx2-dxt1-bm1-20261118-gaps
elif [[ $mode == --resume ]]; then
  gap=tx2-dxt1-bm1-20261118-gaps
  seal "$gap" "$DX_STACK_EVIDENCE/$gap" "$root/queue-20261118/logs/$gap.log"
else
  run_step "$gap" 1800 900 "$DX_STACK_EVIDENCE/$gap" \
    env DX_NS_PROFILE=smoke TRIPLEX_TRACE_LEVEL=full bash "$t1/run.sh" real "$gap" --rung 10k \
    --zero-readers --reader-ladder-only --max-readers 0 --idle-keep none --probe10-per-s 0 \
    --idle-gaps-ms 10,250,1000 --idle-commits 150 --idle-warmup-commits 0
fi
if [[ $mode != --continue && -s $DX_STACK_EVIDENCE/$gap/driver/ns-report.json ]]; then
  gap_reading=$queue_dir/gap-reading
  mkdir "$gap_reading"
  python3 "$runner/gap-reading.py" "$DX_STACK_EVIDENCE/$gap" \
    > "$gap_reading/ACK-GAPS.json" 2> "$logs/$gap.analysis.log" || true
  seal "$gap-reading" "$gap_reading" "$logs/$gap.analysis.log"
fi

# [DX-BM1] Why: the rental has room for the reader cache growth and the untimed renderer.
# Rejected: shortening the v3 schedule or losing the first 8-GiB OOM receipt.
retry_driver_memory=32g
renderer_heap=--max-old-space-size=24576
if [[ $mode == --resume ]]; then
  zero_dir=$DX_STACK_EVIDENCE/tx2-dxt1-bm1-pair-a-zero
  retry=$prefix-retry-ladder
  retry_dir=$DX_STACK_EVIDENCE/$retry
  if (cd "$zero_dir"; grep -E '  driver/ns-(report.json|writes.jsonl)$' SHA256SUMS | sha256sum -c); then
    mkdir -p "$retry_dir/input"
    cp "$zero_dir"/driver/ns-{report.json,writes.jsonl} "$retry_dir/input/"
    grep -E '  driver/ns-(report.json|writes.jsonl)$' "$zero_dir/SHA256SUMS" > "$retry_dir/zero-input.SHA256SUMS"
    duration=$(node --import tsx lab/bench/plan.ts --seconds --strict)
    run_step "$retry" 14400 6900 "$retry_dir" \
      env DX_NS_PROFILE=v3 TRIPLEX_TRACE_LEVEL=summary TRIPLEX_TRACE_SESSION="$prefix-retry" \
      DX_DRIVER_MEMORY="$retry_driver_memory" NODE_OPTIONS="$renderer_heap" \
      bash "$t1/run.sh" real "$retry" --rung 10k --match-duration-s "$duration" \
      --baseline-writes "$retry_dir/input/ns-writes.jsonl"
  else
    printf '%s retry refused: original baseline bytes do not match the seal\n' "$(stamp)" >&2
  fi
fi

remembered_images=$logs/first-images.txt
python3 - "$first/results/images.json" > "$remembered_images" <<'PY'
import json
import sys
images = json.load(open(sys.argv[1]))
for tag in ('tx2-datomic:1.0.7745-da00', 'node:22.23.2-bookworm-slim', 'postgres:17-alpine'):
    (image,) = (i for i in images if tag in i['RepoTags'])
    print(image['Id'], tag)
PY

prepare_scale() {
  # [DX-BM1] Why: record the public tracing ref as it stands when scale actually starts.
  # Rejected: importing an unpublished Mac worktree or guessing that a fix already reached origin.
  local ref=refs/heads/exp/DX-T1-tracing line sha oid
  line=$(git ls-remote --exit-code "$origin" "$ref") || return
  sha=${line%%$'\t'*}
  [[ $sha =~ ^[0-9a-f]{40}$ ]] || return 2
  printf '%s\n%s\n' "$(stamp)" "$line" > "$logs/scale-upstream.txt"
  run_step "$prefix-scale-setup" 3600 900 "$queue_dir/scale/results" \
    bash "$runner/../t1/bare-metal.sh" --prepare "$sha" "$queue_dir/scale"
  [[ $(cat "$logs/$prefix-scale-setup.exit") == 0 ]] || return 1
  use_checkout "$queue_dir/scale" || return
  [[ $(git rev-parse HEAD) == "$sha" ]] || return 2
  for oid in b96b1062 eb053a65 f8054ba2; do
    if git merge-base --is-ancestor "$oid" "$sha" 2>/dev/null; then
      printf '%s included\n' "$oid"
    else
      printf '%s absent from this ref\n' "$oid"
    fi
  done >> "$logs/scale-upstream.txt"
  seal "$prefix-scale-upstream" "$queue_dir/scale/results" "$logs/scale-upstream.txt"
}

continue_scale() {
  # [DX-BM1] Why: let the running zero-reader child close before replacing its paused queue parent.
  # Rejected: stopping the measured arm or starting a second Docker stack during finalization.
  local unit=triplex-bm1-queue-resume.service
  local owner group upstream
  local prior=$root/queue-20261118r
  owner=$(systemctl show "$unit" -p MainPID --value) || return
  group=$(systemctl show "$unit" -p ControlGroup --value) || return
  [[ $owner =~ ^[1-9][0-9]+$ && $group == /* && $(ps -o stat= -p "$owner") == T* ]] || return 2
  cp "$prior/logs/scale-upstream.txt" "$logs/scale-upstream.txt" || return
  upstream=$(sed -n '2s/[[:space:]].*//p' "$logs/scale-upstream.txt") || return
  [[ $upstream =~ ^[a-f0-9]{40}$ && $(cat "$prior/scale/results/bootstrap.exit") == 0 ]] || return 2
  printf '%s waiting for old queue zero child to close\n' "$(stamp)"
  while grep -qvFx "$owner" "/sys/fs/cgroup$group/cgroup.procs"; do
    (( $(date +%s) + 780 < cutoff )) || return 75
    sleep 600
  done
  use_checkout "$prior/scale" || return
  [[ $(git rev-parse HEAD) == "$upstream" && ! -e $DX_BARE_METAL_ROOT/locks/measure && -z $(docker ps -q) ]] || return 2
  systemctl kill --kill-whom=main --signal=TERM "$unit" || return
  systemctl kill --kill-whom=main --signal=CONT "$unit" || true
  zero=tx2-dxt1-bm1-20261118r-scale-zero
  seal "$zero" "$DX_STACK_EVIDENCE/$zero" "$prior/logs/$zero.log" "$logs/scale-upstream.txt"
}

scale_ready=false
if [[ $mode == --continue ]]; then
  continue_scale || { echo 'Could not verify that the old zero-reader arm released the bench' >&2; exit 75; }
  scale_ready=true
elif prepare_scale; then
  scale_ready=true
fi
if [[ $scale_ready == true ]]; then
  zero=${zero:-$prefix-scale-zero}
  reader=$prefix-scale-reader
  scale_args=(--subjects 100000 --match-duration-s 900 --seed-budget-s 6900 --writer-deadline-ms 600000 --history-growth-subjects 4)
  scale_env=(DX_NS_PROFILE=smoke TRIPLEX_TRACE_LEVEL=full DX_DRIVER_MEMORY=24g
    DX_EXPECTED_RESIDENT_GIB=40 "NODE_OPTIONS=$renderer_heap")
  if [[ $mode != --continue ]]; then
    run_step "$zero" 9000 1800 "$DX_STACK_EVIDENCE/$zero" \
      env "${scale_env[@]}" bash "$t1/run.sh" real "$zero" --zero-readers "${scale_args[@]}"
  fi
  baseline=$DX_STACK_EVIDENCE/$zero/driver/ns-writes.jsonl
  matched=()
  if [[ -s $baseline ]] &&
    (cd "$(dirname "$(dirname "$baseline")")" &&
     [[ $(grep -Ec '  driver/ns-(report[.]json|writes[.]jsonl)$' SHA256SUMS) == 2 ]] &&
     grep -E '  driver/ns-(report[.]json|writes[.]jsonl)$' SHA256SUMS | sha256sum -c &&
     python3 -c 'import json; r=json.load(open("driver/ns-report.json")); assert r["status"]=="DONE" and r["seed"]["seededSubjects"]==100000 and r["seed"]["complete"]'); then
    mkdir -p "$DX_STACK_EVIDENCE/$reader/input"
    cp "$DX_STACK_EVIDENCE/$zero"/driver/ns-{report.json,writes.jsonl} "$DX_STACK_EVIDENCE/$reader/input/"
    matched=(--baseline-writes "$DX_STACK_EVIDENCE/$reader/input/ns-writes.jsonl")
  fi
  run_step "$reader" 9000 1800 "$DX_STACK_EVIDENCE/$reader" \
    env "${scale_env[@]}" bash "$t1/run.sh" real "$reader" "${scale_args[@]}" "${matched[@]}"
  for arm in "$zero" "$reader"; do
    run=$DX_STACK_EVIDENCE/$arm
    if [[ -s $run/trace-summary.json ]]; then
      mkdir "$run/scale-analysis"
      node lab/trace/scale-forensics.mjs "$run" "$run/scale-analysis/scale-forensics.json" \
        > "$run/scale-analysis/scale-forensics.log" 2>&1 || true
      node "$runner/scale-bands.mjs" "$run" > "$run/scale-analysis/scale-bands.json" \
        2> "$run/scale-analysis/scale-bands.log" || true
      seal "$arm-analysis" "$run/scale-analysis" "$logs/scale-upstream.txt"
    fi
  done
  activation=$prefix-activation
  install_python=$logs/python-image.log
  if docker pull --platform "linux/$(docker info --format '{{.Architecture}}' | sed 's/x86_64/amd64/;s/aarch64/arm64/')" python:3.13-slim > "$install_python" 2>&1; then
    run_step "$activation" 14400 1800 "$DX_STACK_EVIDENCE/$activation" \
      env DX_ACTIVATION_STOP_AT="$stop" DX_DRIVER_MEMORY=24g NODE_OPTIONS="$renderer_heap" \
      bash "$t1/activation.sh" --execute "$activation" 100000 seed live
  else
    printf '%s image pull failed %s\n' "$(stamp)" "$activation" >&2
  fi
else
  printf '%s scale preparation failed; preserving second pair\n' "$(stamp)" >&2
fi

use_checkout "$first"
[[ $(git rev-parse HEAD) == "$first_source" ]]
while read -r image_id image_name; do docker image tag "$image_id" "$image_name"; done < "$remembered_images"
suffixes=(b)
if [[ $mode != --run ]]; then suffixes+=(c); fi
if [[ $mode == --continue ]]; then
  # [DX-BM1] Why: both fresh comparisons need the larger-case oracle and streaming report writer.
  # Rejected: repeating a known renderer problem or using a different trace or threshold.
  run_step "$prefix-v3-setup" 3600 900 "$queue_dir/v3/results" \
    bash "$runner/../t1/bare-metal.sh" --prepare "$runner_source" "$queue_dir/v3"
  if [[ $(cat "$logs/$prefix-v3-setup.exit") == 0 ]]; then
    use_checkout "$queue_dir/v3"
    for file in lab/TARGETS.md lab/bench/lib/{phases,trace,verdict,verdict-plan,verdict-statistics}.ts; do
      [[ $(git rev-parse "HEAD:$file") == "$(git -C "$first/repository" rev-parse "HEAD:$file")" ]]
    done
    original=$first/state/evidence/DX-T1/tx2-dxt1-bm1-20261118r-retry-ladder
    render=$queue_dir/retry-render
    run_step "$prefix-retry-render" 1800 1200 "$render" env NODE_OPTIONS="$renderer_heap" \
      bash "$runner/recover-trace.sh" "$original" "$queue_dir/retry-render-inputs" "$render"
  else
    suffixes=()
  fi
fi
for suffix in "${suffixes[@]}"; do
  pair=$prefix-pair-$suffix
  run_step "$pair" 21600 13800 "$DX_STACK_EVIDENCE/$pair-session" \
    env DX_NS_PROFILE=v3 DX_DRIVER_MEMORY="$retry_driver_memory" NODE_OPTIONS="$renderer_heap" \
    bash "$t1/study.sh" "$pair"
  if [[ ! -e $DX_BARE_METAL_ROOT/locks/measure && -z $(docker ps -q) ]]; then seal_study "$pair"; fi
done

wal_ab() {
  local device=/dev/nvme1n1 mount_dir=$queue_dir/wal-ssd
  # [DX-BM1] Why: the optional experiment owns only the second blank drive named in the brief.
  # Rejected: auto-selecting a drive or destroying any existing partition, signature, or mounted data.
  [[ -b $device && $(findmnt -nro SOURCE /) == /dev/nvme0n1p2 &&
    $(lsblk -nr -o TYPE "$device") == disk && -z $(lsblk -nr -o MOUNTPOINTS "$device") &&
    -z $(ls -A /sys/class/block/nvme1n1/holders) ]] || return 2
  local signatures
  signatures=$(wipefs -n --noheadings "$device") || return
  [[ -z $signatures ]] || return 2
  local remaining=$((cutoff - $(date +%s)))
  ((remaining >= 15300)) || return 75
  run_step "$prefix-wal-setup" 1200 900 "$queue_dir/wal-source/results" \
    bash "$runner/../t1/bare-metal.sh" --prepare "$runner_source" "$queue_dir/wal-source"
  [[ $(cat "$logs/$prefix-wal-setup.exit") == 0 ]] || return 1
  use_checkout "$queue_dir/wal-source" || return
  [[ $(git rev-parse HEAD) == "$runner_source" ]] || return 2
  mkdir "$mount_dir" || return
  mkfs.ext4 -F -L triplex-bm1-wal -N 1048576 -E lazy_itable_init=0,lazy_journal_init=0 "$device" || return
  mount -o rw,relatime,errors=remount-ro "$device" "$mount_dir" || return
  findmnt -T "$mount_dir" -o SOURCE,TARGET,FSTYPE,OPTIONS > "$logs/wal-mount.txt" || return
  local arm duration
  duration=$(node --import tsx lab/bench/plan.ts --seconds --strict) || return
  for arm in root ssd; do
    local tag=$prefix-wal-$arm
    local settings=(DX_BM1_WAL_AB=1 DX_NS_PROFILE=v3 TRIPLEX_TRACE_LEVEL=summary)
    if [[ $arm == ssd ]]; then settings+=("DX_BM1_WAL_MOUNT=$mount_dir"); fi
    run_step "$tag" 7800 6300 "$DX_STACK_EVIDENCE/$tag" env "${settings[@]}" \
      bash "$t1/run.sh" real "$tag" --rung 10k --zero-readers --match-duration-s "$duration"
  done
  if [[ -z $(docker ps -q) ]]; then umount "$mount_dir" || return; fi
}
wal_rc=0
wal_ab > "$logs/wal-ab.log" 2>&1 || wal_rc=$?
printf '%s\n' "$wal_rc" > "$logs/wal-ab.exit"
printf '%s\n' 'C-state A/B omitted: the delivered Linux host has no cpuidle driver or per-core state controls.' > "$logs/cstates.txt"
seal "$prefix-queue-logs" "$logs"
printf '%s queue finished. Collect every published tag before releasing the server.\n' "$(stamp)"
