#!/usr/bin/env bash
# [DX-BM1] Why: verify copied server bytes before publishing evidence into the durable Mac directory.
# Rejected: a live rsync that can mix running and terminal files or replace a sealed first failure.
set -euo pipefail
bench=${1:?SSH destination for the bench server}
shift
[[ $bench =~ ^ubuntu@[a-zA-Z0-9.:-]+$ && $# -gt 0 ]] || exit 2
root=${DX_BM1_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence}
repo=${DX_BM1_CATALOG_ROOT:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel)}
[[ -f $repo/lab/bin/trace-store.mjs ]] || exit 2
# [DX-BM1] Why: every fetch must leave stdin with the checksum-list loop.
# Rejected: letting the first SSH process consume the remaining manifest rows.
ssh_bench=(ssh -n -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}"
  -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes -o StrictHostKeyChecking=yes "$bench")
umask 077
mkdir -p "$root/DX-BM1"
compact=${DX_BM1_COMPACT:-0}
[[ $compact == 0 || $compact == 1 ]] || exit 2
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
        cutoff.txt|runner-source.txt|"$tag.log"|"$tag.exit")
          [[ $tag =~ ^tx2-dxt1-drv1-[a-z0-9]+-[abc]$ ]] || exit 2 ;;
        *) echo "Unexpected archive member: $name" >&2; exit 2 ;;
      esac
      "${ssh_bench[@]}" "sudo -n cat '$remote/$name'" > "$stage/transfer/$name"
    done < "$stage/transfer/TRANSFER.sha256"
    (cd "$stage/transfer"; shasum -a 256 -c TRANSFER.sha256)
    [[ $(cat "$stage/transfer/collection-tag.txt") == "$tag" ]]
    if [[ $tag =~ ^tx2-dxt1-drv1-[a-z0-9]+-[abc]$ ]]; then
      [[ -s $stage/transfer/runner-source.txt && -s $stage/transfer/$tag.exit && -s $stage/transfer/reports.tar.zst ]]
    fi
    # [DX-BM1] Why: the sealed archive already contains full observation chunks, oracle transport copies and the W0 HTTP corpus.
    # Rejected: expanding those bulky duplicates into the remaining Mac disk before collecting all three activations.
    skip=()
    if [[ $compact == 1 ]]; then
      skip=(--exclude './trace.chrome.json' --exclude './driver/*.db' --exclude './driver/*.db-*'
        --exclude './driver/oracle-case.json' --exclude './driver/oracle-output.json'
        --exclude './driver/observations-ns*-*.jsonl' --exclude './oracle-bridge/*.case.gz'
        --exclude './oracle-bridge/*.output.gz')
    fi
    zstd -dc "$stage/transfer/reports.tar.zst" | tar -xf - -C "$stage" \
      ${skip[@]+"${skip[@]}"} \
      --exclude '*/observations-ns*/[0-9]*.f64' --exclude '*/observations-ns*/[0-9]*.json' \
      --exclude './http/*' --exclude './oracle-bridge/*.output' --exclude './oracle-bridge/*.case'
    if [[ -f $stage/transfer/raw.tar.zst ]]; then
      if [[ $compact == 1 ]]; then
        # [DX-BM1] Why: retain the checksum-verified raw bytes at the catalog location and avoid a second multi-GiB expansion.
        # Rejected: discarding raw evidence or trading the last free disk space for an identical unpacked copy.
        raw_dir=$stage/trace/raw
        if [[ -f $stage/activation-attempt.json ]]; then raw_dir=$stage/state/trace/raw; fi
        mkdir -p "$raw_dir" "$stage/trace/raw"
        ln "$stage/transfer/raw.tar.zst" "$raw_dir/raw.tar.zst"
        zstd -dc "$stage/transfer/raw.tar.zst" | python3 -c '
import pathlib,re,shutil,sys,tarfile
with tarfile.open(fileobj=sys.stdin.buffer,mode="r|") as archive:
    for entry in archive:
        if entry.isfile() and re.fullmatch(r"trace/raw/system-[a-z-]+\.jsonl\.gz",entry.name):
            with (pathlib.Path(sys.argv[1])/entry.name).open("xb") as dest:
                shutil.copyfileobj(archive.extractfile(entry),dest)
' "$stage"
      else
        zstd -dc "$stage/transfer/raw.tar.zst" | tar -xf - -C "$stage"
      fi
    fi
    mkdir "$stage/machine"
    for file in delivered.txt delivered-nvme.txt; do
      [[ ! -f $root/DX-BM1/machine/$file ]] || cp "$root/DX-BM1/machine/$file" "$stage/machine/"
    done
    for file in bench-condition.txt fsync.json preflight.log; do
      if [[ -f $stage/transfer/$file ]]; then cp "$stage/transfer/$file" "$stage/machine/"; fi
    done
    if [[ -f $stage/transfer/runner-source.txt ]]; then cmp "$stage/head.txt" "$stage/transfer/runner-source.txt"; fi
    mv "$stage" "$dest"
    trap - EXIT
  fi
  (cd "$dest/transfer"; shasum -a 256 -c TRANSFER.sha256 >/dev/null)
  if [[ -f $dest/trace-summary.json && -f $dest/trace.html ]]; then
    # [DX-BM1] Why: the shared registry keys on the directory name; the copied report retains its original slot.
    # Rejected: renaming the scope in the evidence or indexing the archive without its observed trace summary.
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register "$dest"
  elif [[ -f $dest/activation-attempt.json || -f $dest/ACTIVATION-CHECK.json ]]; then
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register-activation "$dest"
  elif [[ -f $dest/trace-run.json ]]; then
    TRIPLEX_TRACE_EVIDENCE="$root" node "$repo/lab/bin/trace-store.mjs" register-incomplete-benchmark "$dest"
  fi
  printf 'Collected %s\n' "$dest"
done
