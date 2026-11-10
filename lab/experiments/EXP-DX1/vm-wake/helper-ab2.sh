#!/usr/bin/env bash
# Second A/B: does spinning only N vCPUs (N <= 6 performance cores on this M3 Pro) keep dense speed and remove wake latency?
# usage: helper-ab2.sh "<spin cpu list>" <measure cpu>     e.g. helper-ab2.sh "0 1 2 3 4 5" 5
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; spin="$1"; mc="$2"
vm=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config" lima-colima-triplex2)
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
dense='import time
t=time.perf_counter();n=0
while time.perf_counter()-t<4:
    s=0
    for i in range(20000): s+=i*i&7
    n+=1
print(n)'
stop_all() { "${vm[@]}" 'sudo pkill -f "[t]x2-keep-awake" || true; sleep 0.5'; }
trap stop_all EXIT; stop_all
"${vm[@]}" "marker=tx2-; marker=\${marker}keep-awake; for c in $spin; do sudo nohup chrt -i 0 taskset -c \$c sh -c \": \$marker; while :; do :; done\" >/dev/null 2>&1 & done; sleep 2"
d=$(docker run --rm --cpuset-cpus "$mc" python:3.13-slim python3 -c "$dense")
s=$(docker run --rm -i --cpuset-cpus "$mc" python:3.13-slim python3 - "$mc" < "$here/probe.py")
echo "{\"spin\":\"$spin\",\"measureCpu\":$mc,\"denseUnits4s\":$d,\"probe\":$s}"
