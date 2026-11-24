#!/usr/bin/env bash
# [DX-XQ7] Gate (e), the launcher: with every question reader option unset, stack/up.sh of this branch issues exactly
# the docker commands the branch's base (the merge 6d6409306, before any XQ7 change) issues. Both scripts start the
# same toy stack (the gate's settings without DX_QUESTION_*: sweep and ID lists on, small peers) under one prefix and
# one evidence path, one after the other, through a docker shim that records every docker invocation; the recorded
# run/create/network/volume commands must be identical byte for byte, and so must each container's environment,
# command, image, CPU set and memory (docker inspect). One ordinary heavy token:
#   node lab/bin/heavy.mjs --label DX-XQ7-plan -- bash lab/experiments/EXP-DX1/xq7/plan.sh "$PWD" NEW_OUT_DIR
set -uo pipefail
repo=$1 out=$2
: "${DOCKER_HOST:?set DOCKER_HOST to the lab VM docker socket}"
export DOCKER_HOST
[[ ! -e $out ]] || { echo "plan.sh: give a new output directory" >&2; exit 2; }
mkdir -p "$out/shim"
real=$(command -v docker)
cat > "$out/shim/docker" <<SHIM
#!/usr/bin/env bash
printf '%q ' "\$@" >> "\$XQ7_DOCKER_LOG"; printf '\n' >> "\$XQ7_DOCKER_LOG"
exec "$real" "\$@"
SHIM
chmod +x "$out/shim/docker"
stack=$repo/lab/experiments/EXP-DX1/stack
base=$stack/up-xq7-base.sh
git -C "$repo" show "${XQ7_PLAN_BASE:-6d6409306}":lab/experiments/EXP-DX1/stack/up.sh > "$base"
prefix=tx2-dxxq7-plan-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
evidence=$out/evidence
cleanup() { bash "$stack/down.sh" "$prefix" --volumes >/dev/null 2>&1; rm -f "$base"; }
trap cleanup EXIT
secret=0123456789abcdef0123456789abcdef
status=0
for arm in base branch; do
  script=$stack/up.sh; [[ $arm == base ]] && script=$base
  rm -rf "$evidence"; mkdir -p "$evidence"
  XQ7_DOCKER_LOG=$out/docker-$arm.log PATH="$out/shim:$PATH" DX_STACK_EVIDENCE=$evidence DX_STACK_WAIT_FOR_TRANSACTOR=1 \
    DX_INT1_GATEWAYS=demand DX_TX_MEMORY=2g DX_TX_HEAP=1g DX_GW_WRITE_MEMORY=1g DX_GW_READ_MEMORY=1g \
    DX_SWEEP=1 DX_ID_LISTS=1 DX_SWEEP_CURSOR_SECRET=$secret TRIPLEX_TRACE_LEVEL=off \
    bash "$script" "$prefix" --port-write 18991 --port-read 18992 > "$out/up-$arm.log" 2>&1 || { echo "up.sh $arm failed" >&2; status=1; }
  "$real" inspect "$prefix-pg" "$prefix-tx" "$prefix-gw-w" "$prefix-gw-r" |
    python3 -c 'import json,sys
rows=json.load(sys.stdin)
print(json.dumps([{"name":r["Name"],"image":r["Image"],"env":sorted(r["Config"]["Env"]),"cmd":r["Config"]["Cmd"],"entrypoint":r["Config"]["Entrypoint"],
  "cpuset":r["HostConfig"]["CpusetCpus"],"memory":r["HostConfig"]["Memory"],"binds":r["HostConfig"]["Binds"],"ports":r["HostConfig"]["PortBindings"]} for r in rows],indent=1))' > "$out/containers-$arm.json"
  cp "$evidence/$prefix/stack.json" "$out/stack-$arm.json" 2>/dev/null
  bash "$stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
done
for arm in base branch; do grep -E '^(run|create|network create|volume create) ' "$out/docker-$arm.log" > "$out/launch-$arm.txt"; done
if cmp -s "$out/launch-base.txt" "$out/launch-branch.txt"; then echo "XQ7_PLAN launch commands identical: $(wc -l < "$out/launch-base.txt") commands"; else echo "XQ7_PLAN launch commands DIFFER"; diff "$out/launch-base.txt" "$out/launch-branch.txt" | head -20; status=1; fi
if cmp -s "$out/containers-base.json" "$out/containers-branch.json"; then echo "XQ7_PLAN containers identical (env, command, image, cpuset, memory, binds, ports)"; else echo "XQ7_PLAN containers DIFFER"; diff "$out/containers-base.json" "$out/containers-branch.json" | head -20; status=1; fi
python3 - "$out/stack-base.json" "$out/stack-branch.json" <<'PY' || status=1
import json,sys
a,b=[json.load(open(p)) for p in sys.argv[1:]]
for x in (a,b): x.pop('createdAt',None); [c.pop('id',None) for c in x['containers']]
print('XQ7_PLAN stack.json identical apart from creation time and container ids' if a==b else 'XQ7_PLAN stack.json DIFFERS'); sys.exit(0 if a==b else 1)
PY
exit "$status"
