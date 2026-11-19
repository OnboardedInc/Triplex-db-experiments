#!/usr/bin/env bash
# [DX-BM1] Why: the next holder can release a queued job after its first item without an idle process or a timed guess.
# Rejected: starting from a wall-clock ETA that might overlap its reader arm or miss a failed cleanup.
set -euo pipefail
mode=${1:?--register, --release, --signal or --start}
batch=${2:?batch}
[[ $batch =~ ^[a-z0-9]{1,12}$ ]] || exit 2
root=/var/tmp/triplex-bm1
pending=$root/deferred-$batch
here=$(cd "$(dirname "$0")" && pwd)
sha=$(git -C "$here" rev-parse HEAD)
if [[ $mode == --release ]]; then
  [[ $# == 5 && $3 =~ ^ubuntu@[a-zA-Z0-9.:-]+$ ]] || exit 2
  bench=$3
  evidence=${TRIPLEX_TRACE_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence}
  proof=$(python3 - "$evidence/DX-SCALE1" "$4" "$5" <<'SCALE_END'
import hashlib,json,pathlib,re,sys
base=pathlib.Path(sys.argv[1])
rows=[]
for tag,mode in zip(sys.argv[2:],('zero','reader'),strict=True):
    assert re.fullmatch('[a-z][a-z0-9-]{2,40}',tag)
    run=base/tag
    transfer=json.loads((run/'transfer.json').read_bytes())
    docs={}
    for name in ('attempt','terminal'):
        data=(run/'summaries'/(name+'.json')).read_bytes()
        assert hashlib.sha256(data).hexdigest()==transfer['summaryFiles'][name+'.json']
        docs[name]=json.loads(data)
    a,t=docs.values()
    assert a['item']==1 and a['mode']==t['mode']==mode
    assert a['tag']==t['tag']==transfer['tag']==tag and a['slot']==t['slot']
    assert a['nonce']==t['nonce']==transfer['nonce'] and a['source']==t['source']==transfer['source']
    assert t['cleanup'] is True and t['endedAt']
    rows.append((a,t,transfer['summaryFiles']['terminal.json']))
zero,reader=rows
assert reader[0]['baselineTag']==zero[0]['tag'] and reader[0]['source']==zero[0]['source']
assert reader[0]['nonce']!=zero[0]['nonce']
print(zero[2],reader[2])
SCALE_END
)
  read -r zero_sha reader_sha <<< "$proof"
  [[ $zero_sha =~ ^[a-f0-9]{64}$ && $reader_sha =~ ^[a-f0-9]{64}$ ]] || exit 2
  exec ssh -n -F /dev/null -i "${DX_BENCH_KEY:-$HOME/.ssh/triplex_bench_ed25519}" \
    -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes -o StrictHostKeyChecking=yes "$bench" \
    "sudo -n bash $root/deferred-src-$batch/lab/experiments/EXP-DX1/bm1/deferred.sh --signal $batch $4 $5 $zero_sha $reader_sha"
fi
[[ $EUID == 0 && $(uname -s) == Linux && $(systemd-detect-virt) == none ]] || exit 2
[[ $here == "$root/deferred-src-$batch/lab/experiments/EXP-DX1/bm1" && -z $(git -C "$here" status --porcelain) ]]
umask 077
case $mode in
  --register)
    [[ $# == 3 && $3 =~ ^[a-z][a-z0-9-]{2,40}$ && ! -e $pending ]]
    mkdir "$pending"
    printf '%s\n' "$sha" > "$pending/source"
    printf '%s\n' "$3" > "$pending/scale1-zero-tag"
    printf 'WAITING for DX-SCALE1 item 1 and bench handback since=%s\n' "$(date -u +%FT%TZ)" > "$pending/STATUS"
    systemd-run --unit="triplex-bm1-$batch-after-scale1" --path-property="PathExists=$pending/release" \
      --property=RuntimeMaxSec=120s --property=TimeoutStopSec=15s \
      /bin/bash "$here/deferred.sh" --start "$batch"
    ;;
  --signal)
    [[ $# == 6 && $3 != "$4" && $3 =~ ^[a-z][a-z0-9-]{2,40}$ && $4 =~ ^[a-z][a-z0-9-]{2,40}$ ]]
    [[ $5 =~ ^[a-f0-9]{64}$ && $6 =~ ^[a-f0-9]{64}$ && $(cat "$pending/source") == "$sha" ]]
    [[ $(cat "$pending/scale1-zero-tag") == "$3" ]]
    [[ $(cat "$root/STATUS") == 'FREE '* && ! -e $root/day-$batch ]] || exit 75
    temp=$(mktemp "$pending/.release.XXXXXX")
    printf '%s %s %s %s %s %s\n' "$sha" "$(date -u +%FT%TZ)" "$3" "$4" "$5" "$6" > "$temp"
    ln "$temp" "$pending/release"
    rm -- "$temp"
    ;;
  --start)
    [[ $# == 2 && $(cat "$pending/source") == "$sha" ]]
    claim=$(mktemp "$pending/claim.XXXXXX")
    mv -T "$pending/release" "$claim"
    exec >> "$pending/launch.log" 2>&1
    trap 'printf "Launch exit=%s time=%s claim=%s\n" "$?" "$(date -u +%FT%TZ)" "${claim##*/}" >> "$pending/STATUS"' EXIT
    read -r authorized released_at zero reader zero_sha reader_sha < "$claim"
    [[ $authorized == "$sha" && $zero == "$(cat "$pending/scale1-zero-tag")" && $zero != "$reader" ]]
    [[ $zero_sha =~ ^[a-f0-9]{64}$ && $reader_sha =~ ^[a-f0-9]{64}$ ]]
    [[ $(cat "$root/STATUS") == 'FREE '* && -z $(docker ps -q) && ! -e $root/day-$batch ]] || exit 75
    [[ -z $(systemctl list-units --state=active,activating --no-legend 'triplex-scale1-*') ]] || exit 75
    # Seven hours of bounded work plus setup, archive and cleanup. The trigger holds no compute or measurement lock.
    cutoff=$(date -u -d '+7 hours 45 minutes' +%FT%TZ)
    bash "$here/queue-day.sh" --launch-guarded "$batch" "$cutoff"
    printf 'SUBMITTED source=%s cutoff=%s next=seed\n' "$sha" "$cutoff" > "$pending/STATUS"
    ;;
  *) exit 2 ;;
esac
