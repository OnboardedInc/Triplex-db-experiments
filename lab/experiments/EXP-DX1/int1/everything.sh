#!/usr/bin/env bash
# [DX-THIN1] Why: use the physical queue's existing exclusion for all four matched pairs and their preflight.
# Rejected: starting alongside a different campaign or leaving the producer and collector on different source checkouts.
set -euo pipefail
batch=${1:?batch name required}
cutoff=${2:?UTC cutoff required}
selection=${3:---both}
[[ $batch =~ ^[a-z][a-z0-9-]{2,24}$ && $cutoff =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
[[ $selection == --both || $selection == --overnight || $selection == --scorecard ]]
[[ $EUID == 0 && $(uname -s) == Linux && $(systemd-detect-virt || true) == none ]]
export DOCKER_HOST=unix:///var/run/docker.sock
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
export TURBO_TELEMETRY_DISABLED=1
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH DX_SCALE1_RUNTIME_REPO
umask 077
queue=/var/tmp/triplex-bm1
out=/var/tmp/triplex-int1-all
mkdir -p "$queue" "$out"
exec 9>"$queue/dx-bm1-day.lock"
flock -n 9

# [DX-INT1] Why: a clean source checkout can still have stale ignored build outputs.
# Rejected: running a judged arm with a package or gateway built from a previous revision.
revision=$(git rev-parse HEAD)
[[ -z $(git status --porcelain) && ! -e $out/$batch ]]
if [[ $selection == --scorecard ]]; then
  # [DX-V01] Why: verify the separately prepared build under the campaign lock.
  # Rejected: rebuilding the same images inside the four-hour scorecard allocation.
  node --no-warnings --experimental-transform-types --input-type=module -e \
    'import {cleanSource, verifyBuild} from "./lab/experiments/EXP-DX1/v01/source.ts"; verifyBuild(cleanSource(process.argv[1]), process.env.DX_V01_BUILD_RECEIPT)' "$revision"
else
  seconds=$(( $(date -u -d "$cutoff" +%s) - $(date -u +%s) - 60 ))
  [[ $seconds -gt 0 ]]
  prepared="$out/prepared-$batch"
  timeout --kill-after=45s "${seconds}s" bash lab/experiments/EXP-DX1/t1/bare-metal.sh \
    --prepare "$revision" "$prepared"
  [[ $(cat "$prepared/results/bootstrap.exit") == 0 ]]
  export PATH="$prepared/tools/bin:$PATH" DOCKER_CONFIG="$prepared/docker-config"
  cd "$prepared/repository"
  [[ $(git rev-parse HEAD) == "$revision" && -z $(git status --porcelain) ]]
fi
exec node lab/bin/heavy.mjs --label DX-THIN1-physical -- node --no-warnings --experimental-transform-types \
  lab/experiments/EXP-DX1/int1/everything.ts --run "$out/$batch" "$cutoff" "$selection" "${@:4}"
