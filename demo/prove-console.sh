#!/usr/bin/env bash
# [DX-CON1] Proving run of Triplex Console on the 1 billion database, headless, on the rented machine that already
# holds the sealed cluster. Steps: install and build this checkout (once), bring the demo stack up on a working copy
# with both pinned-read options on (demo/server-up.sh, as the first demo's slot did), write a local connection file
# (no SSH forward), run every console tool and time each row of DESIGN.md table 10.4 (examples/demo-mcp/src/prove.ts),
# then the MCP-against-HTTP catalogue gate on a port given here. Writes console-proof.json and console-proof.md and one
# compressed archive. Prints no address, credential or object storage value.
#
#   sudo -i
#   cd <checkout of exp/DX-CON1-functions at the commit named in the launch message>
#   DEMO_ORIGINAL=<stopped sealed cluster> DEMO_HANDOFF=<aged-scorecard.json> \
#     bash demo/prove-console.sh --tools <bootstrap build dir> [--port 28590] [--out DIR] [--reset] [--no-bring-up]
#
#   --tools DIR      the bare-metal bootstrap build (has tools/bin with Node 22 and pnpm-store); default: node on PATH
#   --port N         loopback port for the catalogue gate's console server (default 28590; never 28580 here); must be free
#   --out DIR        results (default /var/tmp/triplex-console-proof/<UTC time>)
#   --reset          replace an existing working copy from the original first (passed to server-up.sh)
#   --no-bring-up    a demo stack from this checkout is already up (its ready file is read as is)
#   --ceiling S      stop the proof after S seconds (default 1500)
# Leaves the stack up; stop it with: bash demo/server-down.sh --delete-work
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/.." && pwd)
cd "$repo"
tools='' port=28590 out='' reset=() bring=1 ceiling=1500
while (($#)); do
  case $1 in
    --tools) tools=$2; shift 2;;
    --port) port=$2; shift 2;;
    --out) out=$2; shift 2;;
    --reset) reset=(--reset); shift;;
    --no-bring-up) bring=0; shift;;
    --ceiling) ceiling=$2; shift 2;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
done
[[ $(uname -s) == Linux && $EUID == 0 ]] || { echo 'Run as root on the rented Linux machine' >&2; exit 2; }
[[ $port =~ ^[0-9]+$ && $port -ge 1024 && $port != 28580 ]] || { echo 'Choose --port above 1023, not 28580' >&2; exit 2; }
case $port in 15442|17019|5432|6379|4222|4566|16686|18491|18495) echo "Port $port is reserved" >&2; exit 2;; esac
if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then echo "Port $port is in use; pass another --port" >&2; exit 2; fi
out=${out:-/var/tmp/triplex-console-proof/$(date -u +%Y%m%dT%H%M%SZ)}
mkdir -p "$out"; chmod 700 "$out"
exec > >(tee "$out/prove-console.log") 2>&1
t0=$SECONDS
stamp() { printf '[prove %4ds] %s\n' "$((SECONDS - t0))" "$1"; }
if [[ -n $tools ]]; then export PATH=$tools/tools/bin:$PATH; fi
command -v node >/dev/null && node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 18) ? 0 : 1)' ||
  { echo 'Node 22.18 or later is needed (pass --tools <bootstrap build>)' >&2; exit 2; }
commit=$(git rev-parse HEAD)
stamp "commit $commit, node $(node -v)"

# 1. Install and build this checkout once (the bootstrap's package store is used when it is there).
if [[ ! -s packages/datomic/dist/index.js || ! -d examples/demo-mcp/node_modules/@modelcontextprotocol ]]; then
  stamp 'install and build (once per checkout; 1 to 4 minutes)'
  store=()
  if [[ -n $tools && -d $tools/pnpm-store ]]; then store=(--store-dir "$tools/pnpm-store"); fi
  export COREPACK_HOME=${COREPACK_HOME:-${tools:+$tools/corepack}}
  pnpm "${store[@]}" install --frozen-lockfile --offline >"$out/install.log" 2>&1 ||
    pnpm "${store[@]}" install --frozen-lockfile >>"$out/install.log" 2>&1
  node_modules/.bin/turbo run build --filter=@triplex-build/triplex-datomic >"$out/build.log" 2>&1
  stamp 'install and build done'
fi

# 2. The stack on a working copy, pinned-read options on (server-up.sh refuses to finish if they are not).
root=${DEMO_ROOT:-/var/tmp/triplex-demo}
if [[ $bring == 1 ]]; then
  stamp 'bring-up on a working copy (first slot: 169 s with the cluster on the machine)'
  bash demo/server-up.sh "${reset[@]}" 2>&1 | tee "$out/server-up.log" | grep -E '^\[demo\]|^DEMO|rror|pinned'
  grep -q '^DEMO READY' "$out/server-up.log" || { echo 'Bring-up did not finish' >&2; exit 1; }
fi
[[ -s $root/ready.json ]] || { echo "No ready file in $root" >&2; exit 2; }
export TRIPLEX_DEMO_STATE=$out/connection.json
node demo/server/local-connection.mjs "$root/ready.json" "$TRIPLEX_DEMO_STATE"
cp "$root/ready.json" "$out/ready.json"

# 3. The proof: every tool, table 10.4, G13, every change read back.
stamp "proof (predicted 2 to 6 minutes; ceiling $ceiling s)"
proof=0
(cd examples/demo-mcp && timeout "$ceiling" node src/prove.ts --out "$out") || proof=$?
stamp "proof exit $proof"

# 4. The catalogue gate: the MCP server and the console's HTTP server return the same JSON (writes in account-003).
gate=0
(cd examples/demo-mcp && timeout 600 node src/gate-catalogue.ts --port "$port" --json "$out/catalogue-gate.json") >"$out/catalogue-gate.log" 2>&1 || gate=$?
tail -n 1 "$out/catalogue-gate.log"
stamp "catalogue gate exit $gate"

# 5. One archive for the driver to copy to the Mac (the connection file stays out: it names local ports only, but
#    it is private by rule).
tar -C "$out" --exclude connection.json -c -I 'zstd -3' -f "$out.tar.zst" .
sha256sum "$out.tar.zst" > "$out.tar.zst.sha256"
stamp "results: $out/console-proof.md, $out/console-proof.json; archive $out.tar.zst"
printf 'CONSOLE PROVING RUN %s proof=%s gate=%s total=%ds commit=%s\n' "$([[ $proof == 0 && $gate == 0 ]] && echo PASSED || echo FAILED)" "$proof" "$gate" "$((SECONDS - t0))" "$commit"
[[ $proof == 0 && $gate == 0 ]]
