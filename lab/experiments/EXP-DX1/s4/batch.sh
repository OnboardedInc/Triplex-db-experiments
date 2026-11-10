#!/usr/bin/env bash
# [DX-S4] Why: run fresh physical stores sequentially within one bounded hold and remove each immediately. Rejected: accumulating trial volumes or taking a new latency window for every small variant.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd);base=$S4_PREFIX;root=$S4_EVIDENCE/$base
end=$(python3 - "$root/started.txt" <<'PY'
import datetime,sys
print(int(datetime.datetime.fromisoformat(open(sys.argv[1]).read().strip().replace('Z','+00:00')).timestamp())+500)
PY
)
overall=0
for item in "$@"; do
 min=240; [[ $item != postgres ]] || min=45; [[ $item != journals ]] || min=45; [[ $item != xtdb ]] || min=180
 if (( $(date +%s)+min > end )); then printf '%s\n' "$item" >> "$root/not-started.txt"; continue; fi
 p=$base-$item;out=$S4_EVIDENCE/$p;mkdir -p "$out"
 cp "$S4_INPUT/summary.json" "$out/input-summary.json"
 printf '%s\n' "$root/source" > "$out/source-preimages.txt"
 date -u +%FT%TZ > "$out/started.txt"
 rc=0
 case $item in
  qlever) S4_PREFIX=$p bash "$here/qlever.sh" > "$out/stdout.log" 2> "$out/stderr.log" || rc=$?;;
  journals) S4_PREFIX=$p bash "$here/export-journals.sh" > "$out/stdout.log" 2> "$out/stderr.log" || rc=$?;;
  postgres) S4_PREFIX=$p bash "$here/postgres.sh" > "$out/stdout.log" 2> "$out/stderr.log" || rc=$?;;
  xtdb-entities) S4_PREFIX=$p bash "$here/xtdb.sh" entities > "$out/stdout.log" 2> "$out/stderr.log" || rc=$?;;
  xtdb) S4_PREFIX=$p bash "$here/xtdb.sh" > "$out/stdout.log" 2> "$out/stderr.log" || rc=$?;;
  a|b|c|c-full|d|e|e-nohistory|f) S4_PREFIX=$p bash "$here/datomic.sh" variant "$item" > "$out/stdout.log" 2> "$out/stderr.log" || rc=$?;;
  *) echo 'unknown item' >&2;exit 2;;
 esac
 printf '{"exit":%s,"finishedAt":"%s"}\n' "$rc" "$(date -u +%FT%TZ)" > "$out/exit.json"
 printf '%s %s\n' "$item" "$rc" >> "$root/components.txt"
 for c in $(docker ps -a --filter "name=^/${p}-" --format '{{.Names}}'); do
  docker logs "$c" > "$out/$c.log" 2>&1 || true
  docker stop -t 10 "$c" >> "$out/cleanup.log" 2>&1 || true
  docker rm -f "$c" >> "$out/cleanup.log" 2>&1 || true
 done
 for v in $(docker volume ls --filter "name=^${p}-" --format '{{.Name}}'); do docker volume rm "$v" >> "$out/cleanup.log" 2>&1 || true;done
 for n in $(docker network ls --filter "name=^${p}-" --format '{{.Name}}'); do docker network rm "$n" >> "$out/cleanup.log" 2>&1 || true;done
 docker ps -a --filter "name=^/${p}-" --format '{{.Names}}' > "$out/remaining-containers.txt"
 docker volume ls --filter "name=^${p}-" --format '{{.Name}}' > "$out/remaining-volumes.txt"
 docker network ls --filter "name=^${p}-" --format '{{.Name}}' > "$out/remaining-networks.txt"
 if [[ -s $out/remaining-containers.txt || -s $out/remaining-volumes.txt || -s $out/remaining-networks.txt ]];then echo 'component cleanup failed' >&2;exit 1;fi
 [[ $rc == 0 ]] || overall=1
 echo "DX-S4 $item finished: $rc" >&2
 # Stop launching when disk admission is no longer satisfied.
 python3 - <<'PY' || break
import shutil
assert shutil.disk_usage('.').free>=5*1024**3
PY
done
exit "$overall"
