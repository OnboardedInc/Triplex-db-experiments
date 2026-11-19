#!/usr/bin/env bash
# [DX-T1-14] Why: port S5's retained-cut/seeding path onto the current stack, using fresh clones and this holder's lifecycle.
# Rejected: S5's old topology, first-use mutation of a sealed volume, or an activation timing verdict on the daytime host.
set -euo pipefail
mode=${1:---plan}; prefix=${2:?tx2-dxt1-prefix}; subjects=${3:-1000}; operation=${4:-clone}; traffic=${5:-no-live}
[[ $mode == --plan || $mode == --execute ]] && [[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
[[ $subjects == 1000 || $subjects == 10000 || $subjects == 100000 ]] || exit 2
case $operation in clone|seed|retained|seed-only|pristine) ;; *) exit 2 ;; esac
[[ $traffic == live || $traffic == no-live ]] && [[ $# -le 5 ]] || exit 2
case $subjects in
  1000) seed=tx2-dxh5-seed-1000-pg-data;scope=dxh5-w0-1000-v1;;
  10000) seed=tx2-dxh8-seed-10000-pg-data;scope=dxh8-w0-10000-v1;;
  100000) seed=tx2-dxs5-seed-100000-pg-data;scope=dxs5-w0-100000-v1;;
esac
if [[ $operation == seed || $operation == seed-only ]];then scope=dxt1-w0-$subjects-$prefix;fi
if [[ $operation == pristine || $operation == seed-only ]]; then
  batch=${DX_BM1_PRISTINE_BATCH:?parent seed batch required}
  [[ $batch =~ ^[a-z0-9]{1,12}$ && $subjects == 100000 ]] || exit 2
  if [[ $operation == seed-only ]]; then
    [[ $traffic == no-live && $prefix == tx2-dxt1-bm1-"$batch"-seed ]] || exit 2
  else
    [[ $traffic == live && $prefix =~ ^tx2-dxt1-bm1-act[a-f0-9]{9}-activation-a$ ]] || exit 2
    seed=bm1-pristine-$batch
    scope=dxt1-w0-100000-tx2-dxt1-bm1-$batch-seed
  fi
fi
retained_tag=tx2-dxt1-bm1-20261118d-activation
if [[ $operation == retained ]];then
  [[ $subjects == 100000 && $prefix == tx2-dxt1-bm1-* ]] || exit 2
  seed=$retained_tag-pg-data
  scope=dxt1-w0-100000-$retained_tag
fi
if [[ $mode == --plan ]];then
  printf '%s\n' "Diagnostic W0 $operation/$traffic: $subjects subjects, scope $scope; sealed source ${seed} is read-only and cloned, never reused in place."
  printf '%s\n' 'Current stack/up.sh; raised id memo; early compilation; WARN file logging; fsync/synchronous_commit on; full independent fingerprint and publication readback.'
  printf '%s\n' '100k activation requires a nominal 24 GiB guest. This script does not resize it.'
  printf '%s\n' 'Execution requires DX_ACTIVATION_STOP_AT with an explicit timezone; no keep-warm mechanism.'
  exit
fi
case $operation in retained|pristine|seed-only) [[ ${DX_BARE_METAL:-0} == 1 ]] || exit 2 ;; esac
if [[ ${DX_ACTIVATION_HEAVY:-0} != 1 ]];then
  exec env DX_ACTIVATION_HEAVY=1 node lab/bin/heavy.mjs --label "DX-T1-activation-$prefix" -- bash "$0" "$@"
fi
source "$(dirname "${BASH_SOURCE[0]}")/../stack/platform.sh"
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$DX_EVIDENCE_ROOT/DX-T1}
out=$DX_STACK_EVIDENCE/$prefix
mkdir "$out"
progress() { printf '%s %s %s\n' "$(date -u '+%FT%TZ')" "$prefix" "$*"; }
progress admission
remaining_ms() {
  node -e 'const s=process.argv[1];if(!/(Z|[+-]\d\d:\d\d)$/.test(s??""))throw Error("Timezone required");const d=Date.parse(s)-Date.now();if(!Number.isFinite(d)||d<=0)throw Error("Deadline passed");console.log(d)' "${DX_ACTIVATION_STOP_AT:?cleanup deadline required}"
}
stop_ms=$(remaining_ms)
guest_bytes=$(docker info --format '{{.MemTotal}}')
docker image inspect tx2-datomic:1.0.7745-da00 postgres:17-alpine node:22.23.2-bookworm-slim python:3.13-slim >/dev/null
if [[ $subjects == 100000 ]];then
  python3 - "$guest_bytes" <<'PY_MEMORY'
