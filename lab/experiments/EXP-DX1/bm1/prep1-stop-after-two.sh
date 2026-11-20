#!/usr/bin/env bash
set -euo pipefail

base=/var/tmp/triplex-bm1
root=$base/day-n20-prep1-tenant
campaign=$root/campaign
repo=$root/build/repository
pin=7ca8525a9ea0c3810c7af6ba0b5a0e15552dd534
experiment=lab/experiments/EXP-DX1/prep1
unit=bm1n20-prep1-tenant.service
export DOCKER_HOST=unix:///var/run/docker.sock DX_BARE_METAL=1
export PATH="$root/build/tools/bin:$PATH"

if [[ ${1:?wait or run} == wait ]]; then
  read -r parent arm fence < "$root/finish-current-fence.txt"
  [[ $parent =~ ^[0-9]+$ && $arm =~ ^[0-9]+$ && $fence =~ ^2026-11-20T ]]
  while [[ -r /proc/$arm/stat ]] && [[ $(ps -o stat= -p "$arm") != Z* ]]; do
    sleep 5
  done
  # [DX-BM1] Why: finish the exact already-started child and then discard only the stopped launcher.
  # Rejected: resuming the parent and allowing its normal loop to dispatch unrequested arms.
  if [[ -r /proc/$parent/cmdline ]]; then
    [[ $(tr '\0' ' ' < "/proc/$parent/cmdline") == "bash $experiment/server.sh run $campaign $pin " ]]
    cg=$(systemctl show "$unit" -p ControlGroup --value)
    grep -Fxq "0::$cg" "/proc/$parent/cgroup"
    [[ $(ps -o stat= -p "$parent") == T* ]]
    kill -KILL "$parent"
  fi
  while state=$(systemctl show "$unit" -p ActiveState --value); do
    [[ $state == inactive || $state == failed ]] && break
    sleep 5
  done
  [[ $state == inactive || $state == failed ]]
  [[ -s $campaign/1-2-S/summary.json ]] || printf 'The active one-gateway repeat ended without a verified summary. Preserve its artifacts.\n' >&2
  exit 0
fi

[[ $1 == run && $(id -u) == 0 && -z $(docker ps -q) ]]
[[ $(git -C "$repo" rev-parse HEAD) == "$pin" && -z $(git -C "$repo" status --porcelain) ]]
cd "$repo"
started=$(date -u +%FT%TZ)
failed=0
for cell in 2-1-S 2-0-K; do
  [[ ! -e $campaign/$cell && -z $(docker ps -q) ]]
  temp=$(mktemp "$base/status-prep1-two.XXXXXX")
  printf 'item=prep1 state=measuring-%s since=%s next=tail-backlog\n' "$cell" "$(date -u +%FT%TZ)" > "$temp"
  mv "$temp" "$base/STATUS"
  node lab/bin/heavy.mjs --label "DX-BM1-prep1-$cell" -- \
    timeout -k 20s 1740s bash "$experiment/server.sh" arm "$campaign" "$pin" "$cell" || failed=1
done
(( failed == 0 ))
python3 - "$campaign" "$pin" "$started" <<'PY'
from pathlib import Path
import hashlib,json,sys,time
root,source,started=Path(sys.argv[1]),sys.argv[2],sys.argv[3]
def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f,'sha256').hexdigest()
stamp=time.mktime(time.strptime(started,'%Y-%m-%dT%H:%M:%SZ'))-time.timezone
plan=json.loads((root/'plan.json').read_text())
by_name={arm['id']:arm for arm in plan['arms']}
rows={}
for treatment in ('2-1-S','2-0-K'):
    d=root/treatment
    h=json.loads((d/'header.json').read_text()); c=json.loads((d/'complete.json').read_text())
    file=d/'summary.json'; result=json.loads(file.read_text())
    assert result['source']==h['commit']==c['commit']==source and not result['fixture']
    assert result['slot']==h['slot']==c['slot'] and result['nonce']==h['nonce']==c['nonce']
    assert file.stat().st_mtime >= (d/'header.json').stat().st_mtime >= stamp-1
    assert result['planSha']==digest(root/'plan.json') and result['seedSha']==digest(root/'seed.json')
    assert result['dumpSha']==next(line.split()[0] for line in (root/'SEAL.sha256').read_text().splitlines() if line.endswith('  seed.pgdump'))
    assert len(result['cells'])==len(by_name[treatment]['cells'])==8
    assert all((c['cell'],c['offered'])==(e['label'],e['offered']) for c,e in zip(result['cells'],by_name[treatment]['cells']))
    rows[treatment]={'slot':h['slot'],'nonce':h['nonce'],'summarySha256':digest(file),'cells':result['cells']}
with (root/'two-gateway-pair.json').open('x') as f:
    json.dump(dict(source=source,started=started,arms=rows),f,indent=2); f.write('\n')
PY
