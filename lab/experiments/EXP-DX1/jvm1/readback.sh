#!/usr/bin/env bash
# [DX-JVM1] Why: collect final HotSpot values from the same boot that serves requests.
# Rejected: java -version with launcher flags, which measures a separate JVM.
set -euo pipefail
container=${1:?}
output=${2:?}
role=${3:?}
mode=${4:-split}
[[ $mode == split || $mode == shared ]]
mkdir -p "$output"
before=$(docker inspect --format '{{.Id}} {{.Image}} {{.State.StartedAt}} {{.RestartCount}} {{.State.Running}}' "$container")
read -r id image started restarts running <<< "$before"
[[ $running == true ]]
snapshot() {
  docker exec "$id" bash -ceu '
    java_pid=
    for dir in /proc/[0-9]*; do
      if [[ $(cat "$dir/comm" 2>/dev/null || :) == java ]]; then
        if [[ $2 == shared ]] && ! tr "\000" "\n" < "$dir/cmdline" | grep -Fqx -- "-Dtriplex.jvm.role=$1"; then
          continue
        fi
        [[ -z $java_pid ]]
        java_pid=${dir##*/}
      fi
    done
    [[ -n $java_pid ]]
    printf "pid=%s\nstartTicks=%s\n" "$java_pid" "$(awk "{print \$22}" "/proc/$java_pid/stat")"
    grep -E "^Cpus_allowed_list:" "/proc/$java_pid/status"
    for name in memory.max memory.swap.max cpu.max cpuset.cpus.effective; do
      printf "%s=%s\n" "$name" "$(cat "/sys/fs/cgroup/$name")"
    done
  ' bash "$role" "$mode"
}
proc=$(snapshot)
logs=$(mktemp "$output/.$role.XXXXXX")
trap 'rm -f "$logs"' EXIT
if [[ $mode == shared ]]; then
  jvm_dir=$(docker exec "$id" cat /run/tx2-jvm-evidence)
  [[ $jvm_dir =~ ^/data/log/jvm\.[A-Za-z0-9]{8}$ ]]
  docker exec "$id" cat "$jvm_dir/$role.log" > "$logs"
else
  docker logs --since "$started" "$id" > "$logs" 2>&1
fi
flags="$output/$role.flags.txt"
awk '/^\[Global flags\]$/ { collecting=1; next }
  collecting && /[{][a-zA-Z0-9]/ && /[}][[:space:]]*[{]/ && /=/ { print; next }
  collecting { exit }' "$logs" > "$flags"
[[ $(wc -l < "$flags") -gt 100 ]]
collector=$(awk '$2 ~ /^Use(Serial|Parallel|G1|Z|Shenandoah|Epsilon)GC$/ && $4 == "true" {print $2}' "$flags")
[[ $collector =~ ^Use(Serial|Parallel|G1|Z|Shenandoah|Epsilon)GC$ ]]
grep -E '\[gc,init[[:space:]]*\].*(Version:|CPUs:|Memory:|Large Page Support:|Heap (Min|Initial|Max) Capacity:)' "$logs" > "$output/$role.gc-init.txt"
grep -q 'Version:' "$output/$role.gc-init.txt"
grep -E '\[cds[[:space:]]*\]' "$logs" > "$output/$role.cds.txt" || :
grep -q 'CPUs:' "$output/$role.gc-init.txt"
[[ $proc == "$(snapshot)" ]]
[[ $before == "$(docker inspect --format '{{.Id}} {{.Image}} {{.State.StartedAt}} {{.RestartCount}} {{.State.Running}}' "$id")" ]]
{
  printf 'containerId=%s\nimageId=%s\nstartedAt=%s\nrestarts=%s\ncollector=%s\n' "$id" "$image" "$started" "$restarts" "$collector"
  printf '%s\n' "$proc"
} > "$output/$role.process.txt"
