import http from "node:http";
import { createInterface } from "node:readline";
import assert from "node:assert/strict";
const clock = () => performance.timeOrigin + performance.now(),
  entry = clock(),
  entryCpu = process.cpuUsage();
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })[
  Symbol.asyncIterator
]();
const message = async () => {
  const row = await input.next();
  assert(!row.done);
  return JSON.parse(row.value);
};
const send = (x: unknown) => process.stdout.write(JSON.stringify(x) + "\n");
let phase = "imports";
const requests: {
  phase: string;
  op: string;
  start: number;
  socket?: number;
  written?: number;
  headers?: number;
  gatewayUs?: number;
  reused?: boolean;
}[] = [];
const agent = http.Agent.prototype as any,
  original = agent.addRequest;
agent.addRequest = function (req: http.ClientRequest, ...args: any[]) {
  const row: (typeof requests)[number] = {
    phase,
    op: req.path.split("?")[0]!.split("/").at(-1)!,
    start: clock(),
  };
  requests.push(row);
  req.once("socket", () => {
    row.socket = clock();
  });
  req.once("finish", () => {
    row.written = clock();
    row.reused = req.reusedSocket;
  });
  req.once("response", (r: http.IncomingMessage) => {
    row.headers = clock();
    const u = r.headers["x-tx2-gateway-micros"];
    if (u !== undefined) row.gatewayUs = Number(u);
  });
  return original.call(this, req, ...args);
};
const [{ openStore }, { LazyReader }] = await Promise.all([
  import("./store.ts"),
  import("./read.ts"),
]);
const imported = clock(),
  importCpu = process.cpuUsage(entryCpu);
const boot = await message();
assert(boot.scope && boot.nonce);
assert(["legacy", "shared-cut"].includes(boot.path));
phase = "connect";
const opening = clock(),
  s = await openStore(boot.scope, boot.format, boot.path === "shared-cut" ? "read" : "write");
const connected = clock(),
  startup = { entry, imported, opening, connected, importCpu, requests: requests.splice(0) };
try {
  const reader = new LazyReader(s, boot.format, 4 << 20, () => boot.valid, boot.path);
  send({ ready: true, nonce: boot.nonce, scope: s.scope, startup });
  for (;;) {
    const m = await message();
    if (m.close) break;
    assert(m.nonce && m.subject);
    const begin = clock(),
      stamps: { phase: string; at: number }[] = [];
    const cpu = process.cpuUsage();
    const r = await reader.readAt(m.subject, {}, undefined, (name) => {
      phase = name;
      stamps.push({ phase: name, at: clock() });
    });
    const done = clock();
    send({
      nonce: m.nonce,
      scope: s.scope,
      pid: process.pid,
      begin,
      done,
      stamps,
      cpu: process.cpuUsage(cpu),
      requests: requests.splice(0),
      ...r,
    });
  }
} finally {
  agent.addRequest = original;
  await s.close();
  input.return?.();
}
