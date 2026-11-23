#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: run PREP1's 32 GiB cache arm on the aged one-billion cut on bench 4 with Saturday's cache32 environment
# (fresh build from the pinned bootstrap, Java 25 transactor image, WAL on the second NVMe).
# Rejected: reusing another job's build (later builds retag the shared image names) or warming anything before the arm.
root=$1
selection=$2
mode=${3:-run}
[[ $root == /var/tmp/triplex-bm1/bench4 && $EUID == 0 && $(systemd-detect-virt) == none ]]
case $selection in
  cache32-aged|cache32-aged-b|cache32-aged-c) pin=cdc72d4d5bd6cc1adecaaf9267a351173763d134 ;;
  # [DX-BM1] Why: PREP1's repaired live-head check (AGED-CACHE.md at fb751f994); cdc72d4d5 refused AGE1's journal rows.
  cache32-aged-r|cache32-aged-r2) pin=1bbaf54cdd2180ccaa2cd6ce961c05be49eefbc2 ;;
  # [DX-BM1] Why: REAL2's production-shaped tape on the fresh template (real2/PRODUCTION-TAPE.md), same environment.
  production) pin=173f9d463b8a66d2e9da5c804c3076779accc292 ;;
  # [DX-BM1] Why: REAL2's repair of the prod slot allowlist (stack/up.sh:258, tail-pg.sh, rolling-counters.py).
  production-r) pin=832a7e0c62afd96ba8bc2aac9fde833debcbeaed ;;
  # [DX-BM1] Why: REAL2's production tape on the aged cut (real2/PRODUCTION-AGED.md), cache32-aged's inputs.
  production-aged) pin=e1711fda0e487bec870517dd38902f982ba26624 ;;
  # [DX-BM1] Why: REAL2's repair of the S arm's identity limit (commits over 256 assertions take the general identity).
  production-aged2) pin=32ca969bbb52ddba6a5b7142a0ee48ece3c2e3ac ;;
  production-s) pin=092a76916b9ef6cea379aa9d635e91fa27c69da2 ;;
  *) exit 2 ;;
esac
aged_run=1; launch_mode=cache32-aged
case $selection in
  production-aged*) launch_mode=production-aged ;;
  production-s) aged_run=0 fresh_mode=production-s ;;
  production*) aged_run=0 ;;
esac
job=$root/queue/$selection
build=$job/build
repo=$build/repository
out=$job/result
wal=/mnt/triplex-bench4-wal
status=/var/tmp/triplex-bm1/STATUS
aged=/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster
handoff=/var/tmp/triplex-scale1/age-v01-bulk-c/rung/1000000000/aged-scorecard.json
image=/var/tmp/triplex-scale1/decision/attempts/arm-d7-wfix-pool-seed
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$build/tools/bin:$PATH" DX_BARE_METAL_ROOT="$build/state"

record() {
  local pending="$status.$selection.tmp"
  printf 'item=bench4-%s state=%s since=%s next=%s\n' "$selection" "$1" "$(date -u +%FT%TZ)" "$2" > "$pending"
  mv "$pending" "$status"
}

inventory() {
  docker ps -aq --filter "name=^/$1-" &&
    docker volume ls -q --filter "name=^$1-" && docker network ls -q --filter "name=^$1-"
}

