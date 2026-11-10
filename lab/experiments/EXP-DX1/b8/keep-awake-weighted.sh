#!/usr/bin/env bash
# [DX-B8-WAKE] Why: SCHED_IDLE workers in user.slice compete with Docker's parent cgroup at group level.
# Rejected: attributing the paired ~50% CPU/goodput loss to gateway code, or changing the eight-worker wake rule.
set -euo pipefail
base=$(cd "$(dirname "$0")" && pwd)
ssh_vm=(ssh -F /Users/sam/.colima/_lima/colima-triplex2/ssh.config lima-colima-triplex2)
case "${1:-}" in
 start)
  status=$(bash "$base/keep-awake.sh" status)
  [[ ${status%%$'\n'*} == 'running 0' ]] || { echo 'Existing wake workers are not owned by this attempt';exit 1; }
  bash "$base/keep-awake.sh" start
  "${ssh_vm[@]}" sudo python3 - <<'PY'
import os,pathlib,json
root=pathlib.Path('/sys/fs/cgroup/tx2-dxb8-awake')
assert not root.exists(), 'owned cgroup already exists'
workers=[]
for p in pathlib.Path('/proc').glob('[0-9]*'):
 try:
  pid=int(p.name)
  if b'tx2-keep-awake' in (p/'cmdline').read_bytes() and os.sched_getscheduler(pid)==os.SCHED_IDLE:
   workers.append((pid,sorted(os.sched_getaffinity(pid))))
 except (OSError,ValueError):pass
assert sorted(cpus for _,cpus in workers)==[[i] for i in range(8)]
root.mkdir()
assert (root/'cpu.weight').exists(), 'CPU controller is not enabled'
(root/'cpu.weight').write_text('1')
for pid,_ in workers:(root/'cgroup.procs').write_text(str(pid))
assert set(map(int,(root/'cgroup.procs').read_text().split()))=={pid for pid,_ in workers}
print(json.dumps({'ownedCgroup':str(root),'cpuWeight':(root/'cpu.weight').read_text().strip(),'guestPids':[pid for pid,_ in workers],'comparisonWeights':{str(p):p.read_text().strip() for p in [pathlib.Path('/sys/fs/cgroup/user.slice/cpu.weight'),pathlib.Path('/sys/fs/cgroup/docker/cpu.weight'),pathlib.Path('/sys/fs/cgroup/system.slice/cpu.weight')] if p.exists()}}))
PY
  ;;
 status) bash "$base/keep-awake.sh" status ;;
 stop)
  bash "$base/keep-awake.sh" stop
  "${ssh_vm[@]}" sudo python3 - <<'PY'
import pathlib
p=pathlib.Path('/sys/fs/cgroup/tx2-dxb8-awake')
if p.exists():
 assert not (p/'cgroup.procs').read_text().strip(), 'owned wake cgroup is not empty'
 p.rmdir()
print('owned wake cgroup removed')
PY
  ;;
 *) echo 'usage: keep-awake-weighted.sh start|status|stop' >&2;exit 2;;
esac
