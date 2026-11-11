#!/usr/bin/env bash
set -euo pipefail
prefix=${1:?prefix}
[[ $prefix =~ ^tx2-dxb10-[a-z0-9-]+$ ]] || exit 2
src=${B8_GATEWAY_SRC:?immutable gateway source required}
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
# [DX-B8] Why: the image already has the pinned peer and Clojure dependencies; no host Java or download.
# Rejected: validating a different dependency set on the Mac.
out=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B10/native-artifacts/$prefix
mkdir -p "$out"
status=0
suites=(triplex.gateway.commit-order-test triplex.gateway.cache-key-test dxb8.head-test triplex.gateway.selftest dxb8.feed-test-main)
if [[ ${B8_RECENT_TESTS:-0} == 1 ]]; then suites+=(triplex.gateway.recent-test dxb8.lifecycle-test dxb8.hot-test); fi
if [[ ${B8_NATIVE_FOCUSED:-} == 1 ]]; then suites=(triplex.gateway.commit-order-test triplex.gateway.cache-key-test dxb8.head-test dxb8.feed-test-main); fi
for suite in "${suites[@]}"; do
 recent=0; if [[ $suite == dxb8.hot-test || $suite == dxb8.lifecycle-test || $suite == triplex.gateway.recent-test ]]; then recent=1; fi
 uri='datomic:mem://{db}'
 if [[ $suite == dxb8.head-test ]]; then uri="datomic:sql://{db}?jdbc:postgresql://$prefix-pg:5432/datomic?user=datomic&password=datomic"; fi
 docker run --rm --pull never --name "$prefix-selftest" --network "$prefix-net" --cpuset-cpus 4,5,6,7 --memory 3g --memory-swap 3g \
  -v "$src:/opt/gateway:ro" -v "$PWD/packages/datomic/src/codec-spec.json:/opt/spec/codec-spec.json:ro" -v "$out:/evidence" -e DF01_RECORDED_PAGE=/evidence/recorded-page.json -v "$PWD/lab/experiments/EXP-DX1/b8:/opt/b8:ro" \
  -e "TX2_RECENT_REVISIONS=$recent" -e DATOMIC_JAVA_OPTS=-Dtriplex.codec.spec=/opt/spec/codec-spec.json -e DATOMIC_EXT_CLASSPATH=/opt/gateway/src:/opt/b8 -e "DATOMIC_URI_TEMPLATE=$uri" \
  --entrypoint /opt/datomic/bin/run tx2-datomic:1.0.7745-da00 -m "$suite" || status=1
done
exit "$status"
