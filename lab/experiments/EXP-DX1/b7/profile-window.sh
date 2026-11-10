#!/usr/bin/env bash
# [DX-B7] Why: JFR's Linux reader runs only in an owned locked container. Rejected: downloading a host JDK.
set -euo pipefail
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
prefix=${1:?prefix}
[[ $prefix =~ ^tx2-dxb7-[a-z0-9-]+$ ]] || exit 2
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"DX-B7","pid":%d}\n' $$ > "$lock/owner.json"
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
cleanup() { docker rm -f "$prefix-profile" >/dev/null 2>&1 || true; rm "$lock/owner.json"; rmdir "$lock"; }
trap cleanup EXIT
docker run --rm --pull never --name "$prefix-profile" -v "$root:/evidence" --entrypoint /opt/java/openjdk/bin/jfr tx2-datomic:1.0.7745-da00 print --json --events jdk.ExecutionSample,jdk.GarbageCollection,jdk.GCPhasePause,jdk.JavaMonitorEnter,jdk.JavaThreadStatistics "/evidence/$prefix.jfr" > "$root/$prefix-profile.json"
python3 lab/experiments/EXP-DX1/b7/profile.py "$root/$prefix-profile.json" > "$root/$prefix-profile-summary.json"
