#!/usr/bin/env bash
set -euo pipefail
# [DX-BM1] Why: run JVM1's one-time start-up read arms (jvm1/STARTUP-READ.md at 54d4647a1) on bench 4, fresh or aged,
# from the single build in /var/tmp/triplex-jvm1-startup-build, after a stack-level dry run.
# Rejected: the first-offer dry run (startup-server.ts has no firstOffer hook at 54d4647a1, so it would run the arms).
# Usage: bench4-startup.sh ROOT startup-fresh|startup-aged dry|run
root=$1 selection=$2 mode=$3
[[ $root == /var/tmp/triplex-bm1/bench4 && $EUID == 0 && $(systemd-detect-virt) == none && $mode =~ ^(dry|run)$ ]]
commit=54d4647a184126f647dff5f307b389165c53b7a0
build=/var/tmp/triplex-jvm1-startup-build
if [[ $selection == startup-aged ]]; then
  # [DX-BM1] Why: the aged arm uses JVM1's patched startup-aged.ts (968285954) with its own build and receipt.
  commit=96828595467078bede89843511a3078bef93d4f8
  build=/var/tmp/triplex-jvm1-startup-aged-build
fi
job=$root/queue/$selection
seed=/var/tmp/triplex-scale1/decision/attempts/arm-d7-wfix-pool-seed
wal=/mnt/triplex-bench4-wal
status=/var/tmp/triplex-bm1/STATUS
case $selection in
  startup-fresh)
    pgdata=/mnt/triplex-scale1-pgdata/fresh-a/cluster
    extra=() ;;
  startup-aged)
    pgdata=/mnt/triplex-scale1-held-age/calibrated-post-ladder/cluster
    handoff=/var/tmp/triplex-scale1/age-v01-bulk-c/rung/1000000000/aged-scorecard.json
    sha=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["handoffSha256"])' "$root/aged-verification.json")
    [[ $(sha256sum "$handoff" | cut -d ' ' -f 1) == "$sha" ]]
    extra=(--aged-bundle "$handoff" --aged-sha256 "$sha") ;;
  *) exit 2 ;;
esac
[[ -z $(docker ps -q) && ! -e $pgdata/postmaster.pid ]]
control=$(sha256sum "$pgdata/global/pg_control" | cut -d ' ' -f 1)
cd "$build/repository"
[[ $(git rev-parse HEAD) == "$commit" ]]
export PATH="$build/tools/bin:$PATH" DX_V01_BUILD_RECEIPT="$build/BUILD-v0.1.json" DOCKER_HOST=unix:///var/run/docker.sock
python3 "$root/bench4-retag.py" "$build/BUILD-v0.1.json"
mkdir -p "$job"
launch() {
  cmd=(bash lab/experiments/EXP-DX1/jvm1/startup-server.sh "$commit" "$1" "$seed"
    77d66794d41d321e2fb3daed96c5e9b9f32e6dd760c4ed67923c564861a8a76b
    1fabec59f36ca6fa1cdfb0070d6c85258fa310b1ab3b96d5ab75dd62dc06a154
    "$pgdata" "$control" "$wal" --credit-mode rolling6 --arms today-cache32,startup-read-cache32 ${extra[@]+"${extra[@]}"})
}
if [[ $mode == dry ]]; then
  rm -rf --one-file-system "$job/dry-run" "$job/dry-out"
  launch "$job/dry-out"
  bash "$root/tools/launch-dry-run.sh" "$job/dry-run" -- "${cmd[@]}" || true
  # Launchers with a separate WAL leave an empty slot directory (ha1/LAUNCH-GUARD.md).
  find "$wal" -mindepth 1 -maxdepth 1 -type d -empty -name 'tx2-*' -delete
  [[ $(head -c 8 "$job/dry-run/verdict.txt") == ADMITTED ]]
  exit 0
fi
[[ ! -e $job/result ]]
printf 'item=bench4-%s state=running since=%s next=collect\n' "$selection" "$(date -u +%FT%TZ)" > "$status"
launch "$job/result"
exec "${cmd[@]}"