import sys
assert int(sys.argv[1])>=23*1024**3,'100k W0 activation cannot fit the present 16 GiB guest; no resize is attempted'
PY_MEMORY
fi
settings=$(node lab/experiments/EXP-DX1/t1/scale-settings.mjs --subjects "$subjects" --guest-bytes "$guest_bytes" --shell)
eval "$settings"
export DX_COMPILER_POLICY=early DX_NATIVE_SETTINGS_READBACK=1 DX_QUIET_LOGS=1
policy=$(node lab/experiments/EXP-DX1/t1/jvm-policy.mjs --shell);eval "$policy"
export TRIPLEX_TRACE_LEVEL=summary TRIPLEX_TRACE_COMPONENTS=node,gateway
eval "$(node lab/trace/components.mjs --shell)"
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=28*1024**3'
lock=$DX_LAB_ROOT/locks/measure
# [DX-T1-14] Why: the absolute cleanup cutoff must include time waiting for another holder.
# Rejected: start a stale relative timer after a long lease wait, or keep waiting beyond the declared cutoff.
lease_owned=false
if [[ -n ${DX_SCALE_NIGHT_LEASE_PID:-} ]]; then
  # [DX-T1-15] Why: the campaign owns VM isolation until its verified restore, including between activation and cleanup.
  # Rejected: release/reacquire the lock around activation (a new holder could enter before restoration).
  node lab/experiments/EXP-DX1/t1/scale-night-lease.mjs "$lock/owner.json" "$DX_SCALE_NIGHT_LEASE_PID" "$prefix" activation
else
  while ! mkdir "$lock" 2>/dev/null;do remaining_ms >/dev/null;sleep 5;done
  lease_owned=true
  printf '{"id":"DX-T1","pid":%s,"prefix":"%s","kind":"activation"}\n' "$$" "$prefix" > "$lock/owner.json"
fi
child= timer= resources=false
cleanup() {
  rc=$?;trap - EXIT TERM INT
  if [[ -n $child ]];then kill -TERM "$child" 2>/dev/null || true;wait "$child" || true;fi
  if [[ -n $timer ]];then kill "$timer" 2>/dev/null || true;wait "$timer" 2>/dev/null || true;fi
  if [[ $resources == true ]];then
    mkdir -p "$out/trace/raw"
    touch "$out/trace/raw/.finish"
    sh lab/bin/host-quiet.sh > "$out/host-after.jsonl" || true
    for role in pg tx gw-w gw-r;do docker logs --timestamps "$prefix-$role" > "$out/$role.log" 2>&1 || true;done
    docker inspect "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" > "$out/containers-final.json" 2>/dev/null || true
    bash lab/experiments/EXP-DX1/stack/down.sh "$prefix" --volumes
    for role in tools;do docker volume rm "$prefix-$role" >/dev/null 2>&1 || true;done
  fi
  bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --inventory > "$out/remaining.txt"
  [[ ! -s $out/remaining.txt ]] || { echo 'Resources remain; retaining lease' >&2;exit 1; }
  if [[ $lease_owned == true ]]; then rm "$lock/owner.json";rmdir "$lock"; fi
  printf '%s\n' "$rc" > "$out/exit.txt"
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 143' TERM INT
stop_ms=$(remaining_ms)
# [DX-T1-14] Why: Bash 3 reports BASH_SUBSHELL=0 for some failing asynchronous expansions; only the controller may clean its lease.
# Rejected: a subshell-level guard; every background child clears inherited controller traps before expanding its command.
(trap - EXIT TERM INT;exec node -e 'setTimeout(()=>process.kill(Number(process.argv[1]),"SIGTERM"),Number(process.argv[2]))' "$$" "$stop_ms") & timer=$!
git diff --quiet && git diff --cached --quiet || { echo 'Commit source before the activation smoke' >&2;exit 2; }
git ls-files --error-unmatch lab/experiments/EXP-DX1/t1/activation.sh lab/experiments/EXP-DX1/t1/activation-driver.ts lab/experiments/EXP-DX1/t1/w0-seed.ts >/dev/null
git rev-parse HEAD > "$out/head.txt"
python3 - "$out/source.SHA256SUMS" <<'BUILD_BYTES'
import hashlib,pathlib,subprocess,sys
files=subprocess.check_output(['git','ls-files','-z','lab/bench/lib/w0-*','lab/oracles/domain','lab/world/W0','packages/w0','pnpm-lock.yaml','package.json','packages/datomic','lab/experiments/EXP-DX1/t1/activation.sh','lab/experiments/EXP-DX1/t1/activation-driver.ts','lab/experiments/EXP-DX1/t1/w0-seed.ts']).split(b'\0')
with open(sys.argv[1],'x') as out:
 for name in files:
  if name:
   p=pathlib.Path(name.decode());out.write(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p)+'\n')
 for package in ('datomic','core','host','qualification','w0'):
  files=sorted(p for p in pathlib.Path('packages',package,'dist').rglob('*') if p.is_file());assert files,'Missing built package '+package
  for p in files:out.write(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+str(p)+'\n')
