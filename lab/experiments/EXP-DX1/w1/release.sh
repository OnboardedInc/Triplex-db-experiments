#!/usr/bin/env bash
# [DX-W1] Why: systemd can outlive an interrupted collector; release only the fresh arm it admitted.
# Rejected: a daemon-wide cleanup or interpreting a reclaimed engine as a completed measurement.
set -eu -o pipefail
dir=${1:?batch directory}
[[ $dir =~ ^/var/tmp/triplex-w1/([a-z][a-z0-9]{2,14})$ && $(uname -s) == Linux ]]
batch=${dir##*/}
[[ -f "$dir/active-slot" ]] || exit 0
slot=$(cat "$dir/active-slot")
[[ $slot =~ ^tx2-dxscale1-w1-${batch}-([1-8])$ ]]
arm="$dir/results/arm-${BASH_REMATCH[1]}"
repo="$dir/build/repository"
source=$(cat "$dir/source")
[[ $(git -C "$repo" rev-parse HEAD) == "$source" ]]
[[ $(sha256sum /etc/machine-id | cut -d' ' -f1) == "$(cat "$dir/machine")" ]]
python3 - "$arm/identity.json" "$slot" "$source" <<'PY'
import json,sys
arm=json.load(open(sys.argv[1]))
if arm['slot']!=sys.argv[2] or arm['source']!=sys.argv[3]:
    raise SystemExit('Foreign arm identity')
PY
export DX_BARE_METAL=1 DX_BARE_METAL_ROOT="$arm" DOCKER_HOST=unix:///var/run/docker.sock
bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$slot" --volumes
if docker container inspect "$slot-extract" >/dev/null 2>&1; then docker rm -f "$slot-extract"; fi
for kind in container network volume; do
  names=$(docker "$kind" ls -q --filter "name=$slot-")
  if [[ $kind == container ]]; then names=$(docker ps -aq --filter "name=$slot-"); fi
  [[ -z $names ]] || { echo "Retaining active marker for surviving $kind" >&2; exit 1; }
done
printf '%s\n' "$slot" > "$arm/released-after-interruption.txt"
rm -- "$dir/active-slot"
