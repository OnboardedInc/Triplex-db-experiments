#!/usr/bin/env bash
# [DX-B7] Why: run the actual bundled Peer and Clojure tests under the same owned lock. Rejected: delimiter checks as compilation evidence.
set -euo pipefail
prefix=${1:?prefix}
[[ $prefix =~ ^tx2-dxb7-[a-z0-9-]+$ ]] || exit 2
root=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B7
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
export_args=(-e 'DATOMIC_JAVA_OPTS=-Xms128m -Xmx768m' -e 'DF01_RECORDED_PAGE=/tmp/b7-feed-page.json')
docker exec "${export_args[@]}" "$prefix-gw-w" /opt/datomic/bin/run -m triplex.gateway.selftest > "$root/$prefix-selftest.log" 2>&1
docker exec "${export_args[@]}" "$prefix-gw-w" /opt/datomic/bin/run -m triplex.gateway.feed-test > "$root/$prefix-feed-test.log" 2>&1
docker cp "$prefix-gw-w:/tmp/b7-feed-page.json" "$root/$prefix-feed-page.json"
