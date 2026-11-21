#!/usr/bin/env bash
set -euo pipefail

base=/var/tmp/triplex-bm1
root=$base/night-n20-prep-tail
repo=$root/build/repository
pin=df1b45d6bca9013dfc7a6adc79c961242dfc5a03
exp=lab/experiments/EXP-DX1
disk=/dev/nvme1n1
mode=${1:?run or cleanup}
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export DX_NATIVE_BOOTSTRAP_CACHE=$base/day-p3r/checkout

status() {
  local pending
  pending=$(mktemp "$base/status-tail.XXXXXX")
  printf 'item=prep1-tail state=%s since=%s next=operator-review\n' "$1" "$(date -u +%FT%TZ)" > "$pending"
  mv "$pending" "$base/STATUS"
}

if [[ $mode == cleanup ]]; then
  if [[ -s $root/campaign/prefix ]]; then
    read -r prefix < "$root/campaign/prefix"
    [[ $prefix =~ ^[0-9a-f]{8}$ && $(git -C "$repo" rev-parse HEAD) == "$pin" ]]
    owned() {
      docker ps -a --format '{{.Names}}' && docker network ls --format '{{.Name}}' && docker volume ls --format '{{.Name}}'
    }
    for arm in control wal zgc fair; do
      slot=tx2-dxprep1-$prefix-1-tail-$arm-s
      if grep -q "^$slot-" <<<"$(owned)"; then
        (cd "$repo" && timeout 120s bash "$exp/stack/down.sh" "$slot" --volumes)
      fi
    done
    ! grep -q "^tx2-dxprep1-$prefix-" <<<"$(owned)"
    mount_dir=$root/campaign/wal-mount
    if mountpoint -q "$mount_dir"; then
      [[ $(findmnt -nro SOURCE --mountpoint "$mount_dir") == "$disk" ]]
      umount "$mount_dir"
    fi
  fi
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete; fi
  exit 0
fi

[[ $mode == run && -z $(docker ps -aq) ]]
mkdir "$root"
status preparing
[[ $(findmnt -nro SOURCE /) == /dev/nvme0n1p2 && -b $disk ]]
[[ $(lsblk -nr -o TYPE "$disk") == disk && -z $(findmnt -rn -S "$disk") ]]
[[ -z $(ls -A /sys/class/block/nvme1n1/holders) && -z $(ls -A /sys/class/block/nvme1n1/slaves) ]]
[[ -z $(wipefs -n --noheadings --output TYPE "$disk") ]]
# [DX-BM1] Why: format only the confirmed unused whole device, with lazy writes off before timing.
# Rejected: repartitioning or formatting the system disk, and carrying filesystem initializer writes into the test.
mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0 "$disk" > "$root/filesystem.log" 2>&1
[[ $(blkid -p -s TYPE -o value "$disk") == ext4 && -z $(findmnt -rn -S "$disk") ]]

public=https://github.com/OnboardedInc/Triplex-db-experiments.git
git -c credential.helper= clone --quiet --single-branch --no-checkout --branch exp/DX-PREP1-parallel-prepare "$public" "$root/producer"
git -C "$root/producer" checkout --quiet --detach "$pin"
bash "$root/producer/$exp/t1/bare-metal.sh" --prepare "$pin" "$root/build"

if ! command -v bpftrace >/dev/null; then
  # [DX-BM1] Why: use the distro's signed package and its missing dependencies without changing system package state.
  # Rejected: changing the root installation or running a downloaded shell installer.
  mkdir "$root/bpf-debs" "$root/bpf" "$root/bin"
  (
    cd "$root/bpf-debs"
    mapfile -t packages < <(apt-get -s --no-install-recommends install bpftrace | awk '$1 == "Inst" {print $2}')
    [[ " ${packages[*]} " == *" bpftrace "* ]]
    apt-get download "${packages[@]}"
    sha256sum ./*.deb > "$root/bpf-debs.sha256"
    for package in ./*.deb; do dpkg-deb -x "$package" "$root/bpf"; done
  )
  cat > "$root/bin/bpftrace" <<'BPF'
#!/usr/bin/env bash
set -euo pipefail
dist=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../bpf" && pwd)
export LD_LIBRARY_PATH="$dist/usr/lib/x86_64-linux-gnu:$dist/usr/lib/llvm-18/lib"
exec "$dist/usr/bin/bpftrace" "$@"
BPF
  chmod 755 "$root/bin/bpftrace"
  export PATH="$root/bin:$PATH"
fi
export PATH="$root/build/tools/bin:$PATH"
cd "$repo"
[[ $(git rev-parse HEAD) == "$pin" && -z $(git status --porcelain) ]]
bpftrace --version > "$root/bpf-version.txt"
timeout 15s bpftrace -e 'BEGIN { printf("enabled\n"); exit(); }' > "$root/bpf-smoke.log" 2>&1
status measuring
node lab/bin/heavy.mjs --label DX-PREP1-tail -- bash "$exp/prep1/server.sh" tail "$root/campaign" "$pin" "$base/day-n20-prep1-tenant/campaign"
status measured
