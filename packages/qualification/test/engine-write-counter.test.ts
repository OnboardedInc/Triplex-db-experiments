/**
 * EXP-C8 wire-level write counters: unit checks against fake upstreams, plus live checks
 * against the shared dev residents (XTDB_INTEGRATION=1, QLEVER_INTEGRATION=1).
 */
import { createHash, randomUUID } from "node:crypto";
import http from "node:http";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { makeQleverClient, QleverHttpError } from "@triplex-build/triplex-qlever";
import { makeXtdbClient } from "@triplex-build/triplex-xtdb";
import {
  classifyXtdbStatement,
  createPgwireFrontendParser,
  startQleverWriteCounter,
  startXtdbWriteCounter,
  type EngineWriteCounter,
} from "../src/engine-write-counter.js";

const until = async (condition: () => boolean, label: string, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};
const cleanups: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
const started = <T extends EngineWriteCounter>(counter: T) => {
  cleanups.push(() => counter.close());
  return counter;
};

describe("classifyXtdbStatement", () => {
  // Real statement shapes from packages/xtdb/src (XtdbClient, XtdbStorageAdapter,
  // native/Reachability, native/Sources, MaintainedQueries).
  const cases: Array<[string, ReturnType<typeof classifyXtdbStatement>]> = [
    ["SELECT 1 AS x", "read"],
    ["  select * from tx_meta", "read"],
    [
      "SETTING SNAPSHOT_TOKEN = 'abc''INSERT', CLOCK_TIME = TIMESTAMP WITH TIME ZONE '2026-11-07T00:00:00Z' SELECT position FROM tx_meta",
      "read",
    ],
    ["SETTING SNAPSHOT_TOKEN = 'x' WITH f AS (SELECT 1 AS a) SELECT a FROM f", "read"],
    ["XTQL ('(-> (from :tx_meta [position]) (limit 1))', $1)", "read"],
    ["XTQL ('(from :t [{:op \"INSERT INTO\"}])')", "read"],
    ["FROM tx_meta SELECT position", "read"],
    ["VALUES (1), (2)", "read"],
    ["SHOW AWAIT_TOKEN", "read"],
    ["EXPLAIN SELECT 1", "read"],
    ["TABLE tx_meta", "read"],
    ["-- INSERT INTO t\nSELECT 1", "read"],
    ["-- comment ending at CR\rSELECT 1", "read"],
    ["/* DELETE FROM t */ SELECT 'UPDATE t SET x = 1' AS \"ERASE\"", "read"],
    ["SELECT E'it\\'s INSERT' AS x", "read"],
    ["SELECT 1;", "read"],
    ["SET AWAIT_TOKEN = 'token-with-INSERT-inside'", "session"],
    ["ROLLBACK", "session"],
    ["BEGIN READ ONLY", "session"],
    ["START TRANSACTION READ ONLY", "session"],
    ["DISCARD ALL", "session"],
    ["DEALLOCATE ALL", "session"],
    ["", "session"],
    ["  -- only a comment", "session"],
    ["COMMIT", "commit"],
    ["COMMIT SYNC", "commit"],
    ["commit", "commit"],
    ["BEGIN READ WRITE", "write"],
    ["BEGIN", "write"],
    ["START TRANSACTION", "write"],
    ["START TRANSACTION READ WRITE", "write"],
    [
      "INSERT INTO tx_native_relation_attempts (_id, _valid_from, scope_key, run_id, attempt_id, phase) VALUES ($1, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z', $2, $3, $4, $5)",
      "write",
    ],
    [
      "INSERT INTO tx_constraint_graphs (_id, _valid_from) SELECT g.id, TIMESTAMP WITH TIME ZONE '1970-01-01T00:00:00Z' FROM (WITH a AS (SELECT 1 AS id) SELECT * FROM a) g",
      "write",
    ],
    ["ERASE FROM tx_native_relations WHERE scope_key = $1 AND run_id = $2", "write"],
    [
      "ASSERT NOT EXISTS (SELECT 1 FROM tx_attempts FOR ALL VALID_TIME WHERE scope_key = ? AND operation_id = ?), 'triplex-operation-duplicate'",
      "write",
    ],
    ["CREATE TABLE tx_meta (_id, scope_key, position)", "write"],
    ["DELETE FROM t WHERE _id = 1", "write"],
    ["UPDATE t SET v = 2 WHERE _id = 1", "write"],
    ["PATCH INTO t RECORDS {_id: 1, v: 2}", "write"],
    ["DROP TABLE t", "write"],
    ["COPY t FROM STDIN", "write"],
    ["EXECUTE p", "write"],
    ["CALL f()", "write"],
    ["ABORT", "write"],
    ["WITH x AS (INSERT INTO t (_id) VALUES (1) RETURNING _id) SELECT * FROM x", "write"],
    ["EXPLAIN ANALYZE DELETE FROM t", "write"],
    ["SETTING DEFAULT VALID_TIME FROM NOW TO NOW CREATE TABLE t (_id)", "write"],
    ["SETTING SNAPSHOT_TOKEN = 'x' INSERT INTO t (_id) VALUES (1)", "write"],
    ["/* /* */ INSERT INTO t (_id) VALUES (1) */", "write"],
    ["SELECT 1; INSERT INTO t (_id) VALUES (1)", "write"],
    ["SELECT 1; COMMIT", "commit"],
  ];
  it.each(cases)("%j -> %s", (sql, expected) => {
    expect(classifyXtdbStatement(sql)).toBe(expected);
  });
});

