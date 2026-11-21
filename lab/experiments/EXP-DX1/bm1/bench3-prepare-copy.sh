#!/usr/bin/env bash
set -euo pipefail

# [DX-BM1] Why: prepare a new independent data directory for each destructive test
# and bind it to the held inventory before relocating its WAL.
# Rejected: opening the only pristine input or treating a control-file match as a full copy.
root=$1
item=$2
layout=$3
[[ $root == /var/tmp/triplex-bm1/bench3 && $EUID == 0 && $(systemd-detect-virt) == none ]]
[[ $item =~ ^[a-z][a-z0-9-]+$ && $layout =~ ^(internal|separate)$ ]]
export DOCKER_HOST=unix:///var/run/docker.sock
held=$root/verified-seed
prepared=$root/queue/$item/prepared
mount=/mnt/triplex-bench3-wal
wal=$mount/queue-$item
[[ -s $root/seed-verification.json && ! -e $prepared && -z $(docker ps -q) ]]
df -Pk "$root" | awk 'NR==2 {exit ($4 < 160000000)}'
if [[ $layout == separate ]]; then
  [[ $(findmnt -nro SOURCE --mountpoint "$mount") == /dev/nvme1n1 && ! -e $wal ]]
fi
mkdir -m 0700 "$prepared"
cp -a -- "$held"/{image.json,transfer.json,sealed-pgdata.json} "$prepared/"
cp -a --reflink=never -- "$held/cluster" "$prepared/cluster"
python3 "$root/bench3-seed.py" verify "$prepared" > "$prepared/inventory.json"
if [[ $layout == separate ]]; then
  cp -a --reflink=never -- "$prepared/cluster/pg_wal" "$wal"
  diff -qr -- "$prepared/cluster/pg_wal" "$wal"
  mv -- "$prepared/cluster/pg_wal" "$prepared/original-wal"
  ln -s /wal "$prepared/cluster/pg_wal"
  sync -f "$wal"
fi
sync -f "$prepared"
date -u +%FT%TZ > "$prepared/ready.txt"
