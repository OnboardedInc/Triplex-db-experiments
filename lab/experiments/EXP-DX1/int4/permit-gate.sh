#!/usr/bin/env bash
# [DX-INT4] The read permits after XQ6's admission change (*own-pool*): one toy stack of this checkout with two read
# permits, the waiting-read bound 2 and thread counters (DX_READ_PERMITS=2, DX_READ_WAIT_LIMIT=2, DX_THREAD_COUNTERS=1;
# TX2_SWEEP unset), and four copies of its read gateway on the same transactor and storage: the baseline's gateway source
# (BASE, default 23b7df344), this checkout's, the source before the sweep merge with the read prefetch on (PRE, default
# 67417e609) and this checkout's with the read prefetch on. permit-gate.ts sends the same reads to each and compares the
# admission counters, the at-least and prefetch counters and the answers. Stack and copies removed at the end.
#   node lab/bin/heavy.mjs --label DX-INT4-permits -- bash lab/experiments/EXP-DX1/int4/permit-gate.sh NEW_DIR [BASE] [PRE]
set -uo pipefail
out=${1:?absolute new output directory under /Users}
base=${2:-23b7df344}
pre=${3:-67417e609}
[[ $out == /Users/* && ! -e $out ]] || { echo "permit-gate.sh: give a new absolute output directory under /Users" >&2; exit 2; }
export DOCKER_HOST=unix://$HOME/.colima/triplex2/docker.sock
repo=$(git rev-parse --show-toplevel)
prefix=tx2-dxint4-permits-$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')
mkdir -p "$out/stack" "$out/src"
git -C "$repo" rev-parse HEAD > "$out/source"
[[ -z $(git -C "$repo" status --porcelain -- packages/datomic/gateway) ]] || { echo "permit-gate.sh: commit the gateway source first" >&2; exit 2; }
stage() {  # $1 name, $2 commit: the gateway directory plus that commit's codec spec, as stack/up.sh stages it
  mkdir -p "$out/src/$1/tree" "$out/src/$1/gateway"
  git -C "$repo" archive "$2" -- packages/datomic/gateway packages/datomic/src/codec-spec.json | tar -x -C "$out/src/$1/tree"
  cp -R "$out/src/$1/tree/packages/datomic/gateway/." "$out/src/$1/gateway/"
  cp "$out/src/$1/tree/packages/datomic/src/codec-spec.json" "$out/src/$1/gateway/codec-spec.json"
  rm -rf "$out/src/$1/tree"
}
stage base "$base"; stage pre "$pre"; stage head HEAD
clones=("$prefix-gw-base" "$prefix-gw-head" "$prefix-gw-prepf" "$prefix-gw-headpf")
cleanup() {
  for c in "${clones[@]}"; do docker logs "$c" > "$out/stack/$c.log" 2>&1; docker rm -f "$c" >/dev/null 2>&1; done
  bash "$repo/lab/experiments/EXP-DX1/stack/down.sh" "$prefix" --volumes >/dev/null 2>&1
  rm -rf "$out/src"
}
trap cleanup EXIT
DX_STACK_EVIDENCE=$out/stack DX_STACK_WAIT_FOR_TRANSACTOR=1 TRIPLEX_TRACE_LEVEL=off DX_READ_PERMITS=2 DX_READ_WAIT_LIMIT=2 DX_THREAD_COUNTERS=1 \
  bash "$repo/lab/experiments/EXP-DX1/stack/up.sh" "$prefix" --port-write 18771 --port-read 18772 > "$out/stack-up.log" 2>&1 ||
  { echo "permit-gate.sh: the stack did not start; see $out/stack-up.log" >&2; exit 1; }
clone() {  # $1 name, $2 gateway directory, $3 port, $4 extra environment word or ""
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
clone "$prefix-gw-base" "$out/src/base/gateway" 18773 "" &&
  clone "$prefix-gw-head" "$out/src/head/gateway" 18774 "" &&
  clone "$prefix-gw-prepf" "$out/src/pre/gateway" 18775 TX2_READ_PREFETCH=1 &&
  clone "$prefix-gw-headpf" "$out/src/head/gateway" 18776 TX2_READ_PREFETCH=1 ||
  { echo "permit-gate.sh: a gateway copy did not start" >&2; exit 1; }
(cd "$repo" && node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/int4/permit-gate.ts "$out" \
  http://127.0.0.1:18771 http://127.0.0.1:18773 http://127.0.0.1:18774 http://127.0.0.1:18775 http://127.0.0.1:18776) > "$out/driver.log" 2>&1
status=$?
tail -2 "$out/driver.log"
exit "$status"