// ---------------------------------------------------------------- pgwire framing

const int32 = (value: number) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(value);
  return b;
};
const untyped = (code: number, payload = Buffer.alloc(0)) =>
  Buffer.concat([int32(8 + payload.length), int32(code), payload]);
const startupMessage = () => untyped(196608, Buffer.from("user\0xtdb\0database\0xtdb\0\0", "utf8"));
const typed = (type: string, payload: Buffer) =>
  Buffer.concat([Buffer.from(type, "latin1"), int32(payload.length + 4), payload]);
const query = (sql: string) => typed("Q", Buffer.from(`${sql}\0`, "utf8"));
const parse = (sql: string, name = "") =>
  typed(
    "P",
    Buffer.concat([Buffer.from(`${name}\0${sql}\0`, "utf8"), Buffer.from([0, 1, 0, 0, 0, 25])]),
  );
const bindExecuteSync = (statement = "") =>
  Buffer.concat([
    typed(
      "B",
      Buffer.concat([
        Buffer.from(`\0${statement}\0`),
        Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 0x31, 0, 0]),
      ]),
    ),
    typed("E", Buffer.from([0, 0, 0, 0, 0])),
    typed("S", Buffer.alloc(0)),
  ]);

const SESSION_TEXTS = [
  "SET AWAIT_TOKEN = 'tok'",
  "SETTING SNAPSHOT_TOKEN = 'a;b', CLOCK_TIME = TIMESTAMP WITH TIME ZONE '2026-11-07T00:00:00Z' SELECT 'é—✓' AS x",
  "BEGIN READ WRITE",
  "INSERT INTO c8_t (_id, v) VALUES ($1, $2)",
  "COMMIT SYNC",
  "SHOW AWAIT_TOKEN",
];
const frontendStream = () =>
  Buffer.concat([
    untyped(80877103), // SSLRequest; the fake server answers 'N'
    startupMessage(),
    query(SESSION_TEXTS[0]!),
    parse(SESSION_TEXTS[1]!),
    bindExecuteSync(),
    query(SESSION_TEXTS[2]!),
    parse(SESSION_TEXTS[3]!, "named_stmt"),
    bindExecuteSync("named_stmt"),
    query(SESSION_TEXTS[4]!),
    query(SESSION_TEXTS[5]!),
    typed("X", Buffer.alloc(0)),
  ]);