if [[ $mode == cleanup ]]; then
  [[ -e $job/started ]] || exit 0
  if [[ -s $out/prefix ]]; then
    tag=$(cat "$out/prefix")
    [[ $tag =~ ^[a-f0-9]{8}$ && $(cat "$out/source") == "$pin" ]]
    cd "$repo"
    for arm in "$out"/1-*-S; do
      [[ -d $arm ]] || continue
      name=$(basename "$arm"); owned=tx2-dxprep1-$tag-${name,,}
      if [[ -n $(inventory "$owned") ]]; then
        timeout 60 bash lab/experiments/EXP-DX1/stack/down.sh "$owned" --volumes
      fi
      [[ -z $(inventory "$owned") ]]
      if [[ -d $wal/$owned ]]; then
        [[ ! -L $wal/$owned && $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
        rm -r --one-file-system -- "$wal/$owned"
      fi
    done
  fi
  record terminal collect
  exit
fi

[[ $mode == run || $mode == dry || $mode == build ]]
if [[ $mode == build ]]; then
  # [DX-BM1] Why: build the pinned job ahead of the data so the arm starts minutes after the copy verifies.
  [[ ! -e $build && -z $(docker ps -q) ]]
  mkdir -p "$job"
  timeout -k 15s 20m env DX_JAVA=25 DX_NATIVE_BOOTSTRAP_CACHE="$root/base-build" \
    bash "$root/prepare.sh" --prepare "$pin" "$build"
  exit
fi
# The aged directory, handoff and seed metadata must have passed the receiver's byte and digest checks first.
[[ -z $(docker ps -q) && ! -e $out ]]
if [[ $aged_run == 1 ]]; then
  [[ -f $root/aged-verification.json ]]
  handoff_sha=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["handoffSha256"])' "$root/aged-verification.json")
  [[ $handoff_sha =~ ^[a-f0-9]{64}$ && $(sha256sum "$handoff" | cut -d ' ' -f 1) == "$handoff_sha" ]]
  [[ ! -e $aged/postmaster.pid ]]
else
  [[ -f $root/fresh-verification.json && ! -e /mnt/triplex-scale1-pgdata/fresh-a/cluster/postmaster.pid ]]
fi
[[ $(findmnt -nro SOURCE --mountpoint "$wal") == /dev/nvme1n1 ]]
for policy in /sys/devices/system/cpu/cpufreq/policy*/scaling_governor; do [[ $(cat "$policy") == performance ]]; done
awk '$1 == "MemTotal:" {exit ($2 < 89*1024*1024)}' /proc/meminfo
images_current() {
  # [DX-BM1] Why: reuse the dry run's build only while every tag still names the image that build made.
  # Rejected: trusting tags after any other build (each build retags the shared names).
  python3 - "$build/results/images.json" <<'PY'
import json, subprocess, sys
for image in json.load(open(sys.argv[1])):
    for tag in image.get("RepoTags", []):
        now = subprocess.run(["docker", "image", "inspect", "--format", "{{.Id}}", tag], capture_output=True, text=True).stdout.strip()
        if now != image["Id"]:
            sys.exit(1)
PY
}
build_ready=0
if [[ -e $build ]]; then
  [[ $(cat "$build/results/bootstrap.exit") == 0 ]]
  images_current
  build_ready=1
fi
mkdir -p "$job"
if [[ $mode == run ]]; then date -u +%FT%TZ > "$job/started"; record preparing measure; fi
if [[ $build_ready == 0 ]]; then
  timeout -k 15s 20m env DX_JAVA=25 DX_NATIVE_BOOTSTRAP_CACHE="$root/base-build" \
    bash "$root/prepare.sh" --prepare "$pin" "$build"
fi
[[ $(cat "$build/results/bootstrap.exit") == 0 ]]
cd "$repo"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
if [[ $aged_run == 1 ]]; then
  launch=(bash lab/experiments/EXP-DX1/prep1/server.sh "$launch_mode" "$out" "$pin" "$image"
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154
    --pg-data "$aged" --wal-mount "$wal" --aged-bundle "$handoff" "$handoff_sha")
else
  launch=(bash lab/experiments/EXP-DX1/prep1/server.sh "${fresh_mode:-production}" "$out" "$pin" "$image"
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154
    --pg-data /mnt/triplex-scale1-pgdata/fresh-a/cluster --wal-mount "$wal")
fi
if [[ $mode == dry ]]; then
  # [DX-BM1] Why: run every input and stack guard for real up to the first container, before the timed window.
  out=$job/dry-out
  launch[3]=$out
  exec bash "$root/tools/launch-dry-run.sh" "$job/dry" -- "${launch[@]}"
fi
record running collect
exec node lab/bin/heavy.mjs --label "DX-PREP1-$selection" -- "${launch[@]}"
