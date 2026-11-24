import http from "node:http";
import { once } from "node:events";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  DatomicAtLeastTimeout,
  DatomicClient,
  DatomicHttpError,
  ReadAtLeast,
  makeDatomicStorageAdapter,
} from "../src/index.js";
import { readFailure } from "../src/readErrors.js";
import { databaseName } from "../src/scopeName.js";

// [DX-RD4] Why: the client asks for at least a position only when a caller holds one, and never trusts a gateway that
// does not confirm it. Rejected: a real gateway here (the two-peer gate in lab/experiments/EXP-DX1/rd4 covers that).
type Call = { method: string | undefined; url: string | undefined; body: string };
const tagged = (v: number) => ({ t: "long", v: String(v) });
async function gateway(answer: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const call = { method: req.method, url: req.url, body };
      calls.push(call);
      const { status = 200, body: reply } = answer(call);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(reply));
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No address");
  const client = new DatomicClient(`http://127.0.0.1:${address.port}`, 5000);
  open.push(() => {
    client.close();
    server.close();
  });
  return { client, calls };
}
const open: (() => void)[] = [];
afterEach(() => {
  for (const close of open.splice(0)) close();
});
const basisReply = (position: number, atLeast?: number) => ({
  t: tagged(position + 1000),
  position: tagged(position),
  recordedAt: null,
  schemaHash: "h",
  ...(atLeast === undefined ? {} : { atLeast, atLeastWaitMicros: 0 }),
});

describe("ReadAtLeast", () => {
  it("is built from a receipt, only rises, and asks nothing at 0", () => {
    const floor = ReadAtLeast.fromReceipt({ position: 12 }, { waitMs: 300 });
    expect(floor.request()).toEqual({ position: 12, waitMs: 300 });
    expect(floor.raise(9).position).toBe(12);
    expect(floor.raise({ position: 15 }).request()).toEqual({ position: 15, waitMs: 300 });
    expect(new ReadAtLeast().request()).toBeUndefined();
    expect(new ReadAtLeast(4).request()).toEqual({ position: 4 });
    for (const bad of [() => new ReadAtLeast(-1), () => new ReadAtLeast(1.5), () => new ReadAtLeast(1, { waitMs: 0 }),
      () => new ReadAtLeast(1, { waitMs: 2001 }), () => new ReadAtLeast().raise(Number.NaN)])
      expect(bad).toThrow(RangeError);
  });
});

describe("DatomicClient at-least reads", () => {
  it("leaves the basis call unchanged without the parameter", async () => {
    const { client, calls } = await gateway(() => ({ body: basisReply(5) }));
    const basis = await client.basis("s2-abc");
    expect(calls.map((c) => c.url)).toEqual(["/v1/db/s2-abc/basis"]);
    expect(basis.position).toEqual(tagged(5));
    expect(basis.atLeast).toBeUndefined();
  });
  it("sends the position and wait, and checks the echo and the answer", async () => {
    let reply: unknown = basisReply(9, 7);
    const { client, calls } = await gateway(() => ({ body: reply }));
    expect((await client.basis("s2-abc", { position: 7, waitMs: 300 })).position).toEqual(tagged(9));
    expect(calls.at(-1)!.url).toBe("/v1/db/s2-abc/basis?atLeast=7&waitMs=300");
    await client.basis("s2-abc", { position: 7 });
    expect(calls.at(-1)!.url).toBe("/v1/db/s2-abc/basis?atLeast=7");
    reply = basisReply(9);
    await expect(client.basis("s2-abc", { position: 7 })).rejects.toThrow(/did not confirm/);
    reply = basisReply(6, 7);
    await expect(client.basis("s2-abc", { position: 7 })).rejects.toThrow(/before the at-least position 7/);
    await expect(client.basis("s2-abc", { position: -2 })).rejects.toThrow(RangeError);
  });
  it("reports a timeout with the gateway's head", async () => {
    const { client } = await gateway(() => ({
      status: 409,
      body: { code: "AtLeastTimeout", message: "The gateway's peer did not reach position 8", maximum: 6 },
    }));
    const error = await client.basis("s2-abc", { position: 8 }).catch((e) => e);
    expect(error).toBeInstanceOf(DatomicHttpError);
    const mapped = readFailure(error, "Datomic read failed");
    expect(mapped).toBeInstanceOf(DatomicAtLeastTimeout);
    expect((mapped as DatomicAtLeastTimeout).head).toBe(6);
  });
  it("asks an unpinned snapshot for at least the position and refuses a pinned one", async () => {
    const { client, calls } = await gateway(() => ({ body: { handle: "h", position: tagged(11), atLeast: 10 } }));
    expect(await client.begin("s2-abc", { validAt: 1 }, { position: 10, waitMs: 50 })).toEqual({ handle: "h", position: 11 });
    expect(JSON.parse(calls.at(-1)!.body)).toEqual({ basis: { validAt: 1 }, atLeastPosition: 10, basisWaitMs: 50 });
    await client.begin("s2-abc", { validAt: 1 });
    expect(JSON.parse(calls.at(-1)!.body)).toEqual({ basis: { validAt: 1 } });
    await expect(client.begin("s2-abc", { validAt: 1, recordedPosition: 3 }, { position: 10 })).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(2);
  });
});

describe("DatomicClient at-least row and subject reads", () => {
  it("requires the gateway's confirmation on a row read and refuses a pinned subject pull", async () => {
    let reply: unknown = { rows: [], atLeast: 4 };
    const { client, calls } = await gateway(() => ({ body: reply }));
    expect(await client.rows("s2-abc", { pattern: {}, atLeastPosition: 4 })).toEqual([]);
    reply = { rows: [] };
    await expect(client.rows("s2-abc", { pattern: {}, atLeastPosition: 4 })).rejects.toThrow(/did not confirm/);
    expect(await client.rows("s2-abc", { pattern: {} })).toEqual([]);
    await expect(
      client.reachEntities("s2-abc", ["r"], { validAt: 1, recordedPosition: 2 }, false, false, { position: 4 }),
    ).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(3);
  });
});

describe("Datomic storage adapter built from a receipt", () => {
  const scope = DatabaseScope.test("rd4-at-least");
  const db = databaseName(scope);
  it("resolves every unpinned head at or after the floor, and follows a raised floor", async () => {
    const { client, calls } = await gateway((call) => {
      const asked = /atLeast=(\d+)/.exec(call.url ?? "")?.[1];
      return { body: basisReply(asked ? Number(asked) + 1 : 3, asked ? Number(asked) : undefined) };
    });
    const floor = ReadAtLeast.fromReceipt({ position: 20 });
    const reader = makeDatomicStorageAdapter(client, scope, { readAtLeast: floor });
    expect(await Effect.runPromise(reader.currentCommitPosition())).toBe(21);
    expect(await Effect.runPromise(reader.pullPosition!())).toBe(21);
    floor.raise({ position: 30 });
    expect(await Effect.runPromise(reader.currentCommitPosition())).toBe(31);
    const plain = makeDatomicStorageAdapter(client, scope);
    expect(await Effect.runPromise(plain.currentCommitPosition())).toBe(3);
    expect(calls.map((c) => c.url)).toEqual([
      `/v1/db/${db}/basis?atLeast=20`,
      `/v1/db/${db}/basis?atLeast=20`,
      `/v1/db/${db}/basis?atLeast=30`,
      `/v1/db/${db}/basis`,
    ]);
  });
});
