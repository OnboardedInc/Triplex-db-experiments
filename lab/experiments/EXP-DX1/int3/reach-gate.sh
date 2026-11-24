#!/usr/bin/env bash
# [DX-INT3] Mac gate for the subject pulls (/reach and /reach-many) of the one branch against the unmerged baseline:
#   node lab/bin/heavy.mjs --label DX-INT3-reach -- bash lab/experiments/EXP-DX1/int3/reach-gate.sh NEW_DIR [BASE] [CONTROL]
# One toy stack from this checkout (ports 18671 and 18672); three more read gateways on the same transactor and storage,
# each a copy of the stack's read gateway with another source or setting: the baseline's gateway source (BASE, default
# 9e02cf1d2, port 18673), this checkout's with the waiting-read bound on (TX2_READ_WAIT_LIMIT=4, port 18674), and a
# negative control whose answers must differ (CONTROL, default a6146ff4f, W3's head with the Boolean reach answer, port
# 18675). reach-gate.ts seeds subjects with references through the write gateway, then sends every pull to every
# gateway at the same cut and compares the answers. Times are diagnostic. The stack and its volume are removed at the end.
# Why: on 2026-11-24 W3 made every /reach answer a Boolean and the production, aged and held gates passed anyway (they
# read through /read, or fall back to it). Rejected: comparing two separately seeded stacks (record clocks differ).
set -uo pipefail
out=${1:?absolute new output directory under /Users}
base=${2:-9e02cf1d2}
control=${3:-a6146ff4f}
[[ $out == /Users/* && ! -e $out ]] || { echo "reach-gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
prefix=tx2-dxint3-reach-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack" "$out/src"
git -C "$repo" rev-parse HEAD > "$out/source"
git -C "$repo" status --porcelain -- packages/datomic/gateway lab/experiments/EXP-DX1/int3 > "$out/dirty"
# Each copy's /opt/gateway is staged as stack/up.sh stages it: the gateway directory plus the codec spec of that commit.
stage() {  # $1 name, $2 commit
  mkdir -p "$out/src/$1/tree" "$out/src/$1/gateway"
  git -C "$repo" archive "$2" -- packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/src/$1/tree"
  cp -R "$out/src/$1/tree/packages/datomic/gateway/." "$out/src/$1/gateway/"
  cp "$out/src/$1/tree/packages/datomic/src/codec-spec.json" "$out/src/$1/gateway/codec-spec.json"
  rm -rf "$out/src/$1/tree"
}
stage base "$base"; stage control "$control"; stage bound HEAD
[[ -z $(cat "$out/dirty") ]] || { echo "reach-gate.sh: commit the gateway source first (the bound copy runs HEAD)" >&2; exit 2; }
clones=("$prefix-gw-base" "$prefix-gw-bound" "$prefix-gw-control")
cleanup() {
  for c in "${clones[@]}"; do docker logs "$c" > "$out/stack/$c.log" 2>&1; docker rm -f "$c" >/dev/null 2>&1; done
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
}
trap cleanup EXIT
DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 TRIPLEX_TRACE_LEVEL=off \
  bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18671 --port-read 18672 > "$out/stack-up.log" 2>&1 ||
  { echo "reach-gate.sh: the stack did not start; see $out/stack-up.log" >&2; exit 1; }
# A copy of the read gateway: same image, environment, network, cores and memory; another /opt/gateway and port.
clone() {  # $1 name, $2 gateway directory (holding src/), $3 port, $4 extra environment word or ""
  node -e '
    const [info, gateway, port, extra, name] = process.argv.slice(1);
    const c = JSON.parse(info)[0];
    const binds = (c.HostConfig.Binds ?? []).map((b) => b.split(":")[1] === "/opt/gateway" ? gateway + ":/opt/gateway:ro" : b);
    if (!binds.some((b) => b.startsWith(gateway + ":"))) throw Error("no /opt/gateway bind on the read gateway");
    const args = ["run", "-d", "--pull", "never", "--name", name, "--network", c.HostConfig.NetworkMode,
      "--cpuset-cpus", c.HostConfig.CpusetCpus, "--memory", String(c.HostConfig.Memory), "--memory-swap", String(c.HostConfig.Memory),
      "-p", "127.0.0.1:" + port + ":8080", ...binds.flatMap((b) => ["-v", b]),
      ...c.Config.Env.flatMap((e) => ["-e", e]), ...(extra ? ["-e", extra] : []),
      ...(c.Config.Entrypoint ? ["--entrypoint", c.Config.Entrypoint[0]] : []), c.Image,
      ...(c.Config.Entrypoint ? c.Config.Entrypoint.slice(1) : []), ...(c.Config.Cmd ?? [])];
    console.log(JSON.stringify(args));' "$(docker inspect "$prefix-gw-r")" "$2" "$3" "$4" "$1" > "$out/stack/$1.args.json" || return 1
  node -e 'require("child_process").execFileSync("docker", JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")), { stdio: ["ignore", "ignore", "inherit"] })' \
    "$out/stack/$1.args.json"
}
clone "$prefix-gw-base" "$out/src/base/gateway" 18673 "" &&
  clone "$prefix-gw-bound" "$out/src/bound/gateway" 18674 TX2_READ_WAIT_LIMIT=4 &&
  clone "$prefix-gw-control" "$out/src/control/gateway" 18675 "" ||
  { echo "reach-gate.sh: a gateway copy did not start" >&2; exit 1; }
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/int3/reach-gate.ts "$out" \
  http://127.0.0.1:18671 http://127.0.0.1:18672 http://127.0.0.1:18673 http://127.0.0.1:18674 http://127.0.0.1:18675) \
  > "$out/driver.log" 2>&1
status=$?
tail -3 "$out/driver.log"
exit "$status"
