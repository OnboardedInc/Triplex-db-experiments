#!/usr/bin/env bash
# [DX-T1] Why: a single public entrypoint pins exact local reads and the permanent trace destination.
# Rejected: ad hoc per-command environment settings that can silently differ between matched arms.
set -euo pipefail
kind=${1:?functional|real|pair}; prefix=${2:?tx2-dxt1-TAG}; shift 2
[[ $prefix =~ ^tx2-dxt1-[a-z0-9-]+$ ]] || exit 2
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/DX-T1}
export DX_ORACLE_ROOT=${DX_ORACLE_ROOT:-$DX_STACK_EVIDENCE/oracle}
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
export DX_READ_PATH=replica DX_STRICT_RECORD_CLOCKS=1
# [DX-T1-4] Why: q8's 192-MiB window retains the benchmark's historical basis cohort; fallback decoding stays off the writer.
# Rejected: silently inheriting the 64-MiB driver default, which caused measured historical-read gateway fallbacks.
args=("$@")
for setting in replica-history-mib replica-fallback-thread; do
  present=false
  for argument in "${args[@]}"; do [[ $argument != --$setting && $argument != --$setting=* ]] || present=true; done
  if [[ $present == false ]]; then
    if [[ $setting == replica-history-mib ]]; then args+=(--replica-history-mib 192); else args+=(--replica-fallback-thread worker); fi
  fi
done
exec node lab/bin/heavy.mjs --label DX-T1-$prefix -- bash lab/experiments/EXP-DX1/h4/run.sh "$kind" "$prefix" "${args[@]}"
