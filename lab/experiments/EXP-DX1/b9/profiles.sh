#!/usr/bin/env bash
# [DX-B9-A] Why: convert completed recordings after measured work, under the same resource rules.
# Rejected: profiling on the load-generator CPUs during a timed phase.
set -euo pipefail
id=${1:?fresh id}; shift
[[ $id =~ ^[a-z0-9-]+$ ]]
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9/$id; mkdir "$out"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
python3 -c 'import shutil;assert shutil.disk_usage("/System/Volumes/Data").free>=15*1024**3'
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-B9","pid":%d}\n' $$ > "$lock/owner.json"
name=tx2-dxb9-$id-tool
cleanup() { rc=$?; trap - EXIT; docker rm -f "$name" >/dev/null 2>&1 || true; sh lab/bin/host-quiet.sh > "$out/host-after.jsonl" || true; rm "$lock/owner.json"; rmdir "$lock"; exit "$rc"; }
trap cleanup EXIT
sh lab/bin/host-quiet.sh > "$out/host-before.jsonl" || true
for input in "$@"; do
 [[ -s $input ]]
 stem=$(basename "$(dirname "$input")")-$(basename "$input" .jfr)
 node lab/experiments/EXP-DX1/b6/bounded-command.mjs 60 docker run --rm --pull never --name "$name" --cpuset-cpus 4,5,6,7 --memory 2g -v "$(dirname "$input"):/input:ro" --entrypoint /opt/java/openjdk/bin/jfr tx2-datomic:1.0.7745-da00 print --json --events jdk.ExecutionSample --stack-depth 128 "/input/$(basename "$input")" > "$out/$stem.json"
 arm=$(basename "$input"); arm=${arm%%-*}
 phases=(); for p in "$(dirname "$input")"/"$arm"/tx2-*/driver/{pull-load,mixed}.json; do [[ ! -f $p ]] || phases+=("$p"); done
 python3 lab/experiments/EXP-DX1/b8/profile.py "$out/$stem.json" ${phases[@]+"${phases[@]}"} > "$out/$stem-summary.json"
 zstd -q --rm "$out/$stem.json"
done
