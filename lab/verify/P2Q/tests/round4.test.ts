// [CX-VP2Q-4] Why: real HTTP truncation can differ from a mocked ECONNRESET.
// Rejected: reusing the builder's Error strings (does not test the client's emitted cause).
import http from "node:http";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import { makeQleverClient, type QleverClient } from "../../../../packages/qlever/src/QleverClient.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { BasisNotAvailable } from "../../../../packages/qlever/src/broker/errors.js";
import { markerQuery } from "../../../../packages/qlever/src/broker/sparql.js";
import { attempt, freshDir, openRt, ops, writeJson } from "./harness.js";

const makers = { standard: makeQleverClient, fresh: makeFreshConnectionClient };
const contract = { name: "round4-errors", parameters: TypeExpr.any, row: TypeExpr.any };
const nativeQuery = "SELECT ?s WHERE { ?s ?p ?o } LIMIT 0";
const logical = { find: ["?v"], where: [["s:round4", ":v/f0", "?v"]] } as any;
const result = (effect: any): Promise<any> => Effect.runPromise(Effect.match(effect, {
  onFailure: (error) => ({ ok: false, error }), onSuccess: (value) => ({ ok: true, value }),
}));
const causeRecord = (e: any): any => e == null ? null : {
  name: e.name, tag: e._tag, reason: e.reason ?? null, required: e.required ?? null,
  observed: e.observed ?? null, replica: e.replica ?? null, surface: e.surface ?? null,
  code: e.code ?? null, message: e.message, cause: e.cause ? causeRecord(e.cause) : null,
};
type Timing = "connect" | "headers" | "body" | "503" | "400" | "malformed" | "success";

const listen = async (server: http.Server) => {
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return `http://127.0.0.1:${(server.address() as any).port}`;
};
const close = async (server: http.Server) => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
};
// [CX-VP2Q-4] Why: inject only at the answer boundary; markers and live writes stay available.
// Rejected: stopping the shared resident (would disturb other agents and test a different schedule).
const endpoint = async (timing: Timing, upstream?: QleverClient) => {
  let answers = 0, forwarded = 0;
  const events: string[] = [];
  const deadServer = http.createServer();
  const deadUrl = await listen(deadServer);
  await close(deadServer);
  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const sparql = Buffer.concat(chunks).toString();
    const marker = sparql.startsWith("SELECT ?position");
    const send = (bindings: any[]) => res.end(JSON.stringify({ head: { vars: [] }, results: { bindings } }));
    if (marker) {
      events.push("marker");
      res.writeHead(200, { "Content-Type": "application/sparql-results+json" });
      if (upstream) { forwarded++; return send(await upstream.query(sparql)); }
      return send([{ position: { type: "literal", value: "2048" }, incarnation: { type: "literal", value: "round4" } }]);
    }
    answers++;
    let bindings: any[] = [];
    if (upstream) { forwarded++; bindings = await upstream.query(sparql); }
    events.push("answer-acquired");
    if (timing === "400" || timing === "503") {
      res.writeHead(Number(timing)); res.end("invalid connection query"); return;
    }
    res.writeHead(200, { "Content-Type": "application/sparql-results+json" });
    if (timing === "malformed") { res.end("not a SELECT result"); return; }
    if (timing === "headers" || timing === "body") {
      res.flushHeaders(); events.push("headers-flushed");
      if (timing === "body") { res.write('{"head":{"vars":["v"]},"results":{"bindings":['); events.push("partial-body-flushed"); }
      setTimeout(() => { events.push("socket-destroyed"); res.destroy(); }, 40);
      return;
    }
    send(bindings);
  });
  const url = await listen(server);
  return { url, deadUrl, events, stats: () => ({ answers, forwarded }), close: () => close(server) };
};
const clients = (kind: keyof typeof makers, ep: Awaited<ReturnType<typeof endpoint>>, timing: Timing) => {
  const good = makers[kind](ep.url);
  const dead = makers[kind](ep.deadUrl);
  return { ...good, query: (sparql: string, options: any) => timing === "connect" && !sparql.startsWith("SELECT ?position")
    ? dead.query(sparql, options) : good.query(sparql, options) };
};
const execute = (surface: string, client: QleverClient, scope: any, required: number, observed: number, gateOverride?: any) => {
  if (surface === "native") return makeQleverNativeQueries(client, scope, { awaitBasisMs: 50 }).select(contract, {}, () => nativeQuery, { basis: { recordedPosition: required } });
  const snapshot = { basis: required, marker: { position: observed, epoch: 1, incarnation: "round4" }, fencedIncarnation: "round4", surface: "datalog", started: performance.now() };
  const gate = gateOverride ?? Object.assign(async () => snapshot, { inTransaction: async () => snapshot, after: async () => {} });
  return makeQleverQueryExecutor(client, scope, { resolveBasis: gate }).execute(logical, false, { recordedPosition: required, validAt: Date.now() + 1000000 });
};

