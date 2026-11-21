#!/usr/bin/env bash
set -euo pipefail

base=/var/tmp/triplex-bm1
root=$base/night-n20-erasure-image
small=$base/night-n20-erasure-small
pin=4054f548469e57b6aa82b06e93711c39b6867f7c
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mode=${1:?run or cleanup}
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1

status() {
  local tmp
  tmp=$(mktemp "$base/status-erasure-retry.XXXXXX")
  printf 'item=erasure-image state=%s since=%s next=operator-review\n' "$1" "$(date -u +%FT%TZ)" > "$tmp"
  mv "$tmp" "$base/STATUS"
}

if [[ $mode == cleanup ]]; then
  if [[ -f $root/request.json ]]; then
    python3 "$here/erase-runner.py" cleanup "$root/request.json" || { status cleanup-failed; exit 1; }
  fi
  if [[ ${SERVICE_RESULT:-success} != success ]]; then status incomplete; fi
  exit 0
fi

[[ $mode == run && -z $(docker ps -q) ]]
mkdir "$root"
# [DX-BM1] Why: reuse the exact accepted small native fixture at the same producer pin.
# Rejected: repeating its erasures after a port-only failure before full staging.
python3 - "$root" "$small" "$pin" <<'PY'
from pathlib import Path
import hashlib
import json
import sys
import time

root, small = map(Path, sys.argv[1:3])
source = sys.argv[3]
def read(file):
    return json.loads(file.read_bytes())
def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()
small_request = small/"request.json"
request = read(small_request)
stage = read(small/"stage/staged.json")
cleanup = read(small/"erase-clean.json")
measurement = small/"collector.json"
assert request["source"] == stage["source"] == cleanup["source"] == source
assert request["tag"] == "erasen20small" and cleanup["requestSha256"] == sha(small_request)
assert stage["people"] == 128 and stage["nonce"] == cleanup["nonce"] and not cleanup["remaining"]
assert measurement.stat().st_mtime >= request["start"] and read(measurement)["source"] == source
assert read(measurement)["people"] == stage["people"]
now = time.time()
with (root/"request.json").open("x") as stream:
    json.dump(dict(root=str(root),directory=str(root),tag="erasen20image",item=34,
                   start=now,deadline=now+18400,source=source,smallAgreementSha256=sha(measurement)),stream)
PY
status staging
python3 "$here/erase-runner.py" run "$root/request.json"
python3 "$here/erase-runner.py" cleanup "$root/request.json"
status measured
