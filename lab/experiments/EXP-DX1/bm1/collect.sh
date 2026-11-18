#!/usr/bin/env bash
# [DX-BM1] Why: verify copied server bytes before publishing evidence into the durable Mac directory.
# Rejected: a live rsync that can mix running and terminal files or replace a sealed first failure.
set -euo pipefail
bench=${1:?SSH destination for the bench server}
shift
[[ $bench =~ ^ubuntu@[a-zA-Z0-9.:-]+$ && $# -gt 0 ]] || exit 2
root=${DX_BM1_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence}
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
ssh_bench=(ssh -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}"
  -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes -o StrictHostKeyChecking=yes "$bench")
umask 077
mkdir -p "$root/DX-BM1"
for tag in "$@"; do
  [[ $tag =~ ^[a-z0-9][a-z0-9-]*$ ]] || exit 2
  remote="/var/tmp/triplex-bm1/bundles/$tag"
  dest="$root/DX-BM1/$tag"
  if [[ ! -e $dest ]]; then
    stage=$(mktemp -d "$root/DX-BM1/.${tag}.XXXXXX")
    trap 'rm -rf -- "$stage"' EXIT
    mkdir "$stage/transfer"
    "${ssh_bench[@]}" "cat '$remote/TRANSFER.sha256'" > "$stage/transfer/TRANSFER.sha256"
    while read -r hash name; do
      [[ $hash =~ ^[0-9a-f]{64}$ ]] || exit 2
      case $name in
        reports.tar.zst|raw.tar.zst|controller.tar.zst|bench-condition.txt|fsync.json|preflight.log|raw-transfer.txt|collection-tag.txt) ;;
        *) echo "Unexpected archive member: $name" >&2; exit 2 ;;
      esac
      "${ssh_bench[@]}" "cat '$remote/$name'" > "$stage/transfer/$name"
    done < "$stage/transfer/TRANSFER.sha256"
    (cd "$stage/transfer"; shasum -a 256 -c TRANSFER.sha256)
    [[ $(cat "$stage/transfer/collection-tag.txt") == "$tag" ]]
    zstd -dc "$stage/transfer/reports.tar.zst" | tar -xf - -C "$stage"
    if [[ -f $stage/transfer/raw.tar.zst ]]; then
      zstd -dc "$stage/transfer/raw.tar.zst" | tar -xf - -C "$stage"
    fi
    mkdir "$stage/machine"
    for file in delivered.txt delivered-nvme.txt; do
      [[ ! -f $root/DX-BM1/machine/$file ]] || cp "$root/DX-BM1/machine/$file" "$stage/machine/"
    done
    for file in bench-condition.txt fsync.json preflight.log; do cp "$stage/transfer/$file" "$stage/machine/"; done
    mv "$stage" "$dest"
    trap - EXIT
  fi
  (cd "$dest/transfer"; shasum -a 256 -c TRANSFER.sha256 >/dev/null)
  if [[ -f $dest/trace-summary.json ]]; then
    # [DX-BM1] Why: the shared registry keys on the directory name; the copied report retains its original slot.
    # Rejected: renaming the scope in the evidence or indexing the archive without its observed trace summary.
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register "$dest"
  fi
  printf 'Collected %s\n' "$dest"
done
