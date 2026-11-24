#!/usr/bin/env bash
# [DX-W3] Server side: record the read gateway's web-thread and read-permit counters once a second through a run.
# The gateway must run with DX_THREAD_COUNTERS=1 (TX2_THREAD_COUNTERS=1), which also keeps 50 ms peaks inside the
# gateway, so a starved second is still visible afterwards. Each sample is one bash /dev/tcp request run inside the
# read gateway's container (about a millisecond of its CPU a second); nothing joins the stack's network, so the
# card's own teardown is unchanged. The loop ends by itself when the container is gone.
#   bash lab/experiments/EXP-DX1/w3/threads-sampler.sh OUT_FILE [CONTAINER]   (run it in the background)
#   CONTAINER defaults to the one running tx2-dxscale1-v01-*-gw-r, waited for up to 30 minutes.
set -uo pipefail
out=${1:?output file}
container=${2:-}
if [[ -z $container ]]; then
  for ((i=0; i<1800; i++)); do
    found=$(docker ps --format '{{.Names}}' | grep -E '^tx2-dxscale1-v01-.*-gw-r$' || true)
    [[ $(printf '%s' "$found" | grep -c .) == 1 ]] && break
    sleep 1
  done
  [[ $(printf '%s' "${found:-}" | grep -c .) == 1 ]] || { echo "no single card read gateway found" >&2; exit 3; }
  container=$found
fi
echo "{\"container\":\"$container\",\"startedAtMs\":$(date +%s%3N)}" > "$out"
while docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -q true; do
  at=$(date +%s%3N)
  body=$(timeout 2 docker exec "$container" bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /v2/admin/threads HTTP/1.0\r\n\r\n" >&3 && cat <&3' 2>/dev/null | tail -1)
  if [[ $body == \{* ]]; then echo "{\"at\":$at,\"threads\":$body}" >> "$out"; else echo "{\"at\":$at,\"error\":\"no answer within 2 s\"}" >> "$out"; fi
  sleep 1
done
gzip -f "$out"
