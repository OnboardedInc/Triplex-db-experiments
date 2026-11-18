#!/usr/bin/env bash
# [DX-BM1] Why: publish a stable, checksummed transfer after each bench item, even when its benchmark fails.
# Rejected: copying a live trace or depending on a final bootstrap archive after all runs.
set -euo pipefail
root=${1:?bench root}
tag=${2:?unique collection tag}
run=${3:?terminal run directory}
[[ $root == /* && $root != / && $tag =~ ^[a-z0-9][a-z0-9-]*$ && -d $run ]] || exit 2
shift 3
mkdir -p "$root/bundles"
out="$root/bundles/$tag"
[[ ! -e $out ]] || { echo "Bundle already published: $tag" >&2; exit 2; }
temp=$(mktemp -d "$root/bundles/.${tag}.XXXXXX")
trap 'rm -rf -- "$temp"' EXIT
chmod 0755 "$temp"
(
  date -u '+%FT%TZ'
  uname -srmo
  lscpu -e=CPU,NODE,SOCKET,CORE,ONLINE,MAXMHZ,MINMHZ
  grep -H . /sys/devices/system/cpu/smt/active /sys/devices/system/cpu/cpufreq/policy*/scaling_governor
  cat /sys/devices/system/cpu/cpuidle/current_driver /proc/cmdline
  findmnt -T "$root" -o SOURCE,TARGET,FSTYPE,OPTIONS
  lsblk -o NAME,MODEL,SIZE,TYPE,FSTYPE,MOUNTPOINTS
  free -h
  swapon --show
) > "$temp/bench-condition.txt"
cp "$root/fsync.json" "$root/preflight.log" "$temp/"
if (($#)); then
  mkdir "$temp/controller"
  for file in "$@"; do cp "$file" "$temp/controller/"; done
  tar -C "$temp" -c --use-compress-program='zstd -q -T1 -1' -f "$temp/controller.tar.zst" controller
  rm -r "$temp/controller"
fi

cd "$run"
raw=()
for dir in trace/raw driver/trace/raw state/trace/raw; do
  if [[ -d $dir && -n $(find "$dir" -type f -print -quit) ]]; then raw+=("$dir"); fi
done
tar -c --use-compress-program='zstd -q -T1 -1' -f "$temp/reports.tar.zst" \
  --exclude='./trace/raw' --exclude='./driver/trace/raw' --exclude='./state/trace/raw' .
if (("${#raw[@]}")); then
  tar -c --use-compress-program='zstd -q -T1 -1' -f "$temp/raw.tar.zst" "${raw[@]}"
  raw_bytes=$(stat -c %s "$temp/raw.tar.zst")
  raw_sha=$(sha256sum "$temp/raw.tar.zst" | cut -d ' ' -f 1)
  if ((raw_bytes < 4 * 1024 ** 3)); then
    printf 'transfer %s %s\n' "$raw_bytes" "$raw_sha"
  else
    mv "$temp/raw.tar.zst" "$temp/raw-over-limit.tar.zst"
    printf 'server-only %s %s\n' "$raw_bytes" "$raw_sha"
  fi
else
  printf 'unavailable 0 -\n'
fi > "$temp/raw-transfer.txt"
printf '%s\n' "$tag" > "$temp/collection-tag.txt"
(
  cd "$temp"
  find . -maxdepth 1 -type f ! -name raw-over-limit.tar.zst ! -name TRANSFER.sha256 -printf '%P\0' |
    LC_ALL=C sort -z | xargs -0 sha256sum > TRANSFER.sha256
)
mv -T "$temp" "$out"
printf 'Published %s\n' "$tag"
