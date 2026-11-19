#!/usr/bin/env bash
# [DX-DRV1] Why: fresh old/new/old arms and terminal bundles survive a failed arm or a cutoff.
# Rejected: reusing a seeded volume, racing timed work with archive compression, or treating a shell exit as a verdict.
set -euo pipefail
if [[ ${1:---plan} == --plan ]]; then
  printf '%s\n' 'On the idle Ubuntu 24.04 bare-metal bench, run as root from the clean pushed checkout.' \
    'bash lab/experiments/EXP-DX1/drv1/queue.sh --run BATCH UTC_CUTOFF' \
    'Allow about 5h30m including build, three full v3 zero-reader arms, analysis and transfer.' \
    'Order: sender + heap, replica-worker + worker-journal, sender + heap.' \
    'Outputs: /var/tmp/triplex-bm1/drv1-BATCH and /var/tmp/triplex-bm1/bundles/.'
  exit
fi
[[ ${1:-} == --run && $# == 3 && $EUID == 0 && $(uname -s) == Linux ]] || exit 2
[[ $(systemd-detect-virt) == none ]] || exit 2
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || exit 2
batch=$2
stop=$3
[[ $batch =~ ^[a-z0-9]{1,12}$ && $stop =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || exit 2
cutoff=$(date -u -d "$stop" +%s)
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
[[ -z $(git -C "$repo" status --porcelain) ]] || { echo 'Use a clean experiment checkout' >&2; exit 2; }
source_sha=$(git -C "$repo" rev-parse HEAD)
prefix=tx2-dxt1-drv1-$batch
root=/var/tmp/triplex-bm1
queue=$root/drv1-$batch
work=$queue/checkout
runner=lab/experiments/EXP-DX1
logs=$queue/logs
umask 077
mkdir -p "$root/bundles"
exec 9>"$root/dx-drv1.lock"
flock -n 9 || { echo 'Another driver-tail queue owns the bench' >&2; exit 75; }
mkdir "$queue"
mkdir "$logs"
printf '%s\n' "$source_sha" > "$logs/runner-source.txt"
printf '%s\n' "$stop" > "$logs/cutoff.txt"
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
export DOCKER_HOST=unix:///var/run/docker.sock DEBIAN_FRONTEND=noninteractive TURBO_TELEMETRY_DISABLED=1
stamp() { date -u '+%FT%TZ'; }

bundle() {
  local tag=$1 run=$2 log=$3 exit_file=$4
  (
    local temp destination=$root/bundles/$tag
    [[ ! -e $destination && -d $run ]] || exit 1
    temp=$(mktemp -d "$root/bundles/.${tag}.XXXXXX") || exit 1
    trap 'rm -rf -- "$temp"' EXIT
    cp "$log" "$exit_file" "$logs/runner-source.txt" "$logs/cutoff.txt" "$temp/" || exit 1
    tar -C "$run" --exclude='./trace/raw' --exclude='./driver/trace/raw' \
      -c -I 'zstd -q -T1 -1' -f "$temp/reports.tar.zst" . || exit 1
    if [[ -d $run/trace/raw && -n $(find "$run/trace/raw" -type f -print -quit) ]]; then
      tar -C "$run" -c -I 'zstd -q -T1 -1' -f "$temp/raw.tar.zst" trace/raw || exit 1
    fi
    printf '%s\n' "$tag" > "$temp/collection-tag.txt" || exit 1
    (cd "$temp" && sha256sum -- *.txt *.log *.exit *.tar.zst > TRANSFER.sha256) || exit 1
    mv -T "$temp" "$destination"
  )
}

# Reserve room for all fixed offers before preparing the native images. The cutoff includes cleanup.
setup_seconds=$((cutoff - $(date +%s) - 3 * 6150 - 180))
((setup_seconds >= 120)) || { echo 'Cutoff leaves too little time for three full v3 arms' >&2; exit 75; }
printf '%s prepare %s\n' "$(stamp)" "$source_sha"
setup_rc=0
timeout --foreground --signal=TERM --kill-after=150s "${setup_seconds}s" \
  bash "$repo/$runner/t1/bare-metal.sh" --prepare "$source_sha" "$work" > "$logs/prepare.log" 2>&1 || setup_rc=$?
printf '%s\n' "$setup_rc" > "$logs/prepare.exit"
[[ $setup_rc == 0 && $(cat "$work/results/bootstrap.exit") == 0 ]] || exit 1

cd "$work/repository"
[[ $(git rev-parse HEAD) == "$source_sha" ]]
export PATH="$work/tools/bin:$PATH" DOCKER_CONFIG=$work/docker-config
export DX_BARE_METAL=1 DX_BARE_METAL_ROOT=$work/state DX_STACK_EVIDENCE=$work/state/evidence/DX-T1
plan=$logs/plan.json
node --import tsx lab/bench/plan.ts "$plan" --strict > "$logs/plan.log"
[[ $(node --import tsx lab/bench/plan.ts --seconds --strict) == 5910 ]]
docker image inspect tx2-datomic:1.0.7745-da00 node:22.23.2-bookworm-slim postgres:17-alpine \
  --format '{{.Id}}' > "$logs/images.txt"

idle() {
  local running
  running=$(docker ps -q) || return 1
  [[ -z $running && ! -e $DX_BARE_METAL_ROOT/locks/measure ]]
}
bundle_failed=0
item() {
  local tag=$1 capture=$2 retention=$3 left=$4
  local log=$logs/$tag.log exit_file=$logs/$tag.exit run=$DX_STACK_EVIDENCE/$tag
  local remaining=$((cutoff - $(date +%s) - 180 - left * 6150)) rc=0
  date +%s > "$logs/$tag.started"
  if ((remaining < 6150)); then
    printf 'Cutoff leaves %ss for this arm including teardown.\n' "$remaining" > "$log"
    rc=75
  elif ! idle; then
    printf 'A previous item still owns bench resources.\n' > "$log"
    rc=75
  elif [[ $(git rev-parse HEAD) != "$source_sha" ]] ||
       ! docker image inspect tx2-datomic:1.0.7745-da00 node:22.23.2-bookworm-slim postgres:17-alpine \
         --format '{{.Id}}' | cmp -s "$logs/images.txt"; then
    printf 'Source or native image identity changed.\n' > "$log"
    rc=1
  else
    if ((remaining > 6900)); then remaining=6900; fi
    printf '%s start %s max=%ss\n' "$(stamp)" "$tag" "$remaining"
    timeout --foreground --signal=TERM --kill-after=150s "${remaining}s" \
      env -i PATH="$PATH" DOCKER_HOST="$DOCKER_HOST" DOCKER_CONFIG="$DOCKER_CONFIG" \
      DX_BARE_METAL=1 DX_BARE_METAL_ROOT="$DX_BARE_METAL_ROOT" DX_STACK_EVIDENCE="$DX_STACK_EVIDENCE" \
      TRIPLEX_TRACE_EVIDENCE="$DX_BARE_METAL_ROOT/evidence" TRIPLEX_TRACE_SESSION="$prefix" \
      GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
      DX_COMPILER_POLICY=early DX_NATIVE_GATES=0 DX_CPUS_DRIVER=3,5,6,7 DX_WORKER_CPUS=5,6,7 \
      TRIPLEX_BENCH_SPILL_MAX_BYTES=137438953472 DX_NS_PROFILE=v3 TRIPLEX_TRACE_LEVEL=summary \
      bash "$runner/t1/run.sh" real "$tag" --rung 10k --zero-readers --idle-keep none \
      --receipt-capture "$capture" --expected-state-retention "$retention" > "$log" 2>&1 || rc=$?
  fi
  date +%s > "$logs/$tag.ended"
  printf '%s\n' "$rc" > "$exit_file"
  printf '%s exit %s %s\n' "$(stamp)" "$tag" "$rc"
  if [[ -d $run ]] && idle; then
    if ! bundle "$tag" "$run" "$log" "$exit_file"; then
      printf 'Bundle failed for %s\n' "$tag" >&2
      bundle_failed=1
    fi
  fi
}

item "$prefix-a" sender heap 2
item "$prefix-b" replica-worker worker-journal 1
item "$prefix-c" sender heap 0
compare_rc=0
node "$runner/drv1/compare.ts" "$source_sha" "$DX_STACK_EVIDENCE" "$logs" "$prefix" \
  > "$queue/COMPARISON.md" 2> "$logs/comparison.log" || compare_rc=$?
printf '%s\n' "$compare_rc" > "$logs/comparison.exit"
cat "$queue/COMPARISON.md"
(
  cd "$queue"
  sha256sum COMPARISON.md logs/* > QUEUE.SHA256SUMS
)
if ((bundle_failed)); then exit 1; fi
exit "$compare_rc"
