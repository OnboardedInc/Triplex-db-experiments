#!/usr/bin/env bash
# [DX-HA1] Why: run each pinned stack/up.sh with tonight's launcher arguments up to its first Docker change.
# Rejected: copying the guard conditional out of up.sh (the copy would pass while the real file refused).
# Runs inside a disposable Linux container with /w holding one extracted tree per commit and the Docker stand-in.
set -uo pipefail
export PATH=/w/dry-run:/opt/node:$PATH DX_DRY_RUN_FAKE=1
attempt=6bb8fdc1-a94c-4425-9702-eae9fea94b76
mkdir -p /var/lib/docker/volumes /in/prepared/global /in/prepared/pg_tblspc /in/pgdata/global /in/cold/global /in/real/data
echo 17 > /in/prepared/PG_VERSION; : > /in/prepared/global/pg_control; ln -s /wal /in/prepared/pg_wal
echo 17 > /in/pgdata/PG_VERSION; : > /in/pgdata/global/pg_control
echo 17 > /in/cold/PG_VERSION; echo 17 > /in/real/data/PG_VERSION; echo '{}' > /in/real/real1-copy.json
mkdir -p /mnt/wal/held && : > /mnt/wal/held/000000010000000000000001
cpus=(--cpus-tx 0,6,7 --cpus-pg 1 --cpus-gw-write 2,3,4 --cpus-gw-read 5)
txj='-Xms1024m -Xmx24576m -XX:MaxDirectMemorySize=24576m -Ddatomic.objectCacheMax=16384m -XX:+UseZGC -XX:ActiveProcessorCount=3 -Xlog:gc=info:file=/trace/tx-gc.log'
pgs='-c fsync=on -c synchronous_commit=on -c full_page_writes=on -c shared_buffers=2GB'
server_args=(--no-publish "${cpus[@]}" --pg-memory 8192m --tx-memory 30720m --tx-java-opts "$txj" --object-cache-max 16384m
  --memory-index-threshold 256m --memory-index-max 1g)
