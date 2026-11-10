#!/usr/bin/env bash
# Third A/B: a SCHED_IDLE busy loop started INSIDE the measured container (same cgroup, so the idle policy is honoured
# against the container's own threads), on the container's own CPU. Earlier variants ran the loop in another cgroup and
# halved dense throughput. Arms: none, in-container idle loop, none. Hold the measurement lock.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; cpu=${1:-5}
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
name=tx2-orch-wake3
docker rm -f $name >/dev/null 2>&1 || true
docker run -d --name $name --cpuset-cpus "$cpu" python:3.13-slim sleep 600 >/dev/null
trap 'docker rm -f $name >/dev/null 2>&1 || true' EXIT
docker cp "$here/probe.py" $name:/probe.py
dense='import time
t=time.perf_counter();n=0
while time.perf_counter()-t<4:
    s=0
    for i in range(20000): s+=i*i&7
    n+=1
print(n)'
measure() { d=$(docker exec $name python3 -c "$dense"); s=$(docker exec $name python3 /probe.py "$cpu"); echo "{\"arm\":\"$1\",\"denseUnits4s\":$d,\"probe\":$s}"; }
measure none
docker exec -d $name chrt -i 0 sh -c 'while :; do :; done'
sleep 1; docker exec $name sh -c 'for p in /proc/[0-9]*; do c=$(tr "\0" " " < $p/cmdline 2>/dev/null); case "$c" in *"while :"*) chrt -p ${p#/proc/};; esac; done' >&2 || true
measure in-container-idle-loop
docker exec $name sh -c 'pkill -f "while :" || true'; sleep 1
measure none-again
