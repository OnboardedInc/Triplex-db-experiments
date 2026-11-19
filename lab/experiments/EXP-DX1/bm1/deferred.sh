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
if [[ $mode == --relay ]]; then
  [[ $(uname -s) == Darwin && $# == 6 && $3 =~ ^ubuntu@[a-zA-Z0-9.:-]+$ ]]
  [[ $4 =~ ^[a-z][a-z0-9-]{2,40}$ && $5 =~ ^[a-z][a-z0-9-]{2,40}$ && $4 != "$5" ]]
  # [DX-BM1] Why: SCALE1's terminal bundles arrive on the Mac from its separate allocation.
  # Rejected: asking the operator to watch two machines, or starting from an ETA before the bench is free.
  exec python3 - "$here/deferred.sh" "$batch" "$3" "$4" "$5" "$6" <<'RELAY'
import datetime,os,pathlib,subprocess,sys,time
script,batch,bench,zero,reader,limit=sys.argv[1:]
deadline=datetime.datetime.strptime(limit,'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc).timestamp()
root=pathlib.Path(os.environ.get('TRIPLEX_TRACE_EVIDENCE',str(pathlib.Path.home()/'Claude/Projects/triplex-db-2/evidence')))
def log(message):
    print(datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),message,flush=True)
sent=root/'DX-BM1'/('relay-'+batch+'.sent')
if sent.exists():
    assert sent.read_text().splitlines()==[zero,reader]
    sys.exit(0)
log('Waiting for '+reader+' and the BM1 FREE line')
while time.time()<deadline:
    if all((root/'DX-SCALE1'/tag/'transfer.json').is_file() for tag in (zero,reader)):
        try:
            result=subprocess.run(['/bin/bash',script,'--release',batch,bench,zero,reader],timeout=60)
            if result.returncode==0:
                with sent.open('x') as f:
                    f.write(zero+'\n'+reader+'\n')
                    f.flush()
                    os.fsync(f.fileno())
                log('Delivered the checked item-1 handback for '+batch)
                sys.exit(0)
            log('Release returned '+str(result.returncode)+'; the request is still pending')
        except subprocess.TimeoutExpired:
            log('SSH release timed out; the request is still pending')
    time.sleep(max(0,min(660,deadline-time.time())))
log('Relay ceiling reached; the server trigger remains available to the orchestrator')
sys.exit(75)
RELAY
fi
if [[ $mode == --release ]]; then
  [[ $# == 5 && $3 =~ ^ubuntu@[a-zA-Z0-9.:-]+$ ]] || exit 2
  bench=$3
  evidence=${TRIPLEX_TRACE_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence}
  proof=$(python3 - "$evidence/DX-SCALE1" "$4" "$5" <<'SCALE_END'
import datetime,hashlib,json,pathlib,re,sys,uuid
base=pathlib.Path(sys.argv[1])
rows=[]
for tag,mode in zip(sys.argv[2:],('zero','reader')):
    assert re.fullmatch('[a-z][a-z0-9-]{2,40}',tag)
    run=base/tag
    transfer=json.loads((run/'transfer.json').read_bytes())
    bundle=run/'summaries.tar.zst'
    info=transfer['summary']
    assert info['name']==bundle.name and bundle.stat().st_size==info['bytes']>0
    h=hashlib.sha256()
    with bundle.open('rb') as packed:
        for block in iter(lambda: packed.read(1024*1024),b''): h.update(block)
    assert h.hexdigest()==info['sha256']
    docs={}
    for name in ('attempt','terminal'):
        data=(run/'summaries'/(name+'.json')).read_bytes()
        assert hashlib.sha256(data).hexdigest()==transfer['summaryFiles'][name+'.json']
        docs[name]=json.loads(data)
    a,t=docs.values()
    assert a['item']==1 and a['mode']==t['mode']==mode
    assert a['tag']==t['tag']==transfer['tag']==tag and a['slot']==t['slot']=='tx2-dxscale1-'+tag
    assert a['nonce']==t['nonce']==transfer['nonce'] and a['source']==t['source']==transfer['source']
    assert str(uuid.UUID(a['nonce']))==a['nonce'] and re.fullmatch('[a-f0-9]{40}',a['source'])
    ended=datetime.datetime.fromisoformat(t['endedAt'].replace('Z','+00:00')).timestamp()
    assert t['cleanup'] is True and 0 < a['at']/1000 <= ended <= datetime.datetime.now(datetime.timezone.utc).timestamp()+5
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
    -o IdentitiesOnly=yes -o ForwardAgent=no -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=12 "$bench" \
    "sudo -n bash $root/deferred-src-$batch/lab/experiments/EXP-DX1/bm1/deferred.sh --signal $batch $4 $5 $zero_sha $reader_sha"
fi
[[ $EUID == 0 && $(uname -s) == Linux && $(systemd-detect-virt) == none ]] || exit 2
sha=$(git -C "$here" rev-parse HEAD)
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
