#!/usr/bin/env bash
# [COLD-1] Why: taking guest CPUs offline is the only way to change how many virtual CPU threads spin on the Mac without
# restarting the VM. An offline guest CPU stops its virtual CPU thread, so the Mac sees fewer always-busy threads.
# Rejected: restarting the VM with fewer CPUs (not allowed here; it also changes memory layout and boot state).
# usage (under with-lock.sh): guest-cpus.sh offline 6,7 | online | show
set -euo pipefail
mode=${1:?offline|online|show}; list=${2:-}
[[ $mode == offline || $mode == online || $mode == show ]] || exit 2
[[ -z $list || $list =~ ^[1-7](,[1-7])*$ ]] || exit 2
python3 - "$HOME/Claude/Projects/triplex-db-2/locks/measure/owner.json" <<'PY'
import json,sys,os
o=json.load(open(sys.argv[1])); assert o["id"]=="COLD"; os.kill(o["pid"],0)
PY
docker run --rm --pull never --privileged --network none --name tx2-cold-cpus node:22.23.2-bookworm-slim sh -c '
mode=$1; list=$2
if [ "$mode" = offline ]; then for c in $(echo "$list" | tr , " "); do echo 0 > /sys/devices/system/cpu/cpu$c/online; done; fi
if [ "$mode" = online ]; then for f in /sys/devices/system/cpu/cpu[0-9]*/online; do [ "$(cat $f)" = 1 ] || echo 1 > $f; done; fi
printf "{\"online\":\"%s\",\"offline\":\"%s\",\"present\":\"%s\"}\n" "$(cat /sys/devices/system/cpu/online)" "$(cat /sys/devices/system/cpu/offline)" "$(cat /sys/devices/system/cpu/present)"
' sh "$mode" "$list"