const matrix = Object.keys(makers).flatMap(kind => ["native", "datalog"].flatMap(surface =>
  (["connect", "headers", "body", "503", "400", "malformed", "success"] as Timing[]).map(timing => ({ kind: kind as keyof typeof makers, surface, timing }))));

describe("round4 real HTTP error matrix (local fixture, no engine)", () => {
  it.each(matrix)("$kind $surface $timing", async ({ kind, surface, timing }) => {
    const ep = await endpoint(timing);
    try {
      const res = await result(execute(surface, clients(kind, ep, timing), DatabaseScope.test(`round4:${randomUUID()}`), 1024, 2048));
      writeJson(`round4-http-${kind}-${surface}-${timing}.json`, { timing, kind, surface, events: ep.events, ...ep.stats(), ok: res.ok, error: causeRecord(res.error) });
      if (timing === "success") expect(res.ok).toBe(true);
      else {
        expect(res.ok).toBe(false);
        if (["connect", "headers", "body", "503"].includes(timing))
          expect(res.error).toMatchObject({ reason: "replica-unreachable", required: 1024, observed: 2048, replica: "the QLever replica", surface });
        else expect(res.error?.reason).not.toBe("replica-unreachable");
      }
    } finally { await ep.close(); }
  });

  it.each(["native", "datalog"])("%s unmet basis stays basis-not-reached and sends no answer", async (surface) => {
    const ep = await endpoint("success");
    const unavailable = new BasisNotAvailable({ required: 4096, observed: 2048, replica: "test", surface: "datalog", waitedMs: 50 });
    const gate = Object.assign(async () => { throw unavailable; }, { inTransaction: async () => { throw unavailable; }, after: async () => {} });
    try {
      const res = await result(execute(surface, makeQleverClient(ep.url), DatabaseScope.test(`round4-basis:${randomUUID()}`), 4096, 2048, gate));
      writeJson(`round4-http-${surface}-unmet-basis.json`, { ok: res.ok, ...ep.stats(), error: causeRecord(res.error) });
      expect(res.error).toMatchObject({ reason: "basis-not-reached", required: 4096, observed: 2048 });
      expect(ep.stats().answers).toBe(0);
    } finally { await ep.close(); }
  });
});

const liveMatrix = matrix.filter(({ timing }) => ["connect", "headers", "body"].includes(timing));
describe.skipIf(process.env.V_P2Q_LIVE !== "1")("round4 live answer boundary on qlever-dev", () => {
  it.each(liveMatrix)("$kind $surface $timing", async ({ kind, surface, timing }) => {
    const url = process.env.QLEVER_URL ?? "http://127.0.0.1:7070";
    if (url !== "http://127.0.0.1:7070") throw new Error("qlever-dev only");
    const upstream = makeFreshConnectionClient(url);
    const scope = DatabaseScope.test(`v-p2q-round4:${randomUUID()}`);
    const rt = await openRt(freshDir("round4-live"), scope, upstream);
    const ep = await endpoint(timing, upstream);
    try {
      const first = await rt.run(rt.triples.transact(ops("s:round4", 1, "first")));
      expect(await rt.broker.drain(60000)).toBe(true);
      await rt.run(rt.triples.transact(ops("s:other", 1, "second")));
      expect(await rt.broker.drain(60000)).toBe(true);
      const observed = Number((await upstream.query(markerQuery(scope)))[0]!.brokerPosition!.value);
      const res = await attempt(rt, execute(surface, clients(kind, ep, timing), scope, first.position, observed, rt.adapter.resolveQueryBasis));
      writeJson(`round4-live-${kind}-${surface}-${timing}.json`, { kind, surface, timing, required: first.position, observed, scope, upstream: url, events: ep.events, ...ep.stats(), ok: res.ok, error: causeRecord(res.error) });
      expect(res.ok).toBe(false);
      expect(res.error).toMatchObject({ reason: "replica-unreachable", required: first.position, observed, replica: "the QLever replica", surface });
    } finally { await ep.close(); await rt.dispose(); await rt.broker.close(); }
  });
});
