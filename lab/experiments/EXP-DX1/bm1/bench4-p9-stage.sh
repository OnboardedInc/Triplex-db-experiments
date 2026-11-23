#!/usr/bin/env bash
set -euo pipefail
# [DX-BM1] Why: stage the failover seed (hasync1/SUNDAY.md step 2-3) from a verified stopped template without touching it.
# Rejected: pointing the run at the template itself (the brief keeps it as the untouched source) or hard links (shared inodes).
# Usage: bench4-p9-stage.sh TEMPLATE_CLUSTER IMAGE_DIR ORIGIN_TAG SEED_DIRECTORY
template=$1 image=$2 tag=$3 seed=$4
[[ $EUID == 0 && $template == /* && $image == /* && $seed == /* && ! -e $seed ]]
[[ $tag =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$ && -f $image/image.json && -f $image/transfer.json ]]
[[ ! -e $template/postmaster.pid && $(cat "$template/PG_VERSION") == 17 && ! -L $template/pg_wal ]]
[[ -z $(find "$template" ! -type f ! -type d -print -quit) ]]
mkdir -m 0700 "$seed.partial"
cp -a "$template" "$seed.partial/PGDATA"
mkdir -p "$seed.partial/origin/$tag"
cp -p "$image/image.json" "$image/transfer.json" "$seed.partial/origin/$tag/"
(cd "$seed.partial/PGDATA" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum > ../SHA256SUMS)
manifest=$(sha256sum "$seed.partial/SHA256SUMS" | cut -d ' ' -f 1)
control=$(docker run --rm --network none --read-only --user 0 \
  --mount "type=bind,source=$seed.partial/PGDATA,target=/pgdata,readonly" postgres:17-alpine \
  sh -c 'LC_ALL=C pg_controldata /pgdata')
grep -Eq 'Database cluster state:[[:space:]]+shut down$' <<< "$control"
cluster=$(sed -nE 's/^Database system identifier:[[:space:]]+([0-9]+)$/\1/p' <<< "$control")
[[ $cluster =~ ^[1-9][0-9]{16,19}$ ]]
mv "$seed.partial" "$seed"
python3 -c 'import json,sys; print(json.dumps(dict(seedDirectory=sys.argv[1], seedSha256=sys.argv[2], cluster=sys.argv[3], files=int(sys.argv[4]), seedOriginTag=sys.argv[5]), indent=2))' \
  "$seed" "$manifest" "$cluster" "$(wc -l < "$seed/SHA256SUMS")" "$tag" | tee "$seed.json"
