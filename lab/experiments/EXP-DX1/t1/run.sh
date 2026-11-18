#!/usr/bin/env bash
# [DX-T1] Why: a single public entrypoint pins exact local reads and the permanent trace destination.
# Rejected: ad hoc per-command environment settings that can silently differ between matched arms.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../stack/platform.sh"
kind=${1:?functional|real|pair}; prefix=${2:?tx2-dxt1-TAG}; shift 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
# [DX-T1-12] Why: Sam forbids background requests and sentinels in diagnostics as well as verdicts.
# Rejected: the earlier idle-diagnostic exception, which could launch a helper before the driver refused it.
[[ ${DX_IDLE_SENTINEL:-0} == 0 && ${DX_IDLE_REFUSAL_PROBE:-0} == 0 && ${DX_IDLE_TCP:-default} == default ]] || exit 2
for ((i=1;i<=$#;i++)); do
  arg=${!i}; [[ $arg != --idle-keep=* || $arg == --idle-keep=none ]] || exit 2
  if [[ $arg == --idle-keep ]]; then j=$((i+1)); [[ ${!j} == none ]] || exit 2; fi
done
bounded=()
if [[ ${DX_BOUNDED_MEMORY_TRIAL:-0} == 1 ]]; then
  [[ $kind == real && ${DX_NS_PROFILE:-smoke} == smoke ]] || { echo 'Bounded memory trial requires a single smoke arm' >&2; exit 2; }
  bounded=(--bounded-trial)
fi
if [[ ${DX_NS_PROFILE:-smoke} == v3 ]]; then
  DX_MATCH_DURATION_S=$(node --import tsx lab/bench/plan.ts --seconds --strict); export DX_MATCH_DURATION_S
  node --import tsx lab/bench/plan.ts --strict
fi
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$DX_EVIDENCE_ROOT/DX-T1}
export DX_ORACLE_ROOT=${DX_ORACLE_ROOT:-$DX_STACK_EVIDENCE/oracle}
if [[ $kind == real || $kind == pair ]]; then
  # [DX-T1-12] Why: reject short disk before Docker admission, then read the real guest total for population settings.
  # Rejected: the old hardcoded 20-GiB guest, or a 100k reader arm in a 16-GiB guest.
  python3 -c 'import shutil;assert shutil.disk_usage(".").free>=15*1024**3'
  guest_bytes=$(docker info --format '{{.MemTotal}}')
  mkdir -p "$DX_STACK_EVIDENCE/$prefix"
  node lab/experiments/EXP-DX1/t1/scale-settings.mjs --guest-bytes "$guest_bytes" "${bounded[@]+"${bounded[@]}"}" --output "$DX_STACK_EVIDENCE/$prefix/population-settings.json" --driver-args "$@"
  scale_shell=$(node lab/experiments/EXP-DX1/t1/scale-settings.mjs --guest-bytes "$guest_bytes" "${bounded[@]+"${bounded[@]}"}" --shell --driver-args "$@")
  eval "$scale_shell"
  node lab/experiments/EXP-DX1/t1/jvm-policy.mjs "$DX_STACK_EVIDENCE/$prefix/compiler-policy.json"
  compiler_shell=$(node lab/experiments/EXP-DX1/t1/jvm-policy.mjs --shell)
  eval "$compiler_shell"
fi
# [DX-T1] Why: --oracle-root names frozen executable source, not an output directory; keep a verified owned copy.
# Rejected: silently pointing it at an empty evidence folder or changing the independent oracle's implementation.
if [[ $DX_ORACLE_ROOT == "$DX_STACK_EVIDENCE/oracle" ]]; then
python3 - "$DX_ORACLE_ROOT" <<'PY_ORACLE'
import pathlib,subprocess,hashlib,json,sys
root=pathlib.Path(sys.argv[1]); commit="03d86f3346cccd6794487b77293fb56077dd020e"
files=subprocess.check_output(["git","ls-tree","-r","--name-only",commit,"--","lab/oracles/replay"],text=True).splitlines()
rows=[]
for name in files:
 data=subprocess.check_output(["git","show",commit+":"+name]); p=root/name
 if p.exists():
  if p.read_bytes()!=data:raise SystemExit("Frozen oracle source mismatch: "+name)
 else:
  p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 rows.append({"path":name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()})
(root/"ORACLE-SOURCE.json").write_text(json.dumps({"commit":commit,"files":rows},indent=2)+"\n")
PY_ORACLE
fi
[[ -f $DX_ORACLE_ROOT/lab/oracles/replay/cli.py ]] || { echo 'Missing frozen oracle executable source' >&2; exit 2; }
export TRIPLEX_TRACE_LEVEL=${TRIPLEX_TRACE_LEVEL:-summary}
# [DX-T1-8] Why: CPU/swap are required context even for off controls; fail before starting a stack if sandbox access is absent.
# Rejected: spending a long native preflight with silently null host counters and discovering it at finalization.
if [[ $(uname -s) == Darwin ]]; then
  /bin/ps -A -o pcpu=,comm= >/dev/null
  /usr/sbin/sysctl vm.swapusage >/dev/null
fi
# [DX-T1-6] Why: full diagnostics retain quiet logging and native binary counters with the single level switch.
# Rejected: requiring synchronous native file logging or a second collector variable for a normal full run.
if [[ $TRIPLEX_TRACE_LEVEL == full && -z ${TRIPLEX_TRACE_COMPONENTS+x} ]]; then
  export TRIPLEX_TRACE_COMPONENTS=node,gateway,tx-jfr,gw-jfr,postgres
  export DX_TX_NATIVE_JFR=${DX_TX_NATIVE_JFR:-1}
fi
# [DX-T1-5] Why: retain the measured part-4 placement/history configuration for every new T1 arm.
# Rejected: silently reverting to shared writer/engine cores between controlled comparisons.
export DX_CPUS_TX=${DX_CPUS_TX:-0} DX_CPUS_PG=${DX_CPUS_PG:-1} DX_CPUS_GW_WRITE=${DX_CPUS_GW_WRITE:-2} DX_CPUS_GW_READ=${DX_CPUS_GW_READ:-4}
export DX_CPUS_DRIVER=${DX_CPUS_DRIVER:-3,4,5,6,7} DX_MAIN_CPU=${DX_MAIN_CPU-3} DX_WORKER_CPUS=${DX_WORKER_CPUS-4,5,6,7}
export DX_TX_OBJECT_CACHE=${DX_TX_OBJECT_CACHE:-1280m}
export DX_QUIET_LOGS=${DX_QUIET_LOGS:-1} DX_ENCRYPT_CHANNEL=${DX_ENCRYPT_CHANNEL:-true}
export DX_NATIVE_SETTINGS_READBACK=${DX_NATIVE_SETTINGS_READBACK:-1}
export DX_TX_JAVA_OPTS=${DX_TX_JAVA_OPTS:-'-Xms256m -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=200'}

export DX_READ_PATH=replica DX_STRICT_RECORD_CLOCKS=1
export DX_PG_CENSUS=${DX_PG_CENSUS:-1}
# [DX-T1-4] Why: q8's 192-MiB window retains the benchmark's historical basis cohort; fallback decoding stays off the writer.
# Rejected: silently inheriting the 64-MiB driver default, which caused measured historical-read gateway fallbacks. Seed batches retain q8 setup after a measured tail benefit.
args=("$@")
# [DX-T1-10] Why: component warming is an explicit fixed-gap diagnostic, never a full-pair setting.
# Rejected: silently keep an endpoint or disk warm while claiming an unchanged frozen verdict workload.
if [[ ${DX_IDLE_SENTINEL:-0} == 1 || ${DX_IDLE_REFUSAL_PROBE:-0} == 1 || ${DX_IDLE_TCP:-default} != default ]]; then
  idle_diagnostic=false
  for argument in ${args[@]+"${args[@]}"}; do [[ $argument != --idle-gaps-ms ]] || idle_diagnostic=true; done
  [[ $kind == real && $idle_diagnostic == true ]] || { echo 'Idle controls require an explicit diagnostic, not a verdict' >&2; exit 2; }
fi
for setting in replica-history-mib replica-world-cache-mib replica-fallback-thread seed-batch-facts reader-basis-wire; do
  present=false
  for argument in ${args[@]+"${args[@]}"}; do [[ $argument != --$setting && $argument != --$setting=* ]] || present=true; done
  if [[ $present == false ]]; then
    case "$setting" in
      replica-history-mib) args+=(--replica-history-mib "${DX_REPLICA_HISTORY_MIB:-192}");;
      replica-world-cache-mib) args+=(--replica-world-cache-mib "${DX_REPLICA_WORLD_CACHE_MIB:-32}");;
      replica-fallback-thread) args+=(--replica-fallback-thread worker);;
      seed-batch-facts) args+=(--seed-batch-facts 2000);;
      reader-basis-wire) args+=(--reader-basis-wire delta);;
    esac
  fi
done
exec node lab/bin/heavy.mjs --label DX-T1-$prefix -- bash lab/experiments/EXP-DX1/h4/run.sh "$kind" "$prefix" "${args[@]}"
