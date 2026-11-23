#!/usr/bin/env bash
# [DX-DEMO1] Why: run a fresh Datomic peer with the image's own Java and jars on the stack's private network.
# Rejected: installing Java and a second Datomic distribution on the host.
# Usage: DEMO_PREFIX=tx2-dxdemo1-... DEMO_IMAGE=... java.sh JAVA_ARGS...
# Absolute host paths in the arguments are mounted read-only at the same path; the host network is never used.
set -euo pipefail
prefix=${DEMO_PREFIX:?} image=${DEMO_IMAGE:?}
[[ $prefix =~ ^tx2-dxdemo1-[a-z0-9-]+$ ]]
mounts=()
seen=" "
for arg in "$@"; do
  IFS=: read -r -a parts <<< "$arg"
  for part in "${parts[@]}"; do
    part=${part##*=}; part=${part%/\*}
    [[ $part == /* && -e $part ]] || continue
    dir=$part; [[ -d $dir ]] || dir=$(dirname "$part")
    [[ $seen == *" $dir "* ]] && continue
    seen+="$dir "
    mounts+=(-v "$dir:$dir:ro")
  done
done
exec docker run --rm --pull never --network "$prefix-net" --memory 2g --memory-swap 2g \
  ${mounts[@]+"${mounts[@]}"} -e AGE_ATTEMPT -e DATOMIC_URI_TEMPLATE --entrypoint java "$image" "$@"