describe("pgwire frontend parser", () => {
  const run = (chunks: readonly Buffer[]) => {
    const texts: string[] = [];
    const opaque: string[] = [];
    const push = createPgwireFrontendParser({
      text: (sql) => texts.push(sql),
      prepared: () => {},
      functionCall: () => texts.push("<F>"),
      opaque: (reason) => opaque.push(reason),
    });
    for (const chunk of chunks) push(chunk);
    return { texts, opaque };
  };
  it("extracts Q and Execute texts whole, byte by byte, and at random chunk boundaries", () => {
    const stream = frontendStream();
    const whole = run([stream]);
    expect(whole).toEqual({ texts: SESSION_TEXTS, opaque: [] });
    const bytes = [...stream].map((byte) => Buffer.from([byte]));
    expect(run(bytes)).toEqual(whole);
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let round = 0; round < 50; round++) {
      const chunks: Buffer[] = [];
      for (let at = 0; at < stream.length; ) {
        const size = 1 + Math.floor(random() * 40);
        chunks.push(stream.subarray(at, at + size));
        at += size;
      }
      expect(run(chunks)).toEqual(whole);
    }
  });
  it("classifies reused portals, closed names and unknown operations", () => {
    const executed: string[] = [],
      prepared: string[] = [],
      opaque: string[] = [];
    const push = createPgwireFrontendParser({
      text: (sql) => executed.push(sql),
      prepared: (sql) => prepared.push(sql),
      functionCall: () => {},
      opaque: (reason) => opaque.push(reason),
    });
    push(
      Buffer.concat([
        startupMessage(),
        parse("COMMIT", "commit_stmt"),
        bindExecuteSync("commit_stmt"),
      ]),
    );
    expect(prepared).toEqual(["COMMIT"]);
    expect(executed).toEqual(["COMMIT"]);
    executed.length = 0; // simulate a tally reset; parser state remains intact
    push(typed("E", Buffer.alloc(5)));
    expect(executed).toEqual(["COMMIT"]);
    push(typed("C", Buffer.from("P\0")));
    push(typed("E", Buffer.alloc(5)));
    push(bindExecuteSync("missing"));
    push(typed("d", Buffer.from("opaque copy bytes")));
    expect(opaque).toHaveLength(4);
  });
  it("reports a TLS stream or a bad message type as opaque instead of skipping it", () => {
    const clientHello = Buffer.from([0x16, 0x03, 0x01, 0x02, 0x00, 0x01, 0x00, 0x01, 0xfc]);
    expect(run([untyped(80877103), clientHello]).opaque).toHaveLength(1);
    expect(run([clientHello]).opaque).toHaveLength(1);
    expect(run([startupMessage(), typed("Z", Buffer.alloc(0))]).opaque).toHaveLength(1);
  });
  it("stops after a CancelRequest and reports FunctionCall", () => {
    expect(run([untyped(80877102, Buffer.alloc(8))])).toEqual({ texts: [], opaque: [] });
    expect(run([startupMessage(), typed("F", Buffer.alloc(10))]).texts).toEqual(["<F>"]);
  });
});

/** A fake pgwire server: answers 'N' to SSLRequest, then streams `reply` once and records input. */
const fakePgServer = async (reply: Buffer) => {
  const received: Buffer[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    let answered = false;
    socket.on("data", (chunk) => {
      received.push(chunk);
      if (!answered && Buffer.concat(received).length >= 8) {
        answered = true;
        socket.write(Buffer.concat([Buffer.from("N"), reply]));
      }
    });
    socket.on("end", () => socket.end());
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(
    () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(resolve);
      }),
  );
  return {
    port: (server.address() as net.AddressInfo).port,
    received: () => Buffer.concat(received),
  };
};

