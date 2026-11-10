#!/usr/bin/env bash
# A/B of keep-awake variants against a CPU-bound container, the way real engine containers run (cgroup under /docker, cpuset).
# Arms: none | sched-idle (the original helper: SCHED_IDLE loops in the login session's cgroup) | cgroup-idle (loops in a
# cgroup with cpu.idle=1). For each: dense score (loop iterations in 4 s on CPU 5, two containers sharing the CPU would be
# unfair, so one container) and the sparse probe (probe.py inside the same kind of container). Hold the measurement lock.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
vm=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2)
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
dense='import time
t=time.perf_counter();n=0
while time.perf_counter()-t<4:
    s=0
    for i in range(20000): s+=i*i&7
    n+=1
print(n)'
measure() {
  local d s
  d=$(docker run --rm --cpuset-cpus 5 python:3.13-slim python3 -c "$dense")
  s=$(docker run --rm -i --cpuset-cpus 5 python:3.13-slim python3 - 5 < "$here/probe.py")
  echo "{\"arm\":\"$1\",\"denseUnits4s\":$d,\"probe\":$s}"
}
stop_all() { "${vm[@]}" 'sudo pkill -f "[t]x2-keep-awake" || true; sudo pkill -f "[t]x2-cgidle" || true; sleep 0.5; sudo rmdir /sys/fs/cgroup/tx2keep 2>/dev/null || true'; }
trap stop_all EXIT
stop_all; measure none
"${vm[@]}" 'marker=tx2-; marker=${marker}keep-awake; for c in $(seq 0 7); do sudo nohup chrt -i 0 taskset -c $c sh -c ": $marker; while :; do :; done" >/dev/null 2>&1 & done; sleep 1'
measure sched-idle; stop_all
"${vm[@]}" 'sudo mkdir -p /sys/fs/cgroup/tx2keep && echo 1 | sudo tee /sys/fs/cgroup/tx2keep/cpu.idle >/dev/null; marker=tx2-; marker=${marker}cgidle
  for c in $(seq 0 7); do sudo nohup taskset -c $c sh -c ": $marker; echo \$\$ > /sys/fs/cgroup/tx2keep/cgroup.procs; while :; do :; done" >/dev/null 2>&1 & done; sleep 1; echo "cgroup procs $(wc -l < /sys/fs/cgroup/tx2keep/cgroup.procs) idle $(cat /sys/fs/cgroup/tx2keep/cpu.idle)" >&2'
measure cgroup-idle; stop_all; measure none
