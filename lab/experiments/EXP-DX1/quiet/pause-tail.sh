#!/usr/bin/env bash
# Orchestrator, 2026-11-12: the unattended tail before the pause Sam asked for. No agents, no Claude or Codex usage.
# 1. wait for q8 to finish; 2. remove the two finished XTDB experiment volumes and the downloadable images the Datomic lane
# does not use (Sam approved); 3. one 100,000-subject north-star pair, gateway reads, bounded to 3 h 20 min;
# 4. stop the triplex2 VM (it uses eight host cores under nohlt) and restore the docker context.
set -uo pipefail
E=/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H4; N=/Users/sam/projects/triplex-db-2/.claude/worktrees/dx-r3
L=/Users/sam/Claude/Projects/triplex-db-2/evidence/ORCH-pause; mkdir -p "$L"; log="$L/pause-tail.log"
lock=/Users/sam/Claude/Projects/triplex-db-2/locks/measure
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
free() { df -k /System/Volumes/Data | awk 'NR==2{printf "%.1f GiB free\n",$4/1048576}'; }
{
echo "tail start $(date -u +%FT%TZ) $(free)"
until [ -e "$E/tx2-dxh4-q8-host-after.jsonl" ]; do sleep 20; done
sleep 30
echo "q8 finished $(date -u +%FT%TZ)"
while ! mkdir "$lock" 2>/dev/null; do sleep 5; done
printf '{"id":"ORCH-pause","pid":%d}\n' $$ > "$lock/owner.json"
echo "== removing approved volumes and images"
for v in tx2-xtdb-s1-data tx2-xtdb-s2-data; do docker volume inspect "$v" --format '{{.Name}} {{.CreatedAt}}' && docker volume rm "$v"; done
for i in apache/kafka:4.1.1 cgr.dev/chainguard/minio:latest chrislusf/seaweedfs:3.97 tx2-sync-witness-bpftrace:r49; do docker rmi "$i" 2>&1 | tail -1; done
colima ssh -p triplex2 -- sudo fstrim -v /var/lib/docker
rm -f "$lock/owner.json"; rmdir "$lock"
sleep 20; echo "after removal $(free)"
echo "== 100,000-subject pair (gateway reads) $(date -u +%FT%TZ)"
cd "$N" && git rev-parse --short HEAD
sh lab/bin/host-quiet.sh > "$E/tx2-dxh4-k100-host-before.jsonl"; git rev-parse HEAD > "$E/tx2-dxh4-k100-head.txt"
( DX_STACK_EVIDENCE=$E DX_READ_PATH=gateway DX_DRIVER_MEMORY=12g DX_DRIVER_HEAP_MB=8192 bash lab/experiments/EXP-DX1/h4/run.sh pair tx2-dxh4-k100 --rung 100k --seed-batch-facts 2000 > "$E/tx2-dxh4-k100-pair.log" 2>&1 ) & job=$!
( sleep 12000; echo "watchdog: stopping the pair after 3 h 20 min"; pkill -TERM -P $job; kill -TERM $job ) & dog=$!
wait $job; rc=$?; kill $dog 2>/dev/null
echo "pair rc=$rc $(date -u +%FT%TZ)"
sh lab/bin/host-quiet.sh > "$E/tx2-dxh4-k100-host-after.jsonl"
python3 lab/experiments/EXP-DX1/h4/summarize.py "$E/tx2-dxh4-k100-ladder" > "$E/tx2-dxh4-k100-TABLES.md" 2> "$E/tx2-dxh4-k100-summarize.err"
head -3 "$E/tx2-dxh4-k100-TABLES.md"
left=$(docker ps -aq --filter name=tx2-dxh4-k100 | wc -l | tr -d ' ')
if [ "$left" != 0 ]; then echo "removing $left leftover k100 containers"; docker ps -aq --filter name=tx2-dxh4-k100 | xargs docker rm -f; docker volume ls -q --filter name=tx2-dxh4-k100 | xargs -r docker volume rm; docker network ls -q --filter name=tx2-dxh4-k100 | xargs -r docker network rm; fi
[ -d "$lock" ] && grep -q k100 "$lock/owner.json" 2>/dev/null && { rm -f "$lock/owner.json"; rmdir "$lock"; echo "released a stale k100 lock"; }
echo "== stopping the triplex2 VM $(date -u +%FT%TZ)"
running=$(docker ps -q | wc -l | tr -d ' ')
ctx=$(env -u DOCKER_HOST docker context show)
if [ "$running" = 0 ] && [ ! -d "$lock" ]; then colima stop -p triplex2; env -u DOCKER_HOST docker context use "$ctx" >/dev/null 2>&1; echo "VM stopped; docker context $(env -u DOCKER_HOST docker context show)"; else echo "VM left running: $running containers, lock present=$([ -d "$lock" ] && echo yes || echo no)"; fi
colima list 2>&1 | head -4
echo "tail end $(date -u +%FT%TZ) $(free)"
} >> "$log" 2>&1
tail -25 "$log" | cut -c1-200
