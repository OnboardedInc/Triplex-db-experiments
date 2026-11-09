#!/bin/bash
set -euo pipefail
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-S1
docker run --rm --name tx2-dxs1-pair --network tx2-dxs1-net --cpuset-cpus 2 -m 2g -v "$SRC:/spike:ro" -v "$OUT:/evidence" -e DATOMIC_EXT_CLASSPATH=/spike -e DATOMIC_JAVA_OPTS='-Xms1g -Xmx1g' -w /opt/datomic --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m spike.pair
