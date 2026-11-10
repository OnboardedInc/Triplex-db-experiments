#!/usr/bin/env bash
# [XN-S2-LIVE] Why: inspect the immutable AWS classpath under the exclusive VM lock. Rejected: downloading documentation.
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
base=lab/experiments/EXP-XN1/spike-s2
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S2/live
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"XN-S2","pid":%s}\n' "$$" > "$lock/owner.json"
awake=
cleanup(){ set +e; docker rm -fv tx2-xns2-aws-inspect; docker volume rm tx2-xns2-aws-inspect-data; if [[ $awake == started\ * ]]; then "$base/keep-awake-fixed.sh" stop; fi; date -u +%FT%TZ > "$out/extract-ended.txt"; rm "$lock/owner.json"; rmdir "$lock"; }
trap cleanup EXIT
awake=$("$base/keep-awake-fixed.sh" start); printf '%s\n' "$awake" > "$out/extract-awake-start.txt"
"$base/keep-awake-fixed.sh" status > "$out/extract-awake-status.txt"
grep -q 'running 8' "$out/extract-awake-status.txt"; grep -q '"onePerCpu": true' "$out/extract-awake-status.txt"
date -u +%FT%TZ > "$out/extract-started.txt"
docker image inspect ghcr.io/xtdb/xtdb-aws:2.2.0 apache/kafka:4.1.1 cgr.dev/chainguard/minio:latest chrislusf/seaweedfs:3.97 node:22.23.2-bookworm-slim > "$out/images.json"
docker create --pull never --name tx2-xns2-aws-inspect -v tx2-xns2-aws-inspect-data:/var/lib/xtdb --entrypoint sh ghcr.io/xtdb/xtdb-aws:2.2.0 -c true > "$out/extract-container-id.txt"
docker cp tx2-xns2-aws-inspect:/usr/local/lib/xtdb/xtdb.jar "$out/xtdb-aws.jar"
