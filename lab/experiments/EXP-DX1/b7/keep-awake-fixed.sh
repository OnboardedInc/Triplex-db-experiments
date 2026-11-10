#!/usr/bin/env bash
# Keeps every vCPU of the triplex2 VM awake with one SCHED_IDLE busy loop per CPU, so a thread that wakes from a wait is
# not delayed by the macOS hypervisor (see RESULT.md). SCHED_IDLE tasks run only when nothing else wants the CPU.
# usage: keep-awake.sh start|stop|status      Only while holding the measurement lock. Always stop before releasing it.
set -euo pipefail
# [DX-B7-S4] Why: avoid a literal marker in the SSH ancestor command; the upstream start self-matched. Rejected: trusting already-running without status.
ssh_vm=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2)
case "${1:-}" in
  start)
    "${ssh_vm[@]}" 'if pgrep -f "[t]x2-keep-awake" >/dev/null; then echo already-running; exit 0; fi
      marker=tx2-; marker=${marker}keep-awake
      for c in $(seq 0 $(( $(nproc) - 1 ))); do
        sudo nohup chrt -i 0 taskset -c $c sh -c ": $marker; while :; do :; done" >/dev/null 2>&1 &
      done; sleep 1; echo started $(pgrep -fc "[t]x2-keep-awake")' ;;
  stop) "${ssh_vm[@]}" 'sudo pkill -f "[t]x2-keep-awake" || true; sleep 0.5; echo remaining $(pgrep -fc "[t]x2-keep-awake" || true)' ;;
  status) "${ssh_vm[@]}" python3 - <<'PYSTATUS'
import os,pathlib,json
workers=[]
for p in pathlib.Path('/proc').glob('[0-9]*'):
    try:
        pid=int(p.name)
        if b'tx2-keep-awake' in (p/'cmdline').read_bytes() and os.sched_getscheduler(pid)==os.SCHED_IDLE:
            workers.append({'guestPid':pid,'cpus':sorted(os.sched_getaffinity(pid))})
    except (OSError,ValueError):pass
print('running',len(workers))
print(json.dumps({'workers':workers,'onePerCpu':sorted(w['cpus'] for w in workers)==[[i] for i in range(8)]}))
PYSTATUS
    ;;
  *) echo "usage: $0 start|stop|status" >&2; exit 2 ;;
esac
