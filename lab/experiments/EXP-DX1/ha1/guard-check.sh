#!/usr/bin/env bash
# [DX-HA1] Why: reproduce tonight's launch decisions on the Mac from the exact pinned files, with no stack started.
# Rejected: running the launchers on the Mac (they require the bare-metal host) or judging the guard by reading it.
# Usage (Mac, repository root): node lab/bin/heavy.mjs --label DX-HA1-guard -- bash lab/experiments/EXP-DX1/ha1/guard-check.sh
set -euo pipefail
export COPYFILE_DISABLE=1
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
[[ $(docker context show) == colima ]]
here=lab/experiments/EXP-DX1/ha1
work=$(mktemp -d)
trap 'rm -rf "$work"; docker volume rm -f tx2-dxha1-guard-node >/dev/null 2>&1 || true' EXIT
mkdir -p "$work/w/trees" "$work/w/dry-run"
cp "$here/dry-run/docker" "$work/w/dry-run/docker"; cp "$here/launch-dry-run.sh" "$work/w/launch-dry-run.sh"; cp "$here/guard-cases.sh" "$here/guard-cases.txt" "$work/w/"
mv "$work/w/guard-cases.txt" "$work/w/cases.txt"
for commit in $(awk '!/^#/ && NF {print $2}' "$here/guard-cases.txt" | sort -u); do
  mkdir "$work/w/trees/$commit"
  git archive "$commit" -- lab/experiments/EXP-DX1/stack lab/config/datomic packages/datomic/gateway packages/datomic/src/codec-spec.json ':(glob)lab/experiments/EXP-DX1/**/*.ts' \
    ':(glob)lab/experiments/EXP-DX1/**/*.mjs' ':(exclude,glob)**/*.test.ts' | tar -x -C "$work/w/trees/$commit"
done
docker volume create tx2-dxha1-guard-node >/dev/null
docker run --rm --network none -v tx2-dxha1-guard-node:/out node:22.23.2-bookworm-slim cp /usr/local/bin/node /out/node
tar --no-xattrs --no-mac-metadata -C "$work" -cf - w | docker run --rm -i --network none --cpus 1 --memory 512m -v tx2-dxha1-guard-node:/opt/node:ro \
  --tmpfs /mnt/wal:rw,size=8m --entrypoint bash python:3.13-slim-bookworm -c 'tar -x -C / && bash /w/guard-cases.sh'