scale_env() { # scale1/bench.ts startScaleStack plus v01/profile.ts stackOptions("subject") of the same commit
  local tree=$1
  printf '%s\n' DX_BARE_METAL=1 DX_BARE_METAL_ROOT=/tmp/root DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_QUIET_LOGS=1 \
    DX_NATIVE_SETTINGS_READBACK=1 TRIPLEX_TRACE_LEVEL=summary TRIPLEX_TRACE_NODE=1 TRIPLEX_TRACE_GATEWAY=1 DX_IDLE_SENTINEL=0 \
    DX_GROUP_QUEUE_CLOCK=0 DX_GW_WRITE_MEMORY=6g DX_GW_READ_MEMORY=6g DX_LAUNCH_PROFILE=server DX_JAVA=21 DX_TX_JAVA=25 \
    'DX_GW_WRITE_JAVA_OPTS=-Xms256m -Xmx4g -Ddatomic.objectCacheMax=1536m' 'DX_GW_READ_JAVA_OPTS=-Xms256m -Xmx4g -Ddatomic.objectCacheMax=1536m'
  (cd "$tree" && node --no-warnings --experimental-transform-types -e \
    'import("./lab/experiments/EXP-DX1/v01/profile.ts").then(m=>{for(const [k,v] of Object.entries(m.stackOptions("subject",process.argv[1])))console.log(k+"="+v)})' "$attempt")
}
prep1_env() { # prep1/server.sh exports for an ordered per-person arm
  printf '%s\n' DX_BARE_METAL=1 DX_BARE_METAL_ROOT=/tmp/root DX_STACK_WAIT_FOR_TRANSACTOR=1 DX_PREP1_SERVER=1 DX_W1_EXTRA=1 \
    DX_INT1_NATIVE_WRITE_READBACK=1 DX_PREDECESSOR_LOOKUP=1 DX_GROUP_QUEUE_CLOCK=1 DX_GROUP_REUSE_PREPARED=1 DX_GROUP_MAX_MEMBERS=8 \
    DX_W1_FAST_REPLY=1 DX_SMALL_ROWS=0 DX_W1_LEDGER=0 DX_W1_PACKED_JOURNAL=0 DX_FIELD_COALESCE=0 DX_COMMIT_HINTS=false \
    DX_NATIVE_SETTINGS_READBACK=1 DX_QUIET_LOGS=1 TRIPLEX_TRACE_LEVEL=off DX_PREP1_WRITERS=1 DX_PREP1_SUBJECT=1 DX_GROUP_COMMIT=0 \
    DX_LIVE_PRIORITY=0 TX2_SUBJECT_NUMERIC_OWNER=1 TX2_SUBJECT_PREFETCH=0 TX2_SUBJECT_ORDERED_IDS=1 DX_WRITE_OPTIONS_ATTEMPT=$attempt \
    'DX_GW_WRITE_JAVA_OPTS=-Xms512m -Xmx4g -XX:+UseG1GC' 'DX_GW_READ_JAVA_OPTS=-Xms256m -Xmx3g -XX:+UseG1GC' DX_GW_WRITE_MEMORY=6g DX_GW_READ_MEMORY=5g
}
fails=0 n=0
# case NAME COMMIT EXPECT ENVKIND EXTRA_ENV(;-separated or -) -- up.sh ARGS...
case_run() {
  local name=$1 commit=$2 expect=$3 kind=$4 extra=$5; shift 6
  local more=() tree=/w/trees/$commit log=/tmp/calls-$name.log ev=/tmp/ev/$name got stop last
  mkdir -p "$ev"; : > "$log"
  mapfile -t envs < <(set -o pipefail; if [[ $kind == scale ]]; then scale_env "$tree"; elif [[ $kind == prep1 ]]; then prep1_env; else echo DX_BARE_METAL=1; fi)
  if [[ $kind == scale ]] && ! printf '%s\n' "${envs[@]}" | grep -qx 'DX_V01_ADOPTED_STACK=1'; then
    n=$((n+1)); fails=$((fails+1)); echo "FAIL $name: could not derive stackOptions at $commit"; return
  fi
  [[ $extra == - ]] || IFS=';' read -r -a more <<< "$extra"
  (cd "$tree" && env "${envs[@]}" ${more[@]+"${more[@]}"} DX_STACK_EVIDENCE="$ev" DX_DRY_RUN_LOG="$log" \
    bash -x lab/experiments/EXP-DX1/stack/up.sh "$@") > "/tmp/out-$name.log" 2> "/tmp/err-$name.log"
  local code=$?
  stop=$(grep -m1 '^DX-DRY-RUN stop before:' "$log" || true)
  if [[ $stop == *"image inspect"* || $stop == *"-extract"* ]]; then got=ADMITTED; elif [[ -z $stop ]]; then got=REFUSED; else got=REVIEW; fi
  last=$(grep -E '^\++ \[\[' "/tmp/err-$name.log" | tail -1 | cut -c1-230)
  n=$((n+1)); [[ $got == "$expect" ]] || fails=$((fails+1))
  printf '%-4s %-28s %-9s expect=%-8s got=%-8s exit=%-3s last-test: %s\n' "$([[ $got == "$expect" ]] && echo ok || echo FAIL)" \
    "$name" "${commit:0:9}" "$expect" "$got" "$code" "$last"
  [[ $got == "$expect" ]] || tail -5 "/tmp/err-$name.log" | cut -c1-300 | sed 's/^/     | /'
}
emptywal() { local d=/mnt/wal/$1; mkdir -p "$d"; printf '%s' "$d"; }
pub=tx2-dxscale1-publish-249dd49021f
held=(--wal-directory /mnt/wal/held --prepared-pgdata /in/prepared --pg-settings "$pgs")
while read -r name commit expect extra; do
  [[ -n $name && $name != \#* ]] || continue
  [[ $extra == - ]] && extra=
  case $name in
    fair-*) case_run "$name" "$commit" "$expect" scale "DX_GW_WRITE_JAVA=25${extra:+;$extra}" -- "$pub" "${server_args[@]}" "${held[@]}" ;;
    publish-*) case_run "$name" "$commit" "$expect" scale "DX_GW_WRITE_JAVA=21${extra:+;$extra}" -- "$pub" "${server_args[@]}" "${held[@]}" ;;
    open-ports-*) case_run "$name" "$commit" "$expect" scale "DX_GW_WRITE_JAVA=25" -- "$pub" "${cpus[@]}" "${held[@]}" ;;
    no-copy-*) case_run "$name" "$commit" "$expect" scale "DX_GW_WRITE_JAVA=25" -- "$pub" "${server_args[@]}" --pg-settings "$pgs" ;;
    copy-on-v01-*) case_run "$name" "$commit" "$expect" scale "DX_GW_WRITE_JAVA=25" -- tx2-dxscale1-v01-249dd49021f "${server_args[@]}" "${held[@]}" ;;
    removal-*) case_run "$name" "$commit" "$expect" scale "DX_ERASE2_SCOPE=s;DX_ERASE2_FIELD=f;DX_ERASE_TOKEN=t;TRIPLEX_ERASURE_WRAPPING_KEY=k" -- \
      "tx2-dxscale1-removal-${attempt:0:12}" "${server_args[@]}" --pg-data /in/pgdata --pg-settings "$pgs" ;;
    cold-*) case_run "$name" "$commit" "$expect" scale "DX_JVM1_COLD_PGDATA=/in/cold;DX_JVM1_COLD_CONTROL=$(printf 'a%.0s' {1..64})" -- \
      "tx2-dxscale1-v01-cold-6bb8fdc1a94c" "${server_args[@]}" --wal-directory "$(emptywal "$name")" --pg-settings "$pgs" ;;
    adopted-*) case_run "$name" "$commit" "$expect" scale "DX_GW_WRITE_JAVA=25${extra:+;$extra}" -- \
      "tx2-dxscale1-v01-${attempt:0:12}" "${server_args[@]}" --wal-directory "$(emptywal "$name")" --pg-settings "$pgs" ;;
    real1-*) case_run "$name" "$commit" "$expect" plain - -- "tx2-dxreal1-$attempt" --real1-pgdata /in/real/data --port-write 8491 \
      --port-read 8492 --cpus-tx 0,2,3 --cpus-pg 1 --cpus-gw-write 4,5 --cpus-gw-read 6,7 --pg-memory 6g --tx-memory 12g ;;
    prep1-*) case_run "$name" "$commit" "$expect" prep1 - -- tx2-dxprep1-0a1b2c3d-1-ordered-s --port-write 8491 --port-read 8495 \
      --cpus-tx 0 --cpus-pg 1 --cpus-gw-write 2-5 --cpus-gw-read 6 --pg-memory 8g --tx-memory 30g --tx-java-opts '-Xms1g -Xmx24g -XX:+UseG1GC' \
      --object-cache-max 16g --memory-index-threshold 256m --memory-index-max 1g --pg-settings '-c shared_buffers=2GB' ;;
    *) echo "unknown case $name"; fails=$((fails+1)) ;;
  esac
done < /w/cases.txt
echo "cases=$n mismatches=$fails"
(( fails == 0 ))
