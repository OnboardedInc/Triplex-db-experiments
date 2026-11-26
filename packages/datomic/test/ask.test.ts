import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import { askAll, askPage, AskRefused } from "../src/ask.js";

// [DX-XQ10] The SDK's one call for questions across subjects, against a scripted gateway that records what reaches
// each route: the index first, the sweep on a refusal with fallback "sweep" at the same basis and valid time, refusals
// without it thrown as they are, cursors never sent to the other route, a later index refusal restarting the question
// on the sweep at the pinned position. The routes themselves are gated on a stack (lab/experiments/EXP-DX1/xq10).
type Reply = { status?: number; body: unknown };
async function gateway(script: { find: Reply[]; sweep: Reply[] }) {
  const seen: { route: string; body: Record<string, unknown> }[] = [];
  const server = createServer(async (req, res) => {
    let text = "";
    for await (const chunk of req) text += chunk;
    const route = (req.url ?? "").split("/").pop()!;
    seen.push({ route, body: text ? JSON.parse(text) : {} });
    const next = (script as Record<string, Reply[]>)[route]?.shift();
    res.statusCode = next?.status ?? (next ? 200 : 404);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(next?.body ?? { code: "NotFound", message: "not scripted" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as { port: number };
  return { client: new DatomicClient(`http://127.0.0.1:${port}`, 5000), seen, close: () => server.close() };
}
const findPage = (over: Record<string, unknown> = {}) => ({
  database: "s2-x", account: "a", position: 42, t: "42", validAt: 1000, head: 50, indexEpoch: 10, trailingBy: 0,
  result: "ids", order: { by: "entity", direction: "asc" }, ids: ["acct/a/pl:1"], examined: 3, segmentsLoaded: 0,
  stopped: "end", next: null, ...over,
});
const sweepPg = (over: Record<string, unknown> = {}) => ({
  database: "s2-x", account: "a", position: 42, t: "42", head: 50, validAt: 1000, facts: "stored", result: "ids",
  complete: true, stopped: "end", examined: 2, listed: 2, subjects: 2, matched: 1, rows: 4, segmentsLoaded: 0,
  micros: { total: 0, list: 0, read: 0, evaluate: 0, queue: 0 }, cpuMicros: 0, ids: ["acct/a/pl:1"], next: null, ...over,
});
const refusal = (status: number, code: string, fallback?: "sweep" | "none") => ({
  status, body: { code, message: code, ...(fallback ? { fallback } : {}) },
});
const q = { account: "a", from: { prefix: "pl:" }, where: [{ attribute: ":x/s", op: "eq" as const, value: { type: "string" as const, value: "v" } }] };

describe("one call for questions across subjects", () => {
  it("answers from the index when it can, in entity ID order, and never asks the sweep", async () => {
    const g = await gateway({ find: [{ body: findPage() }], sweep: [] });
    try {
      const a = await askPage(g.client, "s2-x", { ...q, basis: { validAt: 1000 } });
      expect(a.route).toBe("index");
      expect(a.indexRefusal).toBeUndefined();
      expect(a.ids).toEqual(["acct/a/pl:1"]);
      expect([a.position, a.validAt, a.complete, a.order]).toEqual([42, 1000, true, "id"]);
      expect(g.seen.map((s) => s.route)).toEqual(["find"]);
      expect(g.seen[0]!.body["order"]).toEqual({ by: "entity", direction: "asc" });
    } finally { g.close(); }
  });

  it("on a refusal with fallback sweep asks the sweep the same question at the same basis and valid time", async () => {
    const g = await gateway({ find: [refusal(409, "AttributeNotIndexed", "sweep")], sweep: [{ body: sweepPg() }] });
    try {
      const a = await askPage(g.client, "s2-x", { ...q, basis: { recordedPosition: 42 } });
      expect(a.route).toBe("sweep");
      expect(a.indexRefusal).toMatchObject({ route: "index", code: "AttributeNotIndexed", fallback: "sweep" });
      const [f, s] = g.seen;
      expect(f!.body["basis"]).toEqual(s!.body["basis"]);
      expect((s!.body["basis"] as { recordedPosition: number }).recordedPosition).toBe(42);
      expect(typeof (s!.body["basis"] as { validAt: number }).validAt).toBe("number"); // fixed before either route
      expect(s!.body["where"]).toEqual(q.where);
      expect(s!.body["order"]).toBeUndefined(); // find's order is never sent to the sweep
    } finally { g.close(); }
  });

  it("returns a refusal with fallback none, or with none at all, as it is", async () => {
    for (const r of [refusal(409, "InteriorPosition", "none"), refusal(409, "ProtectedValueLookup")]) {
      const g = await gateway({ find: [r], sweep: [{ body: sweepPg() }] });
      try {
        const e = await askPage(g.client, "s2-x", q).catch((x) => x);
        expect(e).toBeInstanceOf(AskRefused);
        expect([e.code, e.refusedBy]).toEqual([(r.body as { code: string }).code, "index"]);
        expect(g.seen.map((s) => s.route)).toEqual(["find"]);
      } finally { g.close(); }
    }
  });

  it("a forced route asks only that route and throws its refusals", async () => {
    const g = await gateway({ find: [refusal(409, "AttributeNotIndexed", "sweep")], sweep: [{ body: sweepPg() }] });
    try {
      await expect(askPage(g.client, "s2-x", { ...q, route: "index" })).rejects.toMatchObject({ code: "AttributeNotIndexed" });
      const s = await askPage(g.client, "s2-x", { ...q, route: "sweep" });
      expect([s.route, s.forced]).toEqual(["sweep", true]);
      expect(g.seen.map((x) => x.route)).toEqual(["find", "sweep"]);
    } finally { g.close(); }
  });

  it("sends a cursor only to the route that issued it, and refuses it for the other route or another question", async () => {
    const g = await gateway({ find: [{ body: findPage({ next: "FIND-CURSOR", stopped: "limit" }) }, { body: findPage() }], sweep: [] });
    try {
      const first = await askPage(g.client, "s2-x", q);
      expect(first.next).not.toBeNull();
      await expect(askPage(g.client, "s2-x", { ...q, route: "sweep", cursor: first.next! })).rejects.toMatchObject({ code: "CursorMismatch" });
      await expect(askPage(g.client, "s2-x", { ...q, where: [], cursor: first.next! })).rejects.toMatchObject({ code: "CursorMismatch" });
      const second = await askPage(g.client, "s2-x", { ...q, cursor: first.next! });
      expect(second.route).toBe("index");
      expect(g.seen.map((x) => [x.route, x.body["cursor"] ?? null])).toEqual([["find", null], ["find", "FIND-CURSOR"]]);
    } finally { g.close(); }
  });

  it("resends the first page's basis with every index cursor, because find binds a cursor to the whole request", async () => {
    const g = await gateway({ find: [{ body: findPage({ next: "FIND-CURSOR", stopped: "entries", position: 42, validAt: 777 }) }, { body: findPage({ position: 42, validAt: 777 }) }], sweep: [] });
    try {
      const first = await askPage(g.client, "s2-x", { ...q, basis: { recordedPosition: 42, validAt: 777 } });
      await askPage(g.client, "s2-x", { ...q, cursor: first.next! });
      expect(g.seen.map((x) => x.body["basis"])).toEqual([{ recordedPosition: 42, validAt: 777 }, { recordedPosition: 42, validAt: 777 }]);
      expect(g.seen[1]!.body["cursor"]).toBe("FIND-CURSOR");
    } finally { g.close(); }
  });

  it("a list's later page may ask for fewer rows (the limit is a page size, not part of the question)", async () => {
    const g = await gateway({ find: [{ body: findPage({ next: "FIND-CURSOR", stopped: "limit" }) }, { body: findPage() }], sweep: [] });
    try {
      const first = await askPage(g.client, "s2-x", { ...q, limit: 5 });
      const second = await askPage(g.client, "s2-x", { ...q, limit: 4, cursor: first.next! });
      expect(second.route).toBe("index");
      expect(g.seen.map((x) => x.body["limit"])).toEqual([5, 4]);
    } finally { g.close(); }
  });

  it("a later index page refused with fallback sweep restarts the question on the sweep at the pinned position", async () => {
    const g = await gateway({
      find: [{ body: findPage({ next: "FIND-CURSOR", stopped: "entries", position: 42, validAt: 777 }) }, refusal(413, "BoundTooSmall", "sweep")],
      sweep: [{ body: sweepPg({ validAt: 777, complete: false, next: "SWEEP-CURSOR", ids: ["acct/a/pl:1"] }) },
              { body: sweepPg({ validAt: 777, ids: ["acct/a/pl:2"] }) }],
    });
    try {
      const all = await askAll(g.client, "s2-x", q);
      expect([all.route, all.restarted, all.discardedIndexPages]).toEqual(["sweep", true, 1]);
      expect(all.ids).toEqual(["acct/a/pl:1", "acct/a/pl:2"]);
      expect(all.indexRefusal).toMatchObject({ code: "BoundTooSmall" });
      const sweeps = g.seen.filter((x) => x.route === "sweep");
      expect(sweeps[0]!.body["basis"]).toEqual({ recordedPosition: 42, validAt: 777 });
      expect(sweeps[0]!.body["cursor"]).toBeUndefined();
      expect(sweeps[1]!.body["cursor"]).toBe("SWEEP-CURSOR");
    } finally { g.close(); }
  });

  it("gives counts per value one form on both routes: the no-value group last, -0 as 0, integers as text", async () => {
    const g = await gateway({
      find: [{ body: findPage({ result: "countByValue", ids: undefined, count: 3, countExact: true,
        counts: [{ value: { type: "number", value: 0 }, count: 2 }, { value: { type: "integer", value: 7 }, count: 1 }, { value: null, count: 1 }] }) }],
      sweep: [{ body: sweepPg({ result: "countByValue", ids: undefined, matched: 3, countComplete: true,
        groups: [{ value: null, count: 1 }, { value: { type: "integer", value: "7" }, count: 1 }, { value: { type: "number", value: -0 }, count: 2 }] }) }],
    });
    try {
      const ask = { ...q, result: "countByValue" as const, of: ":x/s" };
      const i = await askPage(g.client, "s2-x", { ...ask, route: "index" });
      const s = await askPage(g.client, "s2-x", { ...ask, route: "sweep" });
      expect(i.counts).toEqual(s.counts);
      expect(i.counts![i.counts!.length - 1]).toEqual({ value: null, count: 1 });
      expect([i.count, s.count]).toEqual([3, 3]);
    } finally { g.close(); }
  });
});
