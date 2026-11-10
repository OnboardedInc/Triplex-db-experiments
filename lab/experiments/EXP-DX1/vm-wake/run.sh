#!/usr/bin/env bash
# Runs probe.py inside the triplex2 VM (no containers). Hold the measurement lock: spinners change the VM for everyone.
# usage: run.sh [--spin]   --spin starts one SCHED_IDLE busy loop per CPU for the duration of the probe
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
ssh_vm=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2)
"${ssh_vm[@]}" 'cat > /tmp/tx2-wake-probe.py' < "$here/probe.py"
if [[ "${1:-}" == "--spin" ]]; then
  "${ssh_vm[@]}" 'pids=""; for c in $(seq 0 $(( $(nproc) - 1 ))); do sudo chrt -i 0 taskset -c $c sh -c "while :; do :; done" & pids="$pids $!"; done; sleep 1; python3 /tmp/tx2-wake-probe.py 5; sudo pkill -f "while :; do :; done" || true; wait 2>/dev/null || true'
else
  "${ssh_vm[@]}" 'python3 /tmp/tx2-wake-probe.py 5'
fi
