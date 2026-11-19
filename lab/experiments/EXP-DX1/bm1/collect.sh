#!/usr/bin/env bash
# [DX-BM1] Why: verify copied server bytes before publishing evidence into the durable Mac directory.
# Rejected: a live rsync that can mix running and terminal files or replace a sealed first failure.
set -euo pipefail
bench=${1:?SSH destination for the bench server}
shift
[[ $bench =~ ^ubuntu@[a-zA-Z0-9.:-]+$ && $# -gt 0 ]] || exit 2
root=${DX_BM1_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence}
repo=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
# [DX-BM1] Why: every fetch must leave stdin with the checksum-list loop.
# Rejected: letting the first SSH process consume the remaining manifest rows.
ssh_bench=(ssh -n -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}"
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
    "${ssh_bench[@]}" "sudo -n cat '$remote/TRANSFER.sha256'" > "$stage/transfer/TRANSFER.sha256"
    while read -r hash name; do
      [[ $hash =~ ^[0-9a-f]{64}$ ]] || exit 2
      case $name in
        reports.tar.zst|raw.tar.zst|controller.tar.zst|bench-condition.txt|fsync.json|preflight.log|raw-transfer.txt|collection-tag.txt) ;;
        *) echo "Unexpected archive member: $name" >&2; exit 2 ;;
      esac
      "${ssh_bench[@]}" "sudo -n cat '$remote/$name'" > "$stage/transfer/$name"
    done < "$stage/transfer/TRANSFER.sha256"
    (cd "$stage/transfer"; shasum -a 256 -c TRANSFER.sha256)
    [[ $(cat "$stage/transfer/collection-tag.txt") == "$tag" ]]
    # [DX-BM1] Why: an interrupted ladder can leave tens of GiB of exact observation chunks.
    # Rejected: expanding those chunks a second time on the Mac when the verified report archive already preserves them.
    zstd -dc "$stage/transfer/reports.tar.zst" | tar -xf - -C "$stage" \
      --exclude '*/observations-ns*/[0-9]*.f64' --exclude '*/observations-ns*/[0-9]*.json'
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
  if [[ -f $dest/trace-summary.json && -f $dest/trace.html ]]; then
    # [DX-BM1] Why: the shared registry keys on the directory name; the copied report retains its original slot.
    # Rejected: renaming the scope in the evidence or indexing the archive without its observed trace summary.
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register "$dest"
  elif [[ -f $dest/ACTIVATION-CHECK.json ]]; then
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register-activation "$dest"
  elif [[ -f $dest/trace-run.json ]]; then
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register-incomplete-benchmark "$dest"
  fi
  printf 'Collected %s\n' "$dest"
done
