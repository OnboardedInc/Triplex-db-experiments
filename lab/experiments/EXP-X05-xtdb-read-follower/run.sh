#!/bin/zsh
# EXP-X05 unattended run (orchestrator instruction, 2026-11-07): poll the pool every 2 minutes; once it admits
# writer s2 plus the follower, bring them up pinned apart (writer CPUs 0,1, follower 2,3; R19 1.6), record live
# guard evidence, run the smoke driver, then the full driver, then release both and the scratch volume.
# Sized to the orchestrator's slot plan (2026-11-07): beside both dev residents the pool leaves 4.5 GiB, so the
# follower runs on the small profile (1.0 GiB, -Xmx512m, 256m direct, 128 MiB cache) and the run is provisional.
# It never takes a held slot: engine.mjs refuses those.
# Exit 2: smoke failed, exit 3: full run failed; both leave the engines up for a quick fix and rerun.
set -u
WT=${X05_CHECKOUT:-/Users/sam/projects/triplex-db-2/.claude/worktrees/agent-a5b9cf52579902ee0}
cd "$WT" || exit 1
export TX2_CONFIG_DIR="$WT" TX2_HOLDER=EXP-X05-xtdb-read-follower
mkdir -p runs/X05
profile=small; need=4.5
# An array, because zsh does not word-split ${profile:+--follower-profile $profile} into two arguments.
fargs=(--follower-profile $profile)
while true; do
  out=$(node lab/bin/engine.mjs status 2>&1)
  used=$(print -r -- "$out" | sed -n 's/^pool: \([0-9.]*\) GiB of.*/\1/p')
  s2=$(print -r -- "$out" | awk '$1=="xtdb-s2"{print $NF}')
  echo "$(date -u +%H:%M:%S) used=${used:-?} s2=${s2:-?} need=${need}"
  if [[ -n "$used" ]] && (( 11 - used >= need )) && [[ "$s2" == "-" ]]; then
    if node lab/bin/engine.mjs up --lane xtdb --slot s2 --fresh --cpuset-cpus 0,1 --exp EXP-X05 >/dev/null; then
      if node lab/bin/engine.mjs up --lane xtdb --slot s2 --follower --cpuset-cpus 2,3 "${fargs[@]}" --exp EXP-X05 >/dev/null; then break; fi
      echo "follower refused; releasing the writer and waiting again"
      node lab/bin/engine.mjs down --lane xtdb --slot s2 --remove-volume
    fi
  fi
  sleep 120
done
echo "ENGINES-UP profile=${profile:-default}"
node lab/experiments/EXP-X05-xtdb-read-follower/guard-live.mjs > runs/X05/guard-live.out 2>&1 && echo "GUARD-LIVE-OK" || echo "GUARD-LIVE-FAILED"
node lab/experiments/EXP-X05-xtdb-read-follower/driver.mjs --smoke > runs/X05/smoke.out 2> runs/X05/smoke.err || { echo "SMOKE-FAILED (engines left up)"; exit 2; }
echo "SMOKE-OK"
node lab/experiments/EXP-X05-xtdb-read-follower/driver.mjs > runs/X05/full.out 2> runs/X05/full.err || { echo "FULL-FAILED (engines left up)"; exit 3; }
echo "FULL-OK"
node lab/bin/engine.mjs down --lane xtdb --slot s2 --follower
node lab/bin/engine.mjs down --lane xtdb --slot s2 --remove-volume
echo "RELEASED"
