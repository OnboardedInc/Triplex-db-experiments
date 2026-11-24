// [DX-RD4] Test stack only (stack/up.sh with DX_RD4_READ_HOLD=1 on a tx2-dxrd4-* prefix on the Mac): the read gateway's
// peer reaches the transactor through this proxy, which shares the read gateway's network namespace. The read gateway
// resolves the transactor's name to 127.0.0.1, so its peer connects here; every byte goes on to the transactor's address.
// POST /hold keeps the transactor's bytes (the novelty the peer applies) until POST /release, so the read peer is
// genuinely behind an acknowledged write; GET /stats counts the peer's chunks and bytes in each direction, so a gate can
// show that a read sent nothing to the transactor. Rejected: a hook inside the gateway (it would not test the product's
// own wait), pausing the container (stops the gateway too) and delaying all traffic (storage reads too).
//   node hold-proxy.mjs TRANSACTOR_ADDRESS PORT...      control on 0.0.0.0:8099
import net from "node:net";
import http from "node:http";

const [target, ...ports] = process.argv.slice(2);
if (!target || !ports.length) throw Error("usage: hold-proxy.mjs ADDRESS PORT...");
let held = false;
const stats = { connections: 0, open: 0, toTransactorChunks: 0, toTransactorBytes: 0, toPeerChunks: 0, toPeerBytes: 0,
  heldChunks: 0, holds: 0, releases: 0 };
const flushers = new Set();
for (const port of ports.map(Number)) {
  net.createServer((peer) => {
    stats.connections++;
    stats.open++;
    const queue = [];
    const transactor = net.connect(port, target);
    const flush = () => { while (queue.length) peer.write(queue.shift()); };
    flushers.add(flush);
    peer.on("data", (chunk) => {
      stats.toTransactorChunks++;
      stats.toTransactorBytes += chunk.length;
      transactor.write(chunk);
    });
    transactor.on("data", (chunk) => {
      stats.toPeerChunks++;
      stats.toPeerBytes += chunk.length;
      if (held || queue.length) {
        stats.heldChunks++;
        queue.push(chunk);
      } else peer.write(chunk);
    });
    const end = () => {
      if (!flushers.delete(flush)) return;
      stats.open--;
      peer.destroy();
      transactor.destroy();
    };
    for (const socket of [peer, transactor]) {
      socket.on("error", end);
      socket.on("close", end);
    }
  }).listen(port, "127.0.0.1");
}
http.createServer((req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "POST" && req.url === "/hold") {
    held = true;
    stats.holds++;
  } else if (req.method === "POST" && req.url === "/release") {
    held = false;
    stats.releases++;
    for (const flush of flushers) flush();
  } else if (!(req.method === "GET" && req.url === "/stats")) return reply(404, { code: "NotFound" });
  reply(200, { held, at: Date.now(), ...stats });
}).listen(8099, "0.0.0.0");
