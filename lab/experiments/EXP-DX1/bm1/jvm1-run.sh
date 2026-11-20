#!/usr/bin/env bash
set -euo pipefail

action=${1:?usage: jvm1-run.sh run|retry|cleanup ROOT PRODUCER_SHA}
root=${2:?}
source=${3:?}
[[ $root == /var/tmp/triplex-bm1/day-n20-jvm1 && $source =~ ^[0-9a-f]{40}$ ]]
repo=$root/build/repository
helper=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/jvm1-evidence.mjs
cd "$repo"
[[ $(git rev-parse HEAD) == "$source" ]]
git diff --exit-code HEAD --quiet
export PATH="$root/build/tools/bin:$PATH" DOCKER_HOST=unix:///var/run/docker.sock
export DX_BARE_METAL=1

status() {
  local tmp
  tmp=$(mktemp "$root/status.XXXXXX")
  printf 'item=jvm1 state=%s since=%s next=%s\n' "$1" "$(date -u +%FT%TZ)" "$2" > "$tmp"
  mv "$tmp" /var/tmp/triplex-bm1/STATUS
}

cleanup() {
  local base slot line items rc=0
  if [[ -s $root/snapshot-provision/owned-slot ]]; then
    read -r slot < "$root/snapshot-provision/owned-slot"
    [[ $slot =~ ^tx2-dxt1-jvm1-[0-9a-f-]{36}$ ]] || return 2
    timeout 120s bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes || return 1
    items=$(docker ps -a --format '{{.Names}}' && docker volume ls --format '{{.Name}}' && docker network ls --format '{{.Name}}') || return 1
    if grep -q "^$slot-" <<<"$items"; then return 1; fi
    mv "$root/snapshot-provision/owned-slot" "$root/snapshot-provision/cleaned-slot"
  fi
  for base in "$root/seed" "$root/small" "$root/campaign" "$root/retry"; do
    [[ -f $base/active-slot ]] || continue
    read -r slot < "$base/active-slot"
    [[ $slot =~ ^tx2-dxt1-jvm1-[0-9a-f-]{36}$ ]] || return 2
    python3 - "$base" "$source" "$slot" <<'PY' || return 2
import json
from pathlib import Path
import sys

base, source, slot = sys.argv[1:]
identities = [json.loads(file.read_bytes()) for file in Path(base, "results").glob("*/identity.json")]
assert sum(row["source"] == source and row["slot"] == slot for row in identities) == 1
PY
    # [DX-BM1] Why: a killed producer cannot run its finally block, but the source and slot must still match.
    # Rejected: clearing the whole Docker daemon or deleting the files from the failed arm.
    for line in pg tx gw-w gw-r; do
      timeout 15s docker logs --timestamps "$slot-$line" > "$base/aborted-$line.log" 2>&1 || true
    done
    timeout 120s bash lab/experiments/EXP-DX1/stack/down.sh "$slot" --volumes || rc=$?
    items=$(
      docker ps -a --format '{{.Names}}' &&
      docker volume ls --format '{{.Name}}' &&
      docker network ls --format '{{.Name}}'
    ) || return 1
    if grep -q "^$slot-" <<<"$items"; then return 1; fi
    [[ $rc == 0 ]] || return "$rc"
    mv "$base/active-slot" "$base/cleaned-slot"
  done
}

if [[ $action == cleanup ]]; then
  if ! cleanup; then status cleanup-failed operator; exit 1; fi
  if [[ ${SERVICE_RESULT:-success} != success ]] &&
     ! grep -Eq '^item=jvm1 state=([-a-z]+-incomplete|measurement-uncollected) ' /var/tmp/triplex-bm1/STATUS; then
    status stopped next-ready-item
  fi
  exit 0
fi
[[ $(id -u) == 0 && ( $action == run || $action == retry ) ]]

if [[ $action == retry ]]; then
  # [DX-BM1] Why: the sealed input and real small native proof already passed before the restore timeout.
  # Rejected: repeating the two-hour seed or labelling the first incomplete arm a measurement.
  export DOCKER_HOST=unix:///var/run/docker.sock
  [[ -z $(docker ps -q) ]]
  python3 - "$root" "$source" <<'PY'
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root, source = Path(sys.argv[1]), sys.argv[2]
small = root/"small/results/small"
producer = small/"producer-small.json"
checked = json.loads((small/"collector-small.json").read_bytes())
assert checked["arm"]["source"] == source and checked["reading"]["offered"] == 8
assert checked["producerSha256"] == hashlib.sha256(producer.read_bytes()).hexdigest()
assert "ETIMEDOUT" in (root/"campaign.log").read_text()
tag = "tx2-datomic:1.0.7745-da00"
images = json.loads((root/"build/results/images.json").read_bytes())
image, = [row for row in images if tag in row.get("RepoTags", [])]
subprocess.run(["docker","image","tag",image["Id"],tag],check=True,timeout=30)
PY
  status preparing-cold-snapshot campaign
  node lab/bin/heavy.mjs --label DX-BM1-jvm1-cold-snapshot -- \
    python3 "$(dirname -- "$helper")/jvm1-snapshot.py" provision
  cleanup
  mkdir "$root/restore-compat"
  install -m 755 "$(dirname -- "$helper")/jvm1-snapshot.py" "$root/restore-compat/docker"
  status measuring-cold-clones next-ready-item
  PATH="$root/restore-compat:$PATH" node lab/bin/heavy.mjs --label DX-BM1-jvm1-retry -- \
    node --import tsx lab/experiments/EXP-DX1/jvm1/server.ts run "$root/retry" "$root/seed"
  node --import tsx "$helper" check-campaign "$repo" "$root/retry" "$source" "$root/seed"
  status measured next-ready-item
  exit 0
fi

# [DX-BM1] Why: the next native phase starts as soon as the existing seed service has exited.
# Rejected: querying Docker on a timer while its seed verifier is still using the server.
while systemctl is-active --quiet bm1n20-jvm1-seed.service; do sleep 10; done
if ! python3 - "$root/seed" <<'PY'
import json
from pathlib import Path
import sys

seed = Path(sys.argv[1])
assert (seed / "seed.json").stat().st_size > 0
cleanup = json.loads((seed / "results/seed/cleanup.json").read_bytes())
assert cleanup == {"containers": [], "networks": [], "volumes": []}
PY
then
  status seed-incomplete next-ready-item
  exit 1
fi

status checking-small campaign
if ! node lab/bin/heavy.mjs --label DX-BM1-jvm1-small -- \
    node --import tsx "$helper" produce-small "$repo" "$root/small" "$source" ||
   ! node --import tsx "$helper" check-small "$repo" "$root/small" "$source"; then
  status small-incomplete next-ready-item
  exit 1
fi
status measuring next-ready-item
if ! node lab/bin/heavy.mjs --label DX-BM1-jvm1-campaign -- \
    node --import tsx lab/experiments/EXP-DX1/jvm1/server.ts run "$root/campaign" "$root/seed"; then
  status campaign-incomplete next-ready-item
  exit 1
fi
if ! node --import tsx "$helper" check-campaign "$repo" "$root/campaign" "$source" "$root/seed"; then
  status measurement-uncollected next-ready-item
  exit 1
fi
status measured next-ready-item
