#!/usr/bin/env bash
# [DX-DEMO1] On the Mac: open SSH port forwards to the rented machine's two gateways (which listen on its loopback
# only), check both answer, print the head position and record count, and write the private state file the local
# MCP server and the console server read (~/.triplex-demo/connection.json, mode 0600).
#
#   demo/connect.sh            server address from $DEMO_SERVER or the private file ~/.triplex-demo/server
#   demo/connect.sh --toy      the Mac lab VM (after demo/server-up.sh --toy)
#
# The address is never written into the repository; keep it in ~/.triplex-demo/server (one line, the IP or host name).
set -euo pipefail
dir=$HOME/.triplex-demo
mkdir -p "$dir"; chmod 700 "$dir"
toy=0
for arg in "$@"; do case $arg in --toy) toy=1;; *) echo "unknown option $arg" >&2; exit 2;; esac; done
started=$SECONDS
if [[ $toy == 1 ]]; then
  ssh_base=(ssh -F "$HOME/.colima/_lima/colima-triplex2/ssh.config")
  target=lima-colima-triplex2
  ready_cmd="cat '$HOME/Claude/Projects/triplex-db-2/demo-toy/ready.json'"
else
  server=${DEMO_SERVER:-$(cat "$dir/server" 2>/dev/null || true)}
  [[ -n $server ]] || { echo "Put the server address in $dir/server or DEMO_SERVER" >&2; exit 2; }
  ssh_base=(ssh -i "$HOME/.ssh/triplex_bench_ed25519" -o IdentitiesOnly=yes -o ServerAliveInterval=15
    -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile="$dir/known_hosts")
  target=ubuntu@$server
  ready_cmd='sudo -n cat /var/tmp/triplex-demo/ready.json'
fi
control=$dir/tunnel.sock
if [[ -S $control ]]; then "${ssh_base[@]}" -S "$control" -O exit "$target" >/dev/null 2>&1 || true; rm -f "$control"; fi

ready=$("${ssh_base[@]}" -o ConnectTimeout=15 "$target" "$ready_cmd")
read -r remote_w remote_r < <(node -e 'const r = JSON.parse(process.argv[1]); if (r.version !== "triplex-demo-ready/1" || !r.workingCopy) throw Error("Server is not ready"); console.log(r.writePort, r.readPort)' "$ready")

# Two free local ports, never the lab's reserved ones.
read -r local_w local_r < <(node -e '
  const net = require("net");
  const reserved = new Set([15442, 17019, 5432, 6379, 4222, 4566, 16686]);
  const free = (p) => new Promise((ok) => { const s = net.createServer(); s.once("error", () => ok(false));
    s.listen(p, "127.0.0.1", () => s.close(() => ok(true))); });
  (async () => { const out = []; for (let p = 28491; out.length < 2 && p < 28600; p++) if (!reserved.has(p) && await free(p)) out.push(p);
    if (out.length < 2) throw Error("No free local ports"); console.log(out.join(" ")); })();')

"${ssh_base[@]}" -M -S "$control" -f -N -o ExitOnForwardFailure=yes \
  -L "127.0.0.1:$local_w:127.0.0.1:$remote_w" -L "127.0.0.1:$local_r:127.0.0.1:$remote_r" "$target"

node - "$ready" "$local_w" "$local_r" "$dir/connection.json" <<'NODE'
const fs = require("fs");
const [ready, w, r, file] = process.argv.slice(2);
const x = JSON.parse(ready);
const writeUrl = `http://127.0.0.1:${w}`, readUrl = `http://127.0.0.1:${r}`;
(async () => {
  const get = async (url) => { const t = performance.now(); const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw Error(url + " answered " + res.status); return { body: await res.json(), ms: performance.now() - t,
      server: Number(res.headers.get("x-tx2-gateway-micros")) / 1000 }; };
  await get(writeUrl + "/health"); await get(readUrl + "/health");
  const wb = await get(`${writeUrl}/v1/db/${x.database}/basis`), rb = await get(`${readUrl}/v1/db/${x.database}/basis`);
  const connection = { version: "triplex-demo-connection/1", kind: x.kind, database: x.database, scope: x.scope,
    writeUrl, readUrl, workingCopy: x.workingCopy === true, recordsAtBringUp: x.recordsAtBringUp, headAtBringUp: x.head,
    physicalTAtBringUp: x.physicalT, sealed: x.sealed, roster: x.roster, clocks: x.clocks ?? null,
    lastRecordedAtBringUp: x.lastRecordedAt ?? null, loaderPositionRows: x.loaderPositionRows === true,
    memory: x.memory ?? null, pinnedReads: x.pinnedReads ?? null, workingCopyMadeAt: x.workingCopyMadeAt ?? null, readyAt: x.startedAt ?? null, connectedAt: new Date().toISOString() };
  fs.writeFileSync(file + ".tmp", JSON.stringify(connection, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(file + ".tmp", file);
  console.log(`CONNECTED ${x.kind === "1b" ? "1 billion database" : "toy database"}: head ${wb.body.position.v} (read gateway ${rb.body.position.v}), ` +
    `records at bring-up ${x.recordsAtBringUp.toLocaleString("en-US")}, write ${writeUrl}, read ${readUrl}, tunnel round trip ${wb.ms.toFixed(1)} ms`);
})().catch((e) => { console.error(e.message); process.exit(1); });
NODE
printf 'State file %s; connect took %d s. Close with demo/disconnect.sh%s\n' "$dir/connection.json" "$((SECONDS - started))" "$([[ $toy == 1 ]] && echo ' --toy')"
