#!/usr/bin/env bash
# [COLD-1] Why: this investigation must name its containers tx2-cold-*, but the existing run scripts accept only
# tx2-dx* names and bind diagnostics to the tx2-dxt1- prefix and the DX-T1 lease. This script edits the working-tree
# copies of those scripts (never committed) so the same harness runs under tx2-cold-* names and the COLD lease, and
# links the built packages of the dx-t1 worktree instead of building a second copy (the Mac has no disk to spare).
# Rejected: a second harness (would not be the measured one); committing the edits (they are not part of the product).
# usage: prepare-harness.sh apply DX_T1_WORKTREE | restore
set -euo pipefail
mode=${1:?apply|restore}
root=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$root"
files=(lab/experiments/EXP-DX1/stack/up.sh lab/experiments/EXP-DX1/stack/down.sh lab/experiments/EXP-DX1/stack/run-in-vm.sh
  lab/experiments/EXP-DX1/h3/attempt.sh lab/experiments/EXP-DX1/t1/run.sh lab/trace/scheduler-control.sh lab/trace/finalize.mjs
  lab/trace/pack-oracle.mjs lab/trace/storage-probe.sh lab/trace/harness-volume.mjs)
if [[ $mode == restore ]]; then
  git checkout -- "${files[@]}"
  for l in node_modules packages/*/node_modules packages/*/dist; do [[ ! -L $l ]] || rm "$l"; done
  git status --short -- "${files[@]}"
  exit 0
fi
deps=${2:?path of the dx-t1 worktree}
deps=$(cd "$deps" && pwd)
[[ $(git -C "$deps" rev-parse HEAD) == $(git merge-base HEAD "$(git -C "$deps" rev-parse HEAD)") ]] || { echo "dx-t1 is not an ancestor of this branch" >&2; exit 2; }
git diff --quiet "$(git -C "$deps" rev-parse HEAD)" HEAD -- packages lab/bench lab/trace lab/experiments/EXP-DX1/stack lab/experiments/EXP-DX1/h3 lab/experiments/EXP-DX1/h4 || { echo "sources differ from the built worktree" >&2; exit 2; }
git checkout -- "${files[@]}"
for f in "${files[@]}"; do
  sed -i '' -e 's/tx2-dxt1-/tx2-cold-/g' \
    -e 's/\^tx2-dx\[a-z0-9-\]+\$/^tx2-(dx|cold)[a-z0-9-]+$/g' \
    -e "s/\['id'\]=='DX-T1'/['id']=='COLD'/g" -e 's/lease\.id !== "DX-T1"/lease.id !== "COLD"/g' \
    -e 's/pair_id=DX-T1/pair_id=COLD/g' "$f"
done
# the driver container resolves the linked packages through this extra read-only mount
sed -i '' -e 's|--cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v "\$repo:\$repo" \\|--cgroupns host -v /sys/fs/cgroup:/sys/fs/cgroup:ro -v "$repo:$repo" -v "${COLD_DEPS:?}:${COLD_DEPS:?}:ro" \\|' lab/experiments/EXP-DX1/stack/run-in-vm.sh
grep -q 'COLD_DEPS' lab/experiments/EXP-DX1/stack/run-in-vm.sh || { echo "mount edit did not apply" >&2; exit 1; }
links=(node_modules)
for d in "$deps"/packages/*/node_modules "$deps"/packages/*/dist; do [[ -e $d ]] && links+=("${d#"$deps"/}"); done
for l in "${links[@]}"; do
  [[ -e $deps/$l ]] || continue
  [[ -L $l ]] && rm "$l"
  [[ ! -e $l ]] || { echo "refusing to replace $l" >&2; exit 1; }
  ln -s "$deps/$l" "$l"
done
! grep -n 'tx2-dxt1-' "${files[@]}" || { echo "prefix edit incomplete" >&2; exit 1; }
echo "harness prepared for tx2-cold-* names; dependencies from $deps"
