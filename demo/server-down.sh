#!/usr/bin/env bash
# [DX-DEMO1] Stop the demo stack and leave the working copy cleanly shut down, so the next server-up.sh can reuse it
# (with the demo's changes) or replace it with --reset. The original cluster is not touched.
#
#   sudo bash demo/server-down.sh            (rented machine)
#   bash demo/server-down.sh --toy           (Mac lab VM)
#   add --delete-work to also remove the working copy (frees about 177 GB on the server)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/.." && pwd)
cd "$repo"
toy=0 delete_work=0
for arg in "$@"; do
  case $arg in --toy) toy=1;; --delete-work) delete_work=1;; *) echo "unknown option $arg" >&2; exit 2;; esac
done
if [[ $toy == 1 ]]; then
  export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
  root=${DEMO_ROOT:-$HOME/Claude/Projects/triplex-db-2/demo-toy}
  work=tx2-dxdemo1-toy-work
else
  [[ $(uname -s) == Linux && $EUID == 0 ]] || { echo 'Run as root on the rented Linux machine' >&2; exit 2; }
  export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
  root=${DEMO_ROOT:-/var/tmp/triplex-demo}
  work=$root/work/cluster
  export DX_BARE_METAL_ROOT=$root/state
fi
start=$SECONDS
if [[ -s $root/stack.prefix ]]; then
  prefix=$(cat "$root/stack.prefix")
  [[ $prefix =~ ^tx2-dxdemo1-[a-z0-9-]+$ ]]
  # Clients first, then the transactor, then PostgreSQL with a fast (clean) shutdown and a long grace period.
  docker stop -t 10 "$prefix-gw-r" "$prefix-gw-w" >/dev/null 2>&1 || true
  docker stop -t 60 "$prefix-tx" >/dev/null 2>&1 || true
  docker stop -t 600 "$prefix-pg" >/dev/null 2>&1 || true
  bash lab/experiments/EXP-DX1/stack/down.sh "$prefix"
  rm -f "$root/stack.prefix" "$root/ready.json"
fi
state=unknown
if [[ $toy == 1 ]] && docker volume inspect "$work" >/dev/null 2>&1; then
  state=$(docker run --rm --pull never --network none -v "$work:/d:ro" --entrypoint pg_controldata postgres:17-alpine /d |
    sed -n 's/^Database cluster state:[[:space:]]*//p')
  if [[ $delete_work == 1 ]]; then docker volume rm "$work" >/dev/null; state="deleted"; fi
elif [[ $toy == 0 && -e $work ]]; then
  [[ ! -e $work/postmaster.pid ]] && state="shut down (no postmaster.pid)" || state="NOT clean: postmaster.pid present"
  if [[ $delete_work == 1 ]]; then rm -rf --one-file-system -- "$work"; state="deleted"; fi
fi
printf 'DEMO DOWN in %d s; working copy: %s\n' "$((SECONDS - start))" "$state"
