// [DX-B7] Why: native test files can overlap without exceeding 64 physical Mac-to-VM connections.
// Rejected: lowering logical test concurrency, or running engine gates with unbounded per-process pools.
import http from "node:http";
import fs from "node:fs";
import { createHash } from "node:crypto";
const [writePort, readPort, readyFile, receiptFile] = process.argv.slice(2);
if (!readyFile || fs.existsSync(readyFile) || fs.existsSync(receiptFile))
  throw Error("fresh proxy output paths required");
let open = 0,
  peak = 0;
const agents = [],
  servers = [];
for (const [listenPort, upstreamPort] of [
  [8536, Number(writePort)],
  [8537, Number(readPort)],
]) {
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: 32,
    maxTotalSockets: 32,
    maxFreeSockets: 32,
  });
  agents.push(agent);
  const connect = agent.createConnection;
  agent.createConnection = function (...args) {
    const socket = connect.apply(this, args);
    open++;
    peak = Math.max(peak, open);
    if (open > 64) throw Error("physical connection budget exceeded");
    socket.once("close", () => open--);
    return socket;
  };
  const server = http.createServer((req, res) => {
    const remote = http.request(
      {
        hostname: "127.0.0.1",
        port: upstreamPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
        agent,
      },
      (reply) => {
        res.writeHead(reply.statusCode, reply.headers);
        reply.pipe(res);
      },
    );
    remote.on("error", (error) => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ code: "GateProxyError", message: error.message }));
    });
    req.pipe(remote);
  });
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, "127.0.0.1", resolve);
  });
}
const identity = {
  startedAt: new Date().toISOString(),
  upstream: [Number(writePort), Number(readPort)],
  listen: [8536, 8537],
  perUpstreamSockets: 32,
  totalSocketCeiling: 64,
  sourceSha256: createHash("sha256")
    .update(fs.readFileSync(new URL(import.meta.url)))
    .digest("hex"),
};
fs.writeFileSync(readyFile, JSON.stringify(identity));
function stop() {
  fs.writeFileSync(
    receiptFile,
    JSON.stringify({
      ...identity,
      finishedAt: new Date().toISOString(),
      peakConnections: peak,
      openAtShutdown: open,
      purpose: "network observation only; no semantic verdict",
    }),
  );
  for (const a of agents) a.destroy();
  for (const s of servers) s.close();
  setTimeout(() => process.exit(0), 50).unref();
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
