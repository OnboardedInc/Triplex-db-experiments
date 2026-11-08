import http from "node:http";
import net from "node:net";
import { describe, expect, it } from "vitest";
import { Effect, Exit, Cause } from "effect";
import { startQleverWriteCounter, startXtdbWriteCounter } from "../../../packages/qualification/src/engine-write-counter.ts";
import { readOnlyNativeSql } from "../../../packages/xtdb/src/native/ReadOnlySql.ts";
import { makeXtdbQueryExecutor } from "../../../packages/xtdb/src/XtdbQueryExecutor.ts";
import { integer } from "../../../packages/core/src/Value.ts";

// [CX-VC8-3] Why: recheck Q81b with independent method, framing and reset variations. Rejected: only replaying fixed examples (misses neighboring request shapes).
const int = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n);
  return b;
};
const frame = (type: string, payload: Buffer) =>
  Buffer.concat([Buffer.from(type), int(payload.length + 4), payload]);
const parse = (name: string, sql: string) =>
  frame("P", Buffer.concat([Buffer.from(`${name}\0${sql}\0`), Buffer.alloc(2)]));
const bind = (portal: string, name: string) =>
  frame("B", Buffer.concat([Buffer.from(`${portal}\0${name}\0`), Buffer.alloc(6)]));
const execute = (portal: string) =>
  frame("E", Buffer.concat([Buffer.from(`${portal}\0`), Buffer.alloc(4)]));
const sync = frame("S", Buffer.alloc(0));

const pgFixture = async (
  body: (
    counter: Awaited<ReturnType<typeof startXtdbWriteCounter>>,
    send: (bytes: Buffer) => Promise<void>,
  ) => Promise<void>,
) => {
  let received = 0,
    sent = 0;
  const sockets = new Set<net.Socket>();
  const upstream = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("data", (bytes) => {
      received += bytes.length;
    });
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  const counter = await startXtdbWriteCounter(
    `postgres://generic@127.0.0.1:${(upstream.address() as net.AddressInfo).port}/db`,
  );
  const client = net.connect(Number(new URL(counter.url).port), "127.0.0.1");
  const send = async (bytes: Buffer) => {
    sent += bytes.length;
    client.write(bytes);
    const deadline = Date.now() + 5_000;
    while (received < sent) {
      if (Date.now() > deadline) throw new Error("forwarding timeout");
      await new Promise((r) => setTimeout(r, 2));
    }
  };
  try {
    const fields = Buffer.from("user\0generic\0database\0db\0\0");
    await send(Buffer.concat([int(8 + fields.length), int(196608), fields]));
    await body(counter, send);
  } finally {
    client.destroy();
    await counter.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((r) => upstream.close(() => r()));
  }
};

const httpFixture = async (body: (counter: Awaited<ReturnType<typeof startQleverWriteCounter>>, forwarded: string[]) => Promise<void>) => {
  const forwarded: string[] = [];
  const upstream = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      forwarded.push(`${req.method} ${req.url} ${Buffer.concat(chunks)}`);
      res.end("{}");
    });
  });
  await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const counter = await startQleverWriteCounter(`http://127.0.0.1:${(upstream.address() as net.AddressInfo).port}`);
  try { await body(counter, forwarded); }
  finally { await counter.close(); await new Promise<void>(r => upstream.close(() => r())); }
};
const request = (url: string, method: string, path: string, body = "", contentType = "") =>
  new Promise<number>((resolve, reject) => {
    const headers: Record<string, string> = { "Content-Length": String(Buffer.byteLength(body)) };
    if (contentType) headers["Content-Type"] = contentType;
    const req = http.request(new URL(url), { method, path, headers }, res => {
      res.resume(); res.on("end", () => resolve(res.statusCode ?? 0));
    });
    req.on("error", reject); req.end(body);
  });