BUILD_BYTES
python3 - "$out" "$prefix" "$scope" "$subjects" "$operation" <<'ATTEMPT'
import hashlib,json,pathlib,sys,uuid
p=pathlib.Path(sys.argv[1]);r={'run':sys.argv[2],'slot':sys.argv[2],'source':(p/'head.txt').read_text().strip(),'scope':sys.argv[3],'subjects':int(sys.argv[4]),'nonce':str(uuid.uuid4()),'programSha256':hashlib.sha256(pathlib.Path('lab/experiments/EXP-DX1/t1/activation-driver.ts').read_bytes()).hexdigest()}
r['sourceManifestSha256']=hashlib.sha256((p/'source.SHA256SUMS').read_bytes()).hexdigest()
if sys.argv[4]=='100000' and sys.argv[5] in ('clone','retained','pristine'):r['sealedCut']=4338757
(p/'activation-attempt.json').write_text(json.dumps(r,indent=2)+'\n')
ATTEMPT
nonce=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["nonce"])' "$out/activation-attempt.json")
build_sha=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["sourceManifestSha256"])' "$out/activation-attempt.json")
docker image inspect tx2-datomic:1.0.7745-da00 postgres:17-alpine node:22.23.2-bookworm-slim python:3.13-slim > "$out/images.json"
sh lab/bin/host-quiet.sh > "$out/host-before.jsonl" || true
node lab/trace/components.mjs > "$out/components.json"
# [DX-T1-14] Why: waiting for a lease can make the earlier admission observations stale.
# Rejected: create containers from a pre-wait disk/memory snapshot.
python3 -c 'import shutil;assert shutil.disk_usage(".").free>=28*1024**3'
[[ $(docker info --format '{{.MemTotal}}') == "$guest_bytes" ]] || { echo 'Guest changed during admission' >&2;exit 2; }
if [[ $operation == retained ]]; then
  # [DX-BM1] Why: the first seed took three hours. Clone its quiescent volume and prove the retained cut again.
  # Rejected: write to the original volume, or claim its interrupted activation as a fresh result.
  [[ ${DX_BARE_METAL:-0} == 1 ]] || exit 2
  original=${DX_ACTIVATION_RETAINED_RUN:?retained activation source directory required}
  python3 - "$original" "$out/seed-origin.json" "$scope" "$seed" <<'RETAINED_SEED'
import hashlib,json,pathlib,sys
root=pathlib.Path(sys.argv[1])
attempt=json.loads((root/'activation-attempt.json').read_text())
assert root.name=='tx2-dxt1-bm1-20261118d-activation'
assert attempt['scope']==sys.argv[3] and attempt['run']==attempt['slot']==root.name
assert attempt['source']==(root/'head.txt').read_text().strip() and attempt['subjects']==100000
seed, readback = (root/'driver.log',root/'seed-readback.log')
def final(file):
    return json.loads(file.read_text().splitlines()[-1])
