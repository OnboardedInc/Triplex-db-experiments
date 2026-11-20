import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const [base, output] = process.argv.slice(2);
assert(base && output, "Usage: trace-config.ts BASE_PRIVATE_CONFIG RUNS_OUTPUT");
const runs = path.resolve("runs") + path.sep;
assert(
  path.resolve(output).startsWith(runs) && !fs.existsSync(output),
  "Use a fresh private runs directory",
);
fs.cpSync(base, output, { recursive: true, errorOnExist: true, force: false });
const entry = path.join(output, "lab/config/datomic/entrypoint.sh");
const body = fs.readFileSync(entry, "utf8");
const gateway = 'taskset -c "$GW_CPUS" bin/run -m triplex.gateway.main &';
assert(body.split(gateway).length === 2, "No unique gateway launch in the owned config");
// [DX-RD1] Why: use the existing native spans on an owned volume and retrieve them through engine.mjs logs.
// Rejected: instrumenting the product gateway or guessing admission time from HTTP elapsed time.
const trace = `export TX2_READ_PERMITS=2 TRIPLEX_TRACE_LEVEL=full TRIPLEX_TRACE_JFR=0
export TRIPLEX_TRACE_DIR=/data/log/rd1 TRIPLEX_TRACE_PROCESS=gateway
export TRIPLEX_TRACE_RUN="rd1-$HOSTNAME" TRIPLEX_TRACE_SLOT="$HOSTNAME"
export TRIPLEX_TRACE_SOURCE="$GATEWAY_SOURCE_SHA256"
tail -n +1 -F -s 0.1 /data/log/rd1/gateway.jsonl 2>/dev/null &
tail_pid=$!
`;
const updated = body
  .replace(gateway, trace + gateway)
  .replace(
    'wait -n "$tx" "$gw" || true',
    'wait -n "$tx" "$gw" || true\nkill "$tail_pid" 2>/dev/null || true',
  );
fs.writeFileSync(entry, updated);
const slotsFile = path.join(output, "lab/config/slots.json");
const slots = JSON.parse(fs.readFileSync(slotsFile, "utf8"));
slots.lanes.datomic.image = "tx2-datomic:dx-rd1-p2-trace";
fs.writeFileSync(slotsFile, JSON.stringify(slots, null, 2) + "\n");
