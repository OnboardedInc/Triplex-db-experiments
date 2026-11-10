#!/usr/bin/env bash
# Keeps every vCPU of the triplex2 VM awake with one SCHED_IDLE busy loop per CPU, so a thread that wakes from a wait is
# not delayed by the macOS hypervisor (see RESULT.md). SCHED_IDLE tasks run only when nothing else wants the CPU.
# usage: keep-awake.sh start|stop|status      Only while holding the measurement lock. Always stop before releasing it.
set -euo pipefail
ssh_vm=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2)
case "${1:-}" in
  start)
    "${ssh_vm[@]}" 'if pgrep -f "[t]x2-keep-awake" >/dev/null; then echo already-running; exit 0; fi
      for c in $(seq 0 $(( $(nproc) - 1 ))); do
        sudo nohup chrt -i 0 taskset -c $c sh -c ": tx2-keep-awake; while :; do :; done" >/dev/null 2>&1 &
      done; sleep 1; echo started $(pgrep -fc "[t]x2-keep-awake")' ;;
  stop) "${ssh_vm[@]}" 'sudo pkill -f "[t]x2-keep-awake" || true; sleep 0.5; echo remaining $(pgrep -fc "[t]x2-keep-awake" || true)' ;;
  status) "${ssh_vm[@]}" 'echo running $(pgrep -fc "[t]x2-keep-awake" || true)' ;;
  *) echo "usage: $0 start|stop|status" >&2; exit 2 ;;
esac
