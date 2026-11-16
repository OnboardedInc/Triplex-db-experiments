#!/usr/bin/env bash
# [COLD-1] Why: one fixed-gap arm of the real stack through the existing harness, with this investigation's names and
# lease, a fixed CPU placement that also fits five online guest CPUs, light tracing, and pruning of bulky derived files
# as soon as the arm ends (the Mac is at its disk floor).
# Rejected: the nine-arm part 10 session script (its tags, 10,000-subject seed and full samplers do not fit the disk).
# usage (under with-lock.sh writer-arms, after prepare-harness.sh apply): stack-arm.sh TAG OFFLINE_LIST|- [extra run.sh args...]
set -euo pipefail
tag=${1:?tag}; offline=${2:?offline list or -}; shift 2
[[ $tag =~ ^tx2-cold-[a-z0-9-]+$ ]] || exit 2
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
cd "$root"
export DX_STACK_EVIDENCE=${DX_STACK_EVIDENCE:-$HOME/Claude/Projects/triplex-db-2/evidence/COLD-1}
export COLD_DEPS=${COLD_DEPS:?path of the dx-t1 worktree}
export DX_R3_PAIR_LEASE_PID=${COLD_LEASE_PID:?run under with-lock.sh} DX_PAIR_LEASE_ID=COLD
export TRIPLEX_TRACE_LEVEL=${COLD_TRACE_LEVEL:-full} TRIPLEX_TRACE_SESSION=${COLD_SESSION:-}
if [[ $TRIPLEX_TRACE_LEVEL == full ]]; then export TRIPLEX_TRACE_COMPONENTS=${COLD_TRACE_COMPONENTS:-node,gateway,tx-jfr,postgres} DX_TX_NATIVE_JFR=1; fi
export DX_STORAGE_DIAGNOSTIC=0 DX_PG_CENSUS=0 DX_NODE_PROFILE=0
export DX_CPUS_TX=${DX_CPUS_TX:-0} DX_CPUS_PG=${DX_CPUS_PG:-1} DX_CPUS_GW_WRITE=${DX_CPUS_GW_WRITE:-2} DX_CPUS_GW_READ=${DX_CPUS_GW_READ:-4}
export DX_CPUS_DRIVER=${DX_CPUS_DRIVER:-3,4} DX_MAIN_CPU=${DX_MAIN_CPU:-3} DX_WORKER_CPUS=${DX_WORKER_CPUS:-4}
out=$DX_STACK_EVIDENCE/$tag
mkdir -p "$DX_STACK_EVIDENCE"
"$here/guest-cpus.sh" online > /dev/null
if [[ $offline != - ]]; then "$here/guest-cpus.sh" offline "$offline" > "$DX_STACK_EVIDENCE/$tag.cpus.json"; else "$here/guest-cpus.sh" show > "$DX_STACK_EVIDENCE/$tag.cpus.json"; fi
"$here/host-context.sh" "$tag-before" >> "$DX_STACK_EVIDENCE/host.jsonl"
rc=0
size=(--subjects "${COLD_SUBJECTS:-1000}"); [[ -z ${COLD_RUNG:-} ]] || size=(--rung "$COLD_RUNG")
bash lab/experiments/EXP-DX1/t1/run.sh real "$tag" "${size[@]}" --zero-readers --reader-ladder-only --max-readers 0 \
  --idle-gaps-ms "${COLD_GAPS:-25,50,250,1000}" --idle-commits "${COLD_COMMITS:-150}" --idle-keep none --probe10-per-s 0 "$@" > "$DX_STACK_EVIDENCE/$tag.controller.log" 2>&1 || rc=$?
"$here/host-context.sh" "$tag-after" >> "$DX_STACK_EVIDENCE/host.jsonl"
"$here/guest-cpus.sh" online > /dev/null
# prune what can be rebuilt from the kept raw traces
if [[ -d $out ]]; then
  rm -f "$out/trace.html" "$out/trace.chrome.json" "$out/trace.chrome.json.gz" "$out/commit-anatomy.json" "$out/driver/consumer.db" "$out/driver/consumer.db.lock" "$out/driver/publication.db" "$out/source-build-hashes.json"
  for f in "$out/pg.log" "$out/driver/ns-writes.jsonl" "$out/trace-summary.json" "$out/TRACE-REPORT.md" "$out/gw-w.log" "$out/gw-r.log" "$out/tx.log"; do [[ ! -f $f ]] || gzip -9 -f "$f"; done
  rm -rf "$DX_STACK_EVIDENCE/stage/$tag" "$root/lab/experiments/EXP-DX1/t1/runs/$tag"
fi
exit "$rc"
