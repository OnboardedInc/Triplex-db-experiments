#!/usr/bin/env bash
# [DX-ACT7] A prepared copy for held-server.sh, as actv-lazy/PART9.md describes it, from a stopped PostgreSQL 17
# template (the fresh SCALE1 template or the sealed 1 billion cluster): a private byte copy with no hard links, its WAL
# bytes copied to a directory on the other device, and the copy's pg_wal a link to /wal (the container's mount).
#   sudo bash lab/experiments/EXP-DX1/actv-lazy/act7/prepare-copy.sh TEMPLATE PREPARED WAL
# The template is only read. PREPARED and WAL must not exist or be empty. Remove both after the run
# (rm -rf --one-file-system); the held runner leaves them for the caller.
set -euo pipefail
template=${1:?stopped template}; prepared=${2:?new prepared directory}; wal=${3:?new WAL directory on the other device}
[[ $(uname -s) == Linux && $EUID == 0 ]] || { echo "run as root on the rented Linux machine" >&2; exit 2; }
[[ $(cat "$template/PG_VERSION") == 17 && -d $template/pg_wal && ! -L $template/pg_wal ]]
for marker in postmaster.pid backup_label standby.signal recovery.signal; do [[ ! -e $template/$marker ]]; done
for d in "$prepared" "$wal"; do [[ ! -e $d || -z $(ls -A "$d") ]] || { echo "$d is not empty" >&2; exit 2; }; mkdir -p "$d"; done
[[ $(stat -c %d "$prepared") != $(stat -c %d "$wal") ]] || { echo "PREPARED and WAL must be on different devices" >&2; exit 2; }
start=$SECONDS
cp -a "$template/." "$prepared/"
rm -rf "$prepared/pg_wal"
ln -s /wal "$prepared/pg_wal"
cp -a "$template/pg_wal/." "$wal/"
chown --reference="$template/pg_wal" "$wal"; chmod --reference="$template/pg_wal" "$wal"
cmp "$template/global/pg_control" "$prepared/global/pg_control"
[[ -z $(find "$prepared" "$wal" -xdev -type f -links +1 -print -quit) ]]
echo "[act7] prepared copy in $((SECONDS - start)) s: $(du -sh --apparent-size "$prepared" | cut -f1) + WAL $(du -sh "$wal" | cut -f1)"
