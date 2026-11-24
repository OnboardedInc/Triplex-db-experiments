import { createServer } from "node:http";
import { Effect } from "effect";
import { afterAll, beforeAll, expect, it } from "vitest";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { databaseName } from "../src/scopeName.js";
import { encodeRowText } from "../src/rowText.js";

// [DX-JRN1] Why: the SDK's bounded journal option must give the caller the same answer as one unbounded page, however
// often the gateway stops on its examine bound. This fake gateway models the position index as physical entries, most of
// which yield no journal, and answers bounded requests the way journal.clj does (cursor = last position considered).
// Rejected: testing only the gateway (the SDK loop decides when a short page is the end of the feed).
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", "jrn1-bounds", 0]);
const db = databaseName(scope);
const journals = new Map<number, string>([3, 4, 90, 91, 400].map((p) => [p, "_tx/" + String(p).padStart(26, "0")]));
const entries = Array.from({ length: 400 }, (_, i) => i + 1);
const owners = new Map<number, boolean>([[3, true], [90, true], [400, true], [4, false], [91, false]]);
const requests: Record<string, unknown>[] = [];
const journalRow = (tx: string, p: number) =>
  encodeRowText({ id: "J" + String(p).padStart(25, "0"), entity_id: tx, attribute: ":_tx/command-id", value_type: "string",
    value_string: "cmd-" + p, value_number: null, value_boolean: null, value_datetime: null, value_json: null,
    recorded_at: p, recorded_position: p, valid_from: 0, valid_to: null, retracted_at: null, retracted_position: null,
    retract_tx_id: null, schema_version: 1, entity_type: "_Transaction", created_by: null, tx_id: tx } as never);
let examineBound = 7;

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const input = JSON.parse(body) as Record<string, number | boolean | string | undefined>;
    requests.push(input);
    res.setHeader("Content-Type", "application/json");
    if (req.url === `/v2/db/${db}/transactions`) {
      const after = input["after"] as number, limit = input["limit"] as number;
      const out: [string, number, string[]][] = [];
      let examined = 0, scanned = after, stopped = "end";
      for (const p of entries.filter((e) => e > after)) {
        if (out.length >= limit) { stopped = "limit"; break; }
        if (input["bounded"] && examined >= examineBound) { stopped = "entries"; break; }
        examined++;
        scanned = p;
        if (journals.has(p)) out.push([journals.get(p)!, p, [journalRow(journals.get(p)!, p)]]);
      }
      if (out.length >= limit && stopped === "end") stopped = "limit";
      const page = out.slice(0, limit);
      const next = stopped === "limit" ? page.at(-1)![1] : scanned;
      res.end(JSON.stringify({ head: 400, transactions: page, clockEnds: page.map(([, p]) => [p, p]),
        ...(input["bounded"] ? { examined, next, stopped } : {}) }));
      return;
    }
    if (req.url === `/v2/db/${db}/entity-transactions`) {
      const limit = input["limit"] as number, before = (input["beforePosition"] as number | undefined) ?? Infinity;
      const out: [string, number][] = [];
      let examined = 0, floor = 0, stopped = "end";
      for (const p of [...entries].reverse().filter((e) => e < before)) {
        if (out.length >= limit) { stopped = "limit"; break; }
        if (input["bounded"] && examined >= examineBound) { stopped = "entries"; break; }
        examined++;
        floor = p;
        if (owners.get(p)) out.push([journals.get(p)!, p]);
      }
      if (out.length >= limit && stopped === "end") stopped = "limit";
      res.end(JSON.stringify({ positions: out.slice(0, limit),
        ...(input["bounded"] ? { examined, stopped, ...(stopped === "entries" ? { nextBefore: floor } : {}) } : {}) }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
});
let client: DatomicClient;
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  client = new DatomicClient(`http://127.0.0.1:${(server.address() as { port: number }).port}`);
  (client as unknown as { journalCuts: Set<string> }).journalCuts.add(db);
});
afterAll(async () => {
  client.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const feed = (bounded: boolean, after: number, limit: number) =>
  Effect.runPromise(
    makeDatomicStorageAdapter(client, scope, { layout: "lean", boundedJournalPages: bounded }).getTransactionsAfter!(after, limit),
  );
const entity = (bounded: boolean, limit: number, before?: number) =>
  Effect.runPromise(
    makeDatomicStorageAdapter(client, scope, { layout: "lean", boundedJournalPages: bounded })
      .getTransactionPositionsByEntity!("owner", limit, { recordedPosition: 400, validAt: 0 }, before),
  );

it("follows bounded feed cursors to the same transactions as one unbounded page", async () => {
  for (const bound of [1, 7, 1000])
    for (const [after, limit] of [[0, 1000], [0, 1], [0, 3], [3, 2], [91, 10], [400, 5], [5, 1]] as const) {
      examineBound = bound;
      requests.length = 0;
      const plain = await feed(false, after, limit);
      expect(requests.every((r) => r["bounded"] === undefined)).toBe(true);
      requests.length = 0;
      const bounded = await feed(true, after, limit);
      expect(bounded).toEqual(plain);
      expect(requests.every((r) => r["bounded"] === true)).toBe(true);
      // Only the first page may wait; every later page asks for the rest of the caller's limit.
      expect(requests.slice(1).every((r) => r["waitMs"] === 0)).toBe(true);
      if (bound === 1 && after === 91 && limit === 10) expect(requests.length).toBeGreaterThan(300);
    }
});

it("follows bounded entity-journal cursors to the same positions as one unbounded request", async () => {
  for (const bound of [1, 7, 1000])
    for (const [limit, before] of [[50, undefined], [1, undefined], [2, undefined], [2, 90], [5, 4]] as const) {
      examineBound = bound;
      const plain = await entity(false, limit, before);
      const bounded = await entity(true, limit, before);
      expect(bounded).toEqual(plain);
    }
});