submitted, verified=final(seed),final(readback)
assert submitted['event']=='chunk-seeded' and submitted['throughPosition']==4338757 and submitted['endSubjects']==100000
assert verified['event']=='chunk-readback' and verified['scope']==attempt['scope']
assert verified['endSubjects']==verified['N']==100000 and verified['counts']['position']==4338757
assert verified['fingerprint']['basisTx']==4338757 and verified['fingerprint']['worlds']==verified['expected']
receipt={'oldSource':attempt['source'],'oldSlot':attempt['slot'],'retainedVolume':sys.argv[4],
         'scope':attempt['scope'],'position':4338757,'subjects':100000,'previousFingerprint':verified['fingerprint'],
         'inputSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (seed,readback,root/'activation-attempt.json')}}
pathlib.Path(sys.argv[2]).write_text(json.dumps(receipt,indent=2)+'\n')
RETAINED_SEED
  export DX_BM1_RETAINED_SEED=1
fi
resources=true
extra=();[[ $operation == seed || $operation == seed-only ]] || extra=(--clone-seed "$seed")
progress starting-owned-stack
(trap - EXIT TERM INT;exec env DX_STACK_WAIT_FOR_TRANSACTOR=1 bash lab/experiments/EXP-DX1/stack/up.sh "$prefix" --no-publish --cpus-tx 0 --cpus-pg 1 --cpus-gw-write 2 --cpus-gw-read "${DX_ACTIVATION_GW_READ_CPUS:-4}" \
  --tx-memory "$DX_TX_MEMORY" --pg-memory "$DX_PG_MEMORY" \
  --tx-java-opts "$DX_TX_JAVA_OPTS" --memory-index-threshold "$DX_INDEX_THRESHOLD" --memory-index-max "$DX_INDEX_MAX" --object-cache-max "$DX_TX_OBJECT_CACHE" \
  --pg-settings '-c shared_buffers=512MB -c max_wal_size=8GB -c checkpoint_timeout=30min -c wal_sync_method=open_datasync' \
  ${extra[@]+"${extra[@]}"} > "$out/up.log" 2>&1) & child=$!
wait "$child";child=
docker volume create "$prefix-tools" >/dev/null
docker create --pull never --name "$prefix-extract" -v "$prefix-tools:/tool" node:22.23.2-bookworm-slim sh -c 'cp /usr/local/bin/node /tool/node; cp /usr/lib/*-linux-gnu/libstdc++.so.6 /usr/lib/*-linux-gnu/libgcc_s.so.1 /tool/' >/dev/null
docker start -a "$prefix-extract" > "$out/tools.log";docker rm "$prefix-extract" >/dev/null
# [DX-T1-14] Why: the native clone smoke exposed that full-history statistics are collected only by the independent journal fold.
# Rejected: weaken the receipt's missing-history guard or count acknowledged publication commands as durable storage readback.
args=(--rung "$subjects" --scope "$scope" --workers 2 --runtime-workers --seed-fingerprint --journal-counts --publish --publication-id "$prefix" --publication-size 32 --publication-inflight 1 --r1-publication-size 128 --r1-publication-inflight 4 --oracle-processes 2 --batch-oracle --oracle-concurrency 4 --verification-pages "${DX_ACTIVATION_VERIFY_PAGES:-2}" --reader-mode replica --record-dir "$out/http" --traffic-dir "$out/traffic")
[[ $traffic != live ]] || args+=(--live --require-healthy-baseline --traffic-offset-s 120 --baseline-ms 100000 --live-warmup-ms 10000 --reader-workers 2)
[[ $traffic != live || ${DX_P5_LIVE_READERS:-256} == 256 ]] || args+=(--live-readers "$DX_P5_LIVE_READERS")
[[ ${DX_ACTIVATION_POST_CAPTURE:-0} != 1 ]] || args+=(--post-capture)
if [[ $subjects == 100000 ]]; then
  case $operation in
    pristine) args+=(--seed-position 4338757) ;;
    clone|retained) args+=(--seed-position 4338757 --activation-at-seed) ;;
  esac