describe("XTDB write counter proxy", () => {
  it("forwards bytes unchanged both ways and counts the statements", async () => {
    const reply = Buffer.from(Array.from({ length: 70_000 }, (_, k) => (k * 31) % 256));
    const upstream = await fakePgServer(reply);
    const counter = started(
      await startXtdbWriteCounter(
        `postgres://u:p@127.0.0.1:${upstream.port}/db?application_name=c8`,
      ),
    );
    expect(counter.url).toMatch(/^postgres:\/\/u:p@127\.0\.0\.1:\d+\/db\?application_name=c8$/);
    const port = Number(new URL(counter.url).port);
    expect(port).not.toBe(upstream.port);
    const stream = frontendStream();
    const client = net.connect({ host: "127.0.0.1", port });
    client.setNoDelay(true);
    const back: Buffer[] = [];
    client.on("data", (chunk) => back.push(chunk));
    await new Promise<void>((resolve) => client.once("connect", () => resolve()));
    // Separate writes with pauses so the proxy sees several chunk boundaries.
    for (let at = 0; at < stream.length; at += 13) {
      client.write(stream.subarray(at, at + 13));
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    await until(() => upstream.received().length === stream.length, "upstream input");
    await until(() => Buffer.concat(back).length === reply.length + 1, "client output");
    expect(upstream.received().equals(stream)).toBe(true);
    expect(Buffer.concat(back).equals(Buffer.concat([Buffer.from("N"), reply]))).toBe(true);
    client.end();
    expect(counter.counts()).toEqual({
      lane: "xtdb",
      connections: 1,
      statements: 6,
      writes: 4, // BEGIN, conservatively flagged Parse, INSERT execution, COMMIT
      commits: 1,
      commands: 1, // SET AWAIT_TOKEN
      unparsed: 0,
      samples: [
        "BEGIN READ WRITE",
        "<prepared potential write> INSERT INTO c8_t (_id, v) VALUES ($1, $2)",
        "INSERT INTO c8_t (_id, v) VALUES ($1, $2)",
        "COMMIT SYNC",
      ],
    });
    counter.reset();
    expect(counter.counts()).toMatchObject({
      connections: 0,
      statements: 0,
      writes: 0,
      samples: [],
    });
  });
  it("counts every forwarded chunk after a parser exception across tally resets", async () => {
    // [EXP-C8-R3] Why: exercise the proxy exception latch, not the parser's stopped branch.
    // Rejected: only testing malformed lengths (those never throw from cstring).
    const upstream = await fakePgServer(Buffer.alloc(0));
    const counter = started(
      await startXtdbWriteCounter(`postgres://generic@127.0.0.1:${upstream.port}/db`),
    );
    const client = net.connect({ host: "127.0.0.1", port: Number(new URL(counter.url).port) });
    cleanups.push(async () => {
      client.destroy();
    });
    client.resume();
    let sent = 0;
    const send = async (bytes: Buffer) => {
      sent += bytes.length;
      client.write(bytes);
      await until(() => upstream.received().length === sent, "forwarded bytes");
    };
    await send(startupMessage());
    await send(typed("P", Buffer.from("unterminated")));
    expect(counter.counts()).toMatchObject({ writes: 1, unparsed: 1 });
    for (const bytes of [query("DELETE FROM t"), typed("S", Buffer.alloc(0)), Buffer.from([1])]) {
      counter.reset();
      await send(bytes);
      expect(counter.counts()).toMatchObject({ writes: 1, unparsed: 1 });
    }
  });
  it("counts an unparseable stream as a write and close() ends open connections", async () => {
    const upstream = await fakePgServer(Buffer.alloc(0));
    const counter = await startXtdbWriteCounter(`postgres://u:p@127.0.0.1:${upstream.port}/db`);
    const client = net.connect({ host: "127.0.0.1", port: Number(new URL(counter.url).port) });
    const closed = new Promise<void>((resolve) => client.once("close", () => resolve()));
    client.on("error", () => {});
    client.resume(); // a paused socket never emits 'close'
    client.write(Buffer.from([0x16, 0x03, 0x01, 0x02, 0x00, 0x01, 0x00, 0x01, 0xfc]));
    await until(() => counter.counts().unparsed === 1, "opaque stream");
    expect(counter.counts()).toMatchObject({ writes: 1, unparsed: 1, statements: 0 });
    await counter.close();
    await closed;
  });
});

// ---------------------------------------------------------------- QLever HTTP

interface Seen {
  readonly method: string;
  readonly url: string;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: string;
}
const SELECT_RESULT = JSON.stringify({
  head: { vars: ["x"] },
  results: { bindings: [{ x: { type: "literal", value: "1" } }] },
});
const fakeQlever = async () => {
  const seen: Seen[] = [];
  const closedEarly: string[] = [];
  const upgrades: string[] = [];
  const frames: Buffer[] = [];
  const tunnels = new Set<net.Socket>();
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      seen.push({
        method: req.method!,
        url: req.url!,
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      });
      if (req.url!.startsWith("/slow")) {
        res.on("close", () => closedEarly.push(req.url!));
        return; // never answers
      }
      if (req.url!.startsWith("/error"))
        return res
          .writeHead(400, { "Content-Type": "application/json", "X-Upstream": "err" })
          .end(JSON.stringify({ exception: "parse error" }));
      res.writeHead(200, { "Content-Type": "application/json", "X-Upstream": "yes" });
      // Two writes so the response is chunked upstream.
      res.write(SELECT_RESULT.slice(0, 20));
      res.end(SELECT_RESULT.slice(20));
    });
  });
  // Minimal WebSocket handshake (RFC 6455 section 4.2.2) for QleverClient.cancel.
  server.on("upgrade", (req, socket: net.Socket) => {
    upgrades.push(req.url!);
    const accept = createHash("sha1")
      .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    // Upgraded sockets leave the server's HTTP tracking, so the cleanup destroys them itself.
    tunnels.add(socket);
    socket.on("data", (frame: Buffer) => frames.push(frame));
    socket.on("error", () => {});
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(
    () =>
      new Promise((resolve) => {
        for (const socket of tunnels) socket.destroy();
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return {
    url: `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`,
    seen,
    closedEarly,
    upgrades,
    frames,
  };
};

describe("QLever write counter proxy", () => {
  it("counts QleverClient queries as reads and updates as writes, passing replies through", async () => {
    const upstream = await fakeQlever();
    const counter = started(await startQleverWriteCounter(upstream.url));
    expect(counter.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    const client = makeQleverClient(counter.url, { accessToken: "secret-token" });
    const rows = await client.query("SELECT ?x WHERE { ?x ?p ?o }", { queryId: "c8-q1" });
    expect(rows).toEqual([{ x: { type: "literal", value: "1" } }]);
    expect(await client.command("stats")).toEqual(JSON.parse(SELECT_RESULT));
    expect(counter.counts()).toMatchObject({
      connections: 2,
      statements: 1,
      writes: 0,
      commits: 0,
      commands: 1,
    });
    // The engine saw exactly what QleverClient sent.
    const q = upstream.seen[0]!;
    expect(q.method).toBe("POST");
    expect(q.headers["content-type"]).toBe("application/sparql-query");
    expect(q.headers["authorization"]).toBe("Bearer secret-token");
    expect(q.headers["query-id"]).toBe("c8-q1");
    expect(q.headers["host"]).toBe(new URL(upstream.url).host);
    expect(q.body).toBe("SELECT ?x WHERE { ?x ?p ?o }");
    expect(upstream.seen[1]!.url).toMatch(/^\/\?cmd=stats&timeout=/);
    const update = 'INSERT DATA { GRAPH <urn:c8:g> { <urn:c8:s> <urn:c8:p> "1" } }';
    await client.update(update);
    expect(upstream.seen[2]!.headers["content-type"]).toBe("application/sparql-update");
    expect(counter.counts()).toMatchObject({
      statements: 2,
      writes: 1,
      commits: 1,
      samples: [update],
    });
    await client.cancel("c8-q1");
    await until(() => upstream.upgrades.length === 1, "websocket upgrade");
    expect(upstream.upgrades).toEqual(["/watch/c8-q1"]);
    // The client's masked "cancel" text frame (FIN + opcode 1, 6-byte payload) came through.
    await until(() => upstream.frames.length > 0, "websocket frame");
    expect([...Buffer.concat(upstream.frames).subarray(0, 2)]).toEqual([0x81, 0x80 | 6]);
    expect(counter.counts()).toMatchObject({ writes: 1, commands: 2 });
  });
  it("classifies the other SPARQL protocol forms and passes errors through", async () => {
    const upstream = await fakeQlever();
    const counter = started(await startQleverWriteCounter(upstream.url));
    const form = (body: string, path = "/") =>
      fetch(new URL(path, counter.url), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    const get = await fetch(`${counter.url}/?query=${encodeURIComponent("ASK {}")}`);
    expect(get.status).toBe(200);
    expect(get.headers.get("x-upstream")).toBe("yes");
    expect(await get.text()).toBe(SELECT_RESULT);
    await (await form(`query=${encodeURIComponent("SELECT * {}")}`)).text();
    await (await fetch(`${counter.url}/?cmd=get-settings`)).text();
    await (await fetch(`${counter.url}/?cmd=clear-cache`)).text();
    expect(counter.counts()).toMatchObject({ statements: 2, writes: 0, commands: 2 });
    await (await form(`update=${encodeURIComponent("CLEAR ALL")}`)).text();
    await (await form("cmd=clear-delta-triples")).text();
    await (
      await fetch(`${counter.url}/?graph=urn:g`, {
        method: "PUT",
        headers: { "Content-Type": "text/turtle" },
        body: "<a> <b> <c> .",
      })
    ).text();
    await (await fetch(`${counter.url}/?cmd=rebuild-index`)).text();
    expect(counter.counts()).toMatchObject({
      statements: 3,
      writes: 4,
      commits: 4,
      samples: ["CLEAR ALL", "cmd=clear-delta-triples", "<PUT / text/turtle>", "cmd=rebuild-index"],
    });
    const failed = await fetch(`${counter.url}/error`, {
      method: "POST",
      headers: { "Content-Type": "application/sparql-query" },
      body: "SELEC",
    });
    expect(failed.status).toBe(400);
    expect(failed.headers.get("x-upstream")).toBe("err");
    expect(await failed.json()).toEqual({ exception: "parse error" });
    await expect(makeQleverClient(`${counter.url}/error`).query("SELEC")).rejects.toBeInstanceOf(
      QleverHttpError,
    );
  });
  it("requires a positively classified HTTP operation in every tally window", async () => {
    // [EXP-C8-R3] Why: metadata and arbitrary settings cannot establish read-only traffic.
    // Rejected: forwarding nonempty parameter sets with clean tallies.
    const upstream = await fakeQlever();
    const counter = started(await startQleverWriteCounter(upstream.url));
    for (const path of [
      "/?unexpected-operation=change-data",
      "/?action=unclassified",
      "/?access-token=generic",
      "/?query-planning-budget=1",
      "/?query=ASK%7B%7D&unexpected-operation=x",
    ]) {
      counter.reset();
      await (await fetch(counter.url + path)).text();
      expect(upstream.seen.at(-1)?.url).toBe(path);
      expect(counter.counts()).toMatchObject({ writes: 1, commits: 1 });
    }
    for (const path of [
      "/health",
      "/ping?msg=generic",
      "/?query=ASK%7B%7D&access-token=generic",
      "/?cmd=stats",
      "/?cmd=clear-cache",
    ]) {
      counter.reset();
      await (await fetch(counter.url + path)).text();
      expect(counter.counts()).toMatchObject({ writes: 0, commits: 0, unparsed: 0 });
    }
  });
  it("keeps the target path prefix and aborts upstream when the client aborts", async () => {
    const upstream = await fakeQlever();
    const counter = started(await startQleverWriteCounter(`${upstream.url}/slow`));
    expect(counter.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/slow$/);
    await expect(
      makeQleverClient(counter.url).query("SELECT * {}", { timeoutMs: 200 }),
    ).rejects.toThrow();
    await until(() => upstream.closedEarly.length === 1, "upstream abort");
    expect(upstream.seen[0]!.url).toMatch(/^\/slow\?timeout=200ms$/);
    expect(counter.counts()).toMatchObject({ statements: 1, writes: 0 });
  });
});

// ---------------------------------------------------------------- live engines

const XTDB_URL = process.env["XTDB_URL"] ?? "postgres://xtdb:xtdb@127.0.0.1:5470/xtdb";
describe.skipIf(process.env["XTDB_INTEGRATION"] !== "1")("XTDB write counter (live)", () => {
  it("reads count zero writes; one submit counts one commit", async () => {
    const counter = started(await startXtdbWriteCounter(XTDB_URL));
    const client = makeXtdbClient(counter.url, { maxConnections: 2 });
    const direct = makeXtdbClient(XTDB_URL, { maxConnections: 1 });
    cleanups.push(
      () => direct.close(),
      () => client.close(),
    );
    for (let k = 0; k < 3; k++) {
      const rows = await client.query("SELECT 1 AS x");
      expect(rows.map((row) => Number(row["x"]))).toEqual([1]);
    }
    expect(counter.counts()).toMatchObject({ writes: 0, commits: 0, unparsed: 0 });
    expect(counter.counts().statements).toBeGreaterThanOrEqual(3);
    expect(counter.counts().connections).toBeGreaterThanOrEqual(1);
    counter.reset();
    const id = randomUUID();
    try {
      // [EXP-C8] positive control: the counter must see a real write, or zero proves nothing.
      await client.submit([
        { sql: "INSERT INTO c8_write_counter_probe (_id, v) VALUES (?, ?)", params: [id, 1] },
      ]);
      const counts = counter.counts();
      expect(counts.commits).toBe(1);
      expect(counts.writes).toBeGreaterThanOrEqual(2);
      expect(counts.samples).toEqual(expect.arrayContaining(["BEGIN READ WRITE", "COMMIT SYNC"]));
      // A later read carries SET AWAIT_TOKEN (session) and still writes nothing.
      counter.reset();
      await client.query("SELECT v FROM c8_write_counter_probe WHERE _id = ?", [id]);
      expect(counter.counts()).toMatchObject({ writes: 0, commits: 0, unparsed: 0 });
      expect(counter.counts().commands).toBeGreaterThanOrEqual(1);
    } finally {
      await direct.submit([
        { sql: "ERASE FROM c8_write_counter_probe WHERE _id = ?", params: [id] },
      ]);
    }
  });
});

const QLEVER_URL = process.env["QLEVER_URL"] ?? "http://127.0.0.1:7070";
const qleverReachable =
  process.env["QLEVER_INTEGRATION"] === "1" &&
  (await fetch(new URL("/ping", QLEVER_URL), { signal: AbortSignal.timeout(1500) }).then(
    () => true,
    () => false,
  ));
describe.skipIf(!qleverReachable)("QLever write counter (live)", () => {
  const graph = "urn:triplex:c8-write-counter-probe";
  const triple = `GRAPH <${graph}> { <urn:c8:s> <urn:c8:p> "1" }`;
  const token = process.env["QLEVER_ACCESS_TOKEN"];
  it("queries count zero writes; one update counts one write", async () => {
    const counter = started(await startQleverWriteCounter(QLEVER_URL));
    const client = makeQleverClient(counter.url, token ? { accessToken: token } : {});
    const direct = makeQleverClient(QLEVER_URL, token ? { accessToken: token } : {});
    await client.query("SELECT ?s WHERE { ?s ?p ?o } LIMIT 1");
    await client.query(`SELECT ?o WHERE { GRAPH <${graph}> { ?s ?p ?o } }`);
    expect(counter.counts()).toMatchObject({ statements: 2, writes: 0, commits: 0 });
    counter.reset();
    try {
      await client.update(`INSERT DATA { ${triple} }`);
      expect(counter.counts()).toMatchObject({ statements: 1, writes: 1, commits: 1 });
    } finally {
      await direct.update(`DELETE DATA { ${triple} }`);
    }
  });
});
