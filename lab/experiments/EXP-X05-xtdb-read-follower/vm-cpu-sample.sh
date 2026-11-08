#!/bin/zsh
# EXP-X05: every 5 s for N samples, record CPU% of every container in the lab VM plus per-vCPU busy time from
# /proc/stat (read through the writer container, which shares the VM kernel), to see whether unpinned residents
# move onto the writer's cores when the follower's cores are busy. Output: one line per sample.
N=${1:-48}
H=unix:///Users/sam/.colima/triplex2/docker.sock
for i in $(seq 1 $N); do
  ts=$(date -u +%H:%M:%S)
  stats=$(docker -H $H stats --no-stream --format '{{.Name}}={{.CPUPerc}}' | tr '\n' ' ')
  cpus=$(docker -H $H exec tx2-xtdb-s2 sh -c 'grep "^cpu[0-9]" /proc/stat' | awk '{busy=$2+$3+$4+$7+$8+$9; tot=busy+$5+$6; printf "%s:%d/%d ", $1, busy, tot}')
  echo "$ts $stats| $cpus"
  sleep 5
done
