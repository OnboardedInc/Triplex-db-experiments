#!/usr/bin/env bash
# [DX-R3-P9] Why: every owned hold needs live file/disk limits as well as a finite engine lease.
# Rejected: checking free space only before a long pair, or allowing another recursive log copy.
set -euo pipefail
[[ ${1:-} == -- ]] && shift
[[ $# -gt 0 ]] || exit 2
root=${DX_R3_GUARD_ROOT:-/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R3}
limit=${DX_R3_GUARD_FILE_BYTES:-1000000000}
[[ $limit =~ ^[1-9][0-9]*$ ]] && ((limit<=1000000000)) || exit 2
child=; guard=
disk() { python3 -c 'import shutil; n=shutil.disk_usage(".").free; print("DX-R3 guarded freeBytes",n,flush=True); assert n>=15*1024**3,"15 GiB floor"'; }
finish() {
  rc=$?; trap - EXIT TERM INT
  [[ ${BASH_SUBSHELL:-0} == 0 ]] || exit "$rc"
  if [[ -n $child ]]; then kill -TERM "$child" 2>/dev/null || true; wait "$child" || true; fi
  if [[ -n $guard ]]; then kill "$guard" 2>/dev/null || true; wait "$guard" 2>/dev/null || true; fi
  disk || rc=1
  exit "$rc"
}
trap finish EXIT
trap 'exit 143' TERM INT
disk
python3 - "$root" "$limit" "$$" "${DX_R3_GUARD_OUTPUT:-}" <<'PY' &
import pathlib,os,signal,sys,time,shutil
root=pathlib.Path(sys.argv[1]);limit=int(sys.argv[2]);parent=int(sys.argv[3]);extra=pathlib.Path(sys.argv[4]) if sys.argv[4] else None
while True:
    bad=None
    files=list(root.rglob('*'))
    if extra:files.append(extra)
    for p in files:
        try:
            if p.is_file() and p.stat().st_size>limit:bad=p;break
        except FileNotFoundError:pass
    free=shutil.disk_usage('.').free
    if bad or free<15*1024**3:
        print('DX-R3 STOP file/disk guard',str(bad),free,flush=True)
        os.kill(parent,signal.SIGTERM);break
    time.sleep(1)
PY
guard=$!
"$@" & child=$!
wait "$child"; child=
