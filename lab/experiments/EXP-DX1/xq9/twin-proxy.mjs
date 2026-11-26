// [DX-XQ9] Comparing proxy for the twin arms of gate.sh: listens on 127.0.0.1:PORT and forwards every request to the
// read gateway under test (MAIN); every POST .../sweep also goes to the twin running the base source (TWIN). The main
// gateway's answer is returned to the client (so the sweep builder's gate checks it as before). The two answers are
// compared after removing what differs between two processes by nature: timing (micros, cpuMicros), storage
// accounting (ioReads, segmentsLoaded) and the head the gateway saw; for a first page with no stated valid time, the
// gateway's clock (validAt, inside the cursor too). Everything else, status, code, message, IDs, counts, groups,
// position, every other field and the signed cursor, must be byte-identical.
//   node twin-proxy.mjs PORT MAIN_URL TWIN_URL OUT_JSONL
import http from "node:http";
import fs from "node:fs";
const [port, main, twin, out] = process.argv.slice(2);
const counts = { requests: 0, sweeps: 0, identical: 0, different: 0, busySkipped: 0, twinErrors: 0 };
const log = (o) => fs.appendFileSync(out, JSON.stringify({ at: new Date().toISOString(), ...o }) + "\n");
const send = async (base, req, body) => {
  const r = await fetch(base + req.url, { method: req.method, headers: { "content-type": "application/json" }, body: req.method === "GET" ? undefined : body });
  return { status: r.status, text: await r.text(), headers: r.headers };
};
const VOLATILE = ["micros", "cpuMicros", "ioReads", "segmentsLoaded", "head"];
const normalize = (text, clockFree) => {
  let v;
  try { v = JSON.parse(text); } catch { return text; }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of VOLATILE) delete v[k];
    if (clockFree) {
      delete v.validAt;
      if (typeof v.next === "string") {
        const [b] = v.next.split(".");
        const c = JSON.parse(Buffer.from(b, "base64url").toString());
        delete c.validAt;
        v.next = c;
      }
    }
  }
  return JSON.stringify(v);
};
http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  counts.requests++;
  try {
    const sweep = req.method === "POST" && /\/sweep$/.test(req.url);
    const [a, b] = await Promise.all([send(main, req, body), sweep ? send(twin, req, body).catch((e) => ({ error: String(e) })) : null]);
    if (sweep) {
      counts.sweeps++;
      let input = {};
      try { input = JSON.parse(body.toString()); } catch {}
      const clockFree = !input.cursor && !(input.basis && input.basis.validAt !== undefined);
      if (b.error) { counts.twinErrors++; log({ kind: "twin-error", error: b.error }); }
      else if (a.status === 503 || b.status === 503) counts.busySkipped++;
      else {
        const same = a.status === b.status && normalize(a.text, clockFree) === normalize(b.text, clockFree);
        if (same) counts.identical++;
        else { counts.different++; log({ kind: "different", request: input, main: { status: a.status, body: a.text.slice(0, 4000) }, twin: { status: b.status, body: b.text.slice(0, 4000) } }); }
      }
      if (counts.sweeps % 200 === 0) log({ kind: "counts", ...counts });
    }
    res.writeHead(a.status, { "content-type": a.headers.get("content-type") ?? "application/json" });
    res.end(a.text);
  } catch (e) {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ code: "ProxyError", message: String(e) }));
  }
}).listen(Number(port), "127.0.0.1", () => log({ kind: "listening", port, main, twin }));
const finish = () => { log({ kind: "final", ...counts }); process.exit(0); };
process.on("SIGTERM", finish); process.on("SIGINT", finish);