fi
driver=(lab/experiments/EXP-DX1/t1/activation-driver.ts "${args[@]}")
if [[ $operation == seed || $operation == seed-only ]];then driver=(lab/experiments/EXP-DX1/t1/w0-seed.ts "$scope" "$subjects" "$subjects" seed);fi
mkdir -p "$out/state"
run_driver() {
  local log=$1;shift
  progress "starting $log"
# [DX-T1-14] Why: the recorder's filename uses PID/thread, so sequential PID-1 containers need distinct phase directories as well as labels.
# Rejected: labels alone (do not change filenames), or overwriting an earlier phase's immutable trace.
(trap - EXIT TERM INT;exec docker run --ulimit core=0 --rm --pull never --name "$prefix-driver" --network "$prefix-net" --cpuset-cpus "${DX_ACTIVATION_CPUS:-3,4,5,6,7}" --memory "$DX_DRIVER_MEMORY" --memory-swap "$DX_DRIVER_MEMORY" \
  -v "$PWD:$PWD:ro" -v "$out:$out" -v "$out/state:/state" -v "$prefix-tools:/tool:ro" -w "$PWD" \
  -e LD_LIBRARY_PATH=/tool -e PATH=/tool:/usr/local/bin:/usr/bin:/bin -e "NODE_OPTIONS=--max-old-space-size=$DX_DRIVER_HEAP_MB" \
  -e "DATOMIC_URL=http://$prefix-gw-w:8080" -e "DATOMIC_READ_URLS=http://$prefix-gw-r:8080" -e TRIPLEX_DATOMIC_LAYOUT=lean -e TX2_SWEEP_STRICT=1 \
  -e DX_STRICT_RECORD_CLOCKS=0 -e TRIPLEX_TRACE_LEVEL=summary -e "TRIPLEX_TRACE_RUN=$prefix" -e "TRIPLEX_TRACE_SLOT=$prefix" -e "TRIPLEX_TRACE_SOURCE=$(cat "$out/head.txt")" -e "TRIPLEX_TRACE_DIR=/state/trace/raw/${log%.log}" -e "TRIPLEX_TRACE_PROCESS=node-${log%.log}" \
  -e "DX_ACTIVATION_NONCE=$nonce" -e "DX_ACTIVATION_BUILD_SHA256=$build_sha" \
  -e TX2_W0_POINT_JOURNAL=1 -e TX2_W0_RESTORE_INDEXED_JOURNAL=1 -e "DX_R1_DEADLINE=$(node -e 'console.log(Date.parse(process.argv[1]))' "$DX_ACTIVATION_STOP_AT")" \
  python:3.13-slim /tool/node --expose-gc --experimental-strip-types "$@" > "$out/$log" 2>&1) & child=$!
wait "$child";child=
  progress "finished $log"
}
run_driver driver.log "${driver[@]}"
if [[ $operation == seed || $operation == seed-only ]];then
  # [DX-T1-14] Why: a durable checkpoint proves progress, while a fresh full readback proves the seeded world.
  # Rejected: call a generated/acknowledged command count a verified seed or stop before the independent fingerprint.
  run_driver seed-readback.log lab/experiments/EXP-DX1/t1/w0-seed.ts "$scope" "$subjects" "$subjects" verify
  if [[ $operation == seed ]];then run_driver activation.log lab/experiments/EXP-DX1/t1/activation-driver.ts "${args[@]}";fi
fi
log=driver.log;[[ $operation != seed ]] || log=activation.log
# [DX-T1-14] Why: the final receipt binds the code and built package bytes that actually stayed fixed during this attempt.
# Rejected: a commit label alone, or accepting a changed working tree after the source snapshot.
[[ $(git rev-parse HEAD) == $(cat "$out/head.txt") ]] && git diff --quiet && git diff --cached --quiet || exit 2
python3 - "$out/source.SHA256SUMS" "$build_sha" <<'SOURCE_READBACK'
import hashlib,pathlib,sys
manifest=pathlib.Path(sys.argv[1]).read_bytes();assert hashlib.sha256(manifest).hexdigest()==sys.argv[2]
for line in manifest.decode().splitlines():
 expected,name=line.split('  ',1);p=pathlib.Path(name)
 assert not p.is_absolute() and '..' not in p.parts
 assert hashlib.sha256(p.read_bytes()).hexdigest()==expected,'Source/build changed: '+name
SOURCE_READBACK
if [[ $operation == seed-only ]]; then
  progress sealing-before-release
  python3 lab/experiments/EXP-DX1/bm1/pristine-seed.py seal "$batch" "$prefix" "$out"
  exit
fi
node lab/trace/activation-result.mjs "$out" "$log"
progress "exact activation envelope checked"
