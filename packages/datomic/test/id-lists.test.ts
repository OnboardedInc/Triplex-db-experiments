import { createServer } from "node:http";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import {
  candidateIds,
  configStoreIdLists,
  entityPage,
  listIdsPage,
  validateIdListOptions,
  type IdListOptions,
} from "../src/idLists.js";

// [DX-XQ3] The SDK side of the ID list route against a scripted gateway: ranges walked in ID order across accounts,
// resumption after an entity, cursors followed, IndexBusy waited out, and the entity page equal to a scan's page.
// The route itself is gated on a real gateway (ids_test.clj, lab/experiments/EXP-DX1/xq3/gate.ts).
const ids: Record<string, string[]> = {
  "acct/a/pl:": ["acct/a/pl:00000001", "acct/a/pl:00000002", "acct/a/pl:00000003"],
  "acct/b/pl:": ["acct/b/pl:00000001", "acct/b/pl:00000002"],
};
async function gateway(busyFirst = 0) {
  const requests: Record<string, unknown>[] = [];
  let busy = busyFirst;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(Buffer.from(c));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    requests.push(body);
    if (busy-- > 0) {
      res.statusCode = 503;
      return res.end(JSON.stringify({ code: "IndexBusy", message: "busy", retryAfterMs: 1 }));
    }
    const start = `acct/${body.account}/${body.prefix}`;
    const all = ids[start] ?? [];
    const from = body.cursor ? JSON.parse(body.cursor).last : body.after;
    const rest = all.filter((id) => from === undefined || id > from);
    const page = rest.slice(0, 2); // two per page, so cursors are followed
    const more = rest.length > page.length;
    res.end(
      JSON.stringify({
        database: "s2-x", account: body.account, position: body.basis?.recordedPosition ?? 9, t: "9", head: 9,
        validAt: null, trailingBy: 0, result: "ids", ids: page, examined: page.length, segmentsLoaded: 0,
        scanMicros: 1, stopped: more ? "limit" : "end", next: more ? JSON.stringify({ last: page.at(-1) }) : null,
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as { port: number };
  return { client: new DatomicClient(`http://127.0.0.1:${port}`, 5000), requests, close: () => server.close() };
}
const options: IdListOptions = {
  types: { Subject: [{ account: "b", prefix: "pl:" }, { account: "a", prefix: "pl:" }] },
};

describe("ID lists in the SDK", () => {
  it("refuses ranges that would list an entity twice, and bad accounts", () => {
    expect(() => validateIdListOptions({ types: { T: [{ account: "a", prefix: "pl:" }, { account: "a", prefix: "pl:0" }] } })).toThrow(/inside range/);
    expect(() => validateIdListOptions({ types: { T: [{ account: "a/b", prefix: "" }] } })).toThrow(/invalid account/);
    expect(() => validateIdListOptions({ types: { T: [] } })).toThrow(/no ID range/);
    expect(() => validateIdListOptions({ types: configStoreIdLists })).not.toThrow();
  });
  it("walks every range in ID order, follows cursors and resumes after an entity", async () => {
    const g = await gateway();
    try {
      const all: string[] = [];
      for await (const page of candidateIds(g.client, "s2-x", options, "Subject", 9, undefined, () => 1000)) all.push(...page);
      expect(all).toEqual([...ids["acct/a/pl:"]!, ...ids["acct/b/pl:"]!]);
      const after: string[] = [];
      for await (const page of candidateIds(g.client, "s2-x", options, "Subject", 9, "acct/a/pl:00000002", () => 1000)) after.push(...page);
      expect(after).toEqual(["acct/a/pl:00000003", ...ids["acct/b/pl:"]!]);
      expect(g.requests.every((r) => r["cursor"] !== undefined || (r["basis"] as { recordedPosition: number }).recordedPosition === 9)).toBe(true);
    } finally {
      g.client.close();
      g.close();
    }
  });
  it("waits out IndexBusy, then fails after its attempts", async () => {
    const g = await gateway(3);
    try {
      const page = await listIdsPage(g.client, "s2-x", { account: "a", prefix: "pl:", bounds: { ms: 1 } }, 5);
      expect(page.ids).toEqual(ids["acct/a/pl:"]!.slice(0, 2));
      expect(g.requests.length).toBe(4);
    } finally {
      g.client.close();
      g.close();
    }
    const h = await gateway(10);
    try {
      await expect(listIdsPage(h.client, "s2-x", { account: "a", prefix: "pl:", bounds: { ms: 1 } }, 3)).rejects.toMatchObject({ code: "IndexBusy" });
    } finally {
      h.client.close();
      h.close();
    }
  });
  it("keeps only entities with a fact of the type and reports whether another follows", async () => {
    const g = await gateway();
    try {
      const row = (entity_id: string, entity_type: string | null) => ({ entity_id, entity_type }) as never;
      const read = async (batch: readonly string[]) =>
        new Map(batch.map((id) => [id, id.endsWith("2") ? [row(id, "Other")] : [row(id, "Subject")]] as const));
      const basis = { validAt: 1, recordedPosition: 9 };
      const first = await entityPage(g.client, "s2-x", options, read, { entityType: "Subject", limit: 2, basis }, 9);
      expect(first.entities.map(([id]) => id)).toEqual(["acct/a/pl:00000001", "acct/a/pl:00000003"]);
      expect(first.more).toBe(true);
      const second = await entityPage(g.client, "s2-x", options, read, { entityType: "Subject", after: "acct/a/pl:00000003", limit: 2, basis }, 9);
      expect(second.entities.map(([id]) => id)).toEqual(["acct/b/pl:00000001"]);
      expect(second.more).toBe(false);
    } finally {
      g.client.close();
      g.close();
    }
  });
});