describe("CX-VC8-3 Q81b HTTP variations", () => {
  it("counts unknown operations across methods, paths, metadata, duplicate fields and malformed bodies", async () => {
    await httpFixture(async (counter, forwarded) => {
      const cases: {method: string; path: string; body?: string; type?: string}[] = [];
      for (const method of ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE", "TRACE", "PROPFIND"])
        for (const path of ["/", "/unknown/operation", "/health?unexpected=1", "/ping?action=unclassified"])
          // A health endpoint with only recognized metadata is itself positively classified;
          // unknown-health controls therefore use an unknown parameter as well.
          cases.push({method, path: path === "/ping?action=unclassified" ? "/ping?unexpected-action=unclassified" : path});
      for (const path of [
        "/?action=unclassified", "/?access-token=generic", "/?timeout=2", "/?send=10",
        "/?query-planning-budget=1", "/?query=SELECT%20*%20WHERE%20%7B%7D&unexpected=x",
        "/?cmd=stats&cmd=unknown", "/?cmd=stats&unexpected=x", "/?%ZZ=bad", "/%zz?unknown=1",
      ]) cases.push({method: "GET", path});
      for (const [body, type] of [
        ['{"cmd":"clear-delta-triples"', "application/json"],
        ["cmd=%ZZ", "application/x-www-form-urlencoded"],
        ["=", "application/x-www-form-urlencoded"],
        ['--x\r\nContent-Disposition: form-data; name="query"\r\n\r\nSELECT * WHERE {}', "multipart/form-data; boundary=x"],
        ["opaque", "text/plain"],
      ]) for (const method of ["GET", "POST", "OPTIONS"]) cases.push({method, path: "/", body, type});
      for (const c of cases) {
        counter.reset(); const before = forwarded.length;
        const status = await request(counter.url, c.method, c.path, c.body, c.type);
        const counts = counter.counts();
        console.log(JSON.stringify({http: c, status, forwarded: forwarded.length - before, counts}));
        expect(forwarded.length - before).toBe(1);
        expect(counts.writes, `${c.method} ${c.path} ${c.type ?? ""}`).toBeGreaterThan(0);
      }
      expect(cases).toHaveLength(61);
    });
  });
  it("preserves positive read, health and session controls with clean tallies", async () => {
    await httpFixture(async (counter, forwarded) => {
      const cases = [
        ["GET", "/health", "", ""], ["HEAD", "/ping", "", ""], ["OPTIONS", "/health", "", ""],
        ["GET", "/?query=SELECT%20*%20WHERE%20%7B%7D&timeout=1", "", ""],
        ["POST", "/", "SELECT * WHERE {}", "application/sparql-query"],
        ["POST", "/", "query=SELECT+*+WHERE+%7B%7D", "application/x-www-form-urlencoded"],
        ["GET", "/?cmd=stats", "", ""], ["GET", "/?cmd=clear-cache", "", ""],
      ];
      for (const [method, path, body, type] of cases) {
        counter.reset(); const before = forwarded.length;
        expect(await request(counter.url, method!, path!, body, type)).toBe(200);
        expect(forwarded.length - before).toBe(1);
        expect(counter.counts()).toMatchObject({connections: 1, writes: 0, commits: 0, unparsed: 0});
      }
    });
  });
  it("refuses malformed HTTP framing before upstream forwarding", async () => {
    await httpFixture(async (counter, forwarded) => {
      for (const raw of [
        "GET / HTTP/1.1\r\nHost: generic\r\nContent-Length: nope\r\n\r\n",
        "POST / HTTP/1.1\r\nHost: generic\r\nContent-Length: 1\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n",
        "GE T / HTTP/1.1\r\nHost: generic\r\n\r\n",
      ]) {
        counter.reset(); const before = forwarded.length;
        const response = await new Promise<string>((resolve, reject) => {
          const client = net.connect(Number(new URL(counter.url).port), "127.0.0.1");
          let text = ""; client.on("data", bytes => text += bytes.toString());
          client.on("close", () => resolve(text)); client.on("error", reject);
          client.on("connect", () => client.end(raw));
        });
        console.log(JSON.stringify({malformedHttp: raw, response, counts: counter.counts()}));
        expect(response).toContain("400 Bad Request");
        expect(forwarded.length).toBe(before);
      }
    });
  });
});

describe("CX-VC8-3 Q81b pgwire exception variations", () => {
  for (const broken of [frame("P", Buffer.from("unterminated")), frame("B", Buffer.from("unterminated")), frame("E", Buffer.from("unterminated")), frame("C", Buffer.from("Sunterminated"))])
    it(`latches malformed ${String.fromCharCode(broken[0]!)} mid-pipeline, with fragmented later traffic and six reset windows`, async () => {
      await pgFixture(async (counter, send) => {
        await send(Buffer.concat([parse("read", "SELECT 1"), bind("rp", "read"), execute("rp"), sync]));
        expect(counter.counts()).toMatchObject({statements: 1, writes: 0, unparsed: 0});
        counter.reset();
        await send(Buffer.concat([frame("Q", Buffer.from("SELECT 2\0")), broken, frame("Q", Buffer.from("DELETE FROM t\0")), sync]));
        expect(counter.counts()).toMatchObject({statements: 1});
        expect(counter.counts().writes).toBeGreaterThan(0);
        expect(counter.counts().unparsed).toBeGreaterThan(0);
        const windows = [
          Buffer.concat([execute("rp"), sync]), sync, Buffer.from([0x51]),
          frame("Q", Buffer.from("DELETE FROM t\0")), Buffer.concat([parse("c", "COMMIT"), bind("pc", "c"), execute("pc"), sync]), Buffer.from([0]),
        ];
        for (const [i, bytes] of windows.entries()) {
          counter.reset();
          // Deliberately split a chunk after a reset as well as sending a complete pipeline.
          await send(bytes.subarray(0, 1));
          if (bytes.length > 1) await send(bytes.subarray(1));
          const counts = counter.counts();
          console.log(JSON.stringify({parserException: String.fromCharCode(broken[0]!), window: i, bytes: bytes.toString("hex"), counts}));
          expect(counts.writes).toBeGreaterThan(0);
          expect(counts.unparsed).toBeGreaterThan(0);
        }
      });
    });
});

describe("CX-VC8-3 X02 merge spot checks", () => {
  it("keeps token-aware quantified refusals and supported SQL including comments", () => {
    for (const operand of ["ANY/**/ARRAY[1]", "SOME--comment\r(ARRAY[1])", "ALL/**/(ARRAY[1])", "ANY/**/($1)"])
      expect(() => readOnlyNativeSql(`SELECT 1 WHERE 1 <> ${operand}`)).toThrow(/non-subquery/);
    for (const sql of ["SELECT ALL 1", "SELECT 1 UNION/**/ALL SELECT 2", "SELECT 1 WHERE 1 = ANY/**/(/**/SELECT 1)"])
      expect(readOnlyNativeSql(sql)).toBe(sql);
  });
  it("refuses all five exact compute operators through the recoverable public Effect channel before answer execution", async () => {
    const calls: string[] = [];
    const client = {
      query: async (sql: string) => { calls.push(sql); return [{value_type: "integer"}]; },
      submit: async () => { throw new Error("unexpected write"); }, close: async () => {},
    } as any;
    const executor = makeXtdbQueryExecutor(client, "generic");
    for (const op of ["+", "-", "*", "/", "%"] as const) {
      calls.length = 0;
      const query = {find: ["?result"], where: [["e", ":i", "?i"]], compute: [[op, "?i", integer("1"), "?result"]]} as const;
      const run = () => executor.execute(query, false, {recordedPosition: 1, validAt: 1});
      const exit = await Effect.runPromiseExit(run());
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.hasDies(exit.cause)).toBe(false);
        expect(String(exit.cause)).toContain("Exact integer computation is not qualified");
      }
      expect(await Effect.runPromise(run().pipe(Effect.catchTag("DatalogValidationError", () => Effect.succeed("handled"))))).toBe("handled");
      expect(calls.some(sql => sql.includes(" AS DECIMAL") || sql.includes(" AS BIGINT"))).toBe(false);
      console.log(JSON.stringify({exactOperator: op, exit: String(exit), calls}));
    }
  });
});
