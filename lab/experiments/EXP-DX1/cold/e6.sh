#!/usr/bin/env bash
# [COLD-1] Why: the real stack's fixed-gap stream with all eight guest CPUs online against five, alternating in one
# session, so the efficiency-core rotation is the one thing that changes and each candidate arm has a control on
# both sides. Placement is the same in every arm and fits five CPUs.
# usage (under with-lock.sh writer-arms, after prepare-harness.sh apply): e6.sh SESSION "LABEL:OFFLINE ..."
set -euo pipefail
session=${1:?session}; arms=${2:?arms}
[[ $session =~ ^[a-z0-9-]+$ ]] || exit 2
here=$(cd "$(dirname "$0")" && pwd)
i=0; rc=0
for arm in $arms; do
  i=$((i+1)); label=${arm%%:*}; off=${arm#*:}; [[ -n $off ]] || off=-
  python3 -c 'import shutil,os,sys; sys.exit(0 if shutil.disk_usage(os.path.expanduser("~")).free >= 15*1024**3 else 3)' || { echo "refusing arm $i: under 15 GiB free" >&2; rc=3; break; }
  COLD_SESSION="tx2-cold-$session" "$here/stack-arm.sh" "tx2-cold-$session-$i-$label" "$off" || { rc=$?; echo "arm $i failed rc=$rc" >&2; break; }
done
"$here/guest-cpus.sh" online > /dev/null
exit "$rc"
