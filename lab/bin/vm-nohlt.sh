#!/usr/bin/env bash
# Turn the guest kernel parameter `nohlt` on or off in the dedicated triplex2 VM, under the measurement lock, and run the
# wake probe before and after. `nohlt` makes an idle vCPU busy-wait instead of blocking on the host (research R4, action 1),
# which is the suspected cause of the 8 to 10 ms wake penalty. Cost: every vCPU uses a host core at 100% while the VM is up.
# usage: vm-nohlt.sh on|off [cpus, default 8]
set -uo pipefail
mode=${1:?on|off}; cpus=${2:-8}
root="$(cd "$(dirname "$0")/../.." && pwd)"
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/ORCH-vm-wake; mkdir -p "$out"
log="$out/nohlt-$mode-${cpus}cpu-$(date -u +%Y%m%dT%H%M%SZ).log"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
while ! mkdir "$lock" 2>/dev/null; do sleep "${TX2_LOCK_RETRY_S:-5}"; done
printf '{"id":"ORCH-vm-nohlt","pid":%d}\n' $$ > "$lock/owner.json"
trap 'rm -rf "$lock"' EXIT
(
  date -u
  running=$(docker ps -q | wc -l | tr -d ' ')
  if [ "$running" != 0 ]; then echo "refusing: containers are running"; docker ps --format '{{.Names}}'; exit 4; fi
  ctx=$(env -u DOCKER_HOST docker context show); echo "context before: $ctx"
  echo "volumes before: $(docker volume ls -q | wc -l)"
  colima ssh -p triplex2 -- cat /proc/cmdline
  echo "== probe before"; sh "$root/lab/bin/host-quiet.sh"; bash "$root/lab/experiments/EXP-DX1/vm-wake/run.sh"
  if [ "$mode" = on ]; then
    colima ssh -p triplex2 -- sudo sh -c 'printf "%s\n" "GRUB_CMDLINE_LINUX=\"\$GRUB_CMDLINE_LINUX nohlt\"" > /etc/default/grub.d/60-tx2-nohlt.cfg; update-grub 2>&1 | tail -2'
  else
    colima ssh -p triplex2 -- sudo sh -c 'rm -f /etc/default/grub.d/60-tx2-nohlt.cfg; update-grub 2>&1 | tail -2'
  fi
  colima stop -p triplex2
  colima start -p triplex2 --cpu "$cpus"
  env -u DOCKER_HOST docker context use "$ctx"
  echo "context after: $(env -u DOCKER_HOST docker context show)"
  colima list
  colima ssh -p triplex2 -- sudo mount -o remount,discard /var/lib/docker
  colima ssh -p triplex2 -- sh -c 'cat /proc/cmdline; mount | grep /var/lib/docker; free -g | sed -n 2p; nproc'
  echo "volumes after: $(docker volume ls -q | wc -l)"
  sleep 20
  echo "== probe after"; sh "$root/lab/bin/host-quiet.sh"; bash "$root/lab/experiments/EXP-DX1/vm-wake/run.sh"
  echo "== host CPU of VM processes"; ps -Ao pcpu,rss,comm -r | grep -i Virtualization | cut -c1-60
  date -u
) > "$log" 2>&1
rc=$?
echo "nohlt $mode rc=$rc log=$log"; grep -A12 '== probe' "$log" | cut -c1-260
exit $rc
