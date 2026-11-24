// [DX-CON1] On the rented machine itself: write the private connection file the console's functions read, from the
// ready file demo/server-up.sh wrote, pointing at the gateways on this machine's loopback (no SSH forward).
// Same fields as demo/connect.sh writes on the Mac. Usage: node demo/server/local-connection.mjs READY_FILE STATE_FILE
import fs from "node:fs";
const [readyFile, stateFile] = process.argv.slice(2);
const x = JSON.parse(fs.readFileSync(readyFile, "utf8"));
if (x.version !== "triplex-demo-ready/1" || !x.workingCopy) throw new Error("The server is not ready on a working copy");
const writeUrl = `http://127.0.0.1:${x.writePort}`, readUrl = `http://127.0.0.1:${x.readPort}`;
for (const url of [writeUrl, readUrl]) {
  const res = await fetch(url + "/health", { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("A gateway is not healthy: " + res.status);
}
const connection = { version: "triplex-demo-connection/1", kind: x.kind, database: x.database, scope: x.scope,
  writeUrl, readUrl, workingCopy: x.workingCopy === true, recordsAtBringUp: x.recordsAtBringUp, headAtBringUp: x.head,
  physicalTAtBringUp: x.physicalT, sealed: x.sealed, roster: x.roster, clocks: x.clocks ?? null,
  lastRecordedAtBringUp: x.lastRecordedAt ?? null, loaderPositionRows: x.loaderPositionRows === true,
  memory: x.memory ?? null, pinnedReads: x.pinnedReads ?? null, workingCopyMadeAt: x.workingCopyMadeAt ?? null,
  readyAt: x.startedAt ?? null, connectedAt: new Date().toISOString() };
fs.writeFileSync(stateFile + ".tmp", JSON.stringify(connection, null, 2) + "\n", { mode: 0o600 });
fs.renameSync(stateFile + ".tmp", stateFile);
console.log(`CONNECTED LOCALLY ${x.kind}: head ${x.head}, records ${x.recordsAtBringUp}, pinned reads ${JSON.stringify(x.pinnedReads)}`);
