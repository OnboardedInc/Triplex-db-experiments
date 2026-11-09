import http from "node:http";
import net from "node:net";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import {
  frontierClosure,
  ruleClosure,
  memoryEdges,
  countSimplePaths,
  reachFrom,
  RecursionBudgetExceeded,
  type FrontierEdge,
} from "../../../packages/core/src/native/FrontierClosure.ts";
import {
  startQleverWriteCounter,
  startXtdbWriteCounter,
} from "../../../packages/qualification/src/engine-write-counter.ts";
import { makeXtdbStorageAdapter } from "../../../packages/xtdb/src/XtdbStorageAdapter.ts";
import { evaluateXtdbNativeWorkload } from "../../../packages/qualification/src/native/xtdb-workloads.ts";
import { evaluateQleverNativeWorkload } from "../../../packages/qualification/src/native/qlever-workloads.ts";

// [CX-VC8-2] Why: vary the prior failing inputs and check both sides of each boundary. Rejected: only rerunning builder fixtures (misses adjacent inputs).
const refuses = async (run: () => unknown, kind: string) => {
  let error: any;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(RecursionBudgetExceeded);
  expect(error.kind).toBe(kind);
  expect(error).not.toHaveProperty("pairs");
  expect(error).not.toHaveProperty("reached");
};

describe("CX-VC8-2 delta budgets and counting", () => {
  it("F1: three-node terminal cycle refuses at two rounds and succeeds at three; empty confirmation stays legal", async () => {
    const edges = memoryEdges([
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ]);
    await refuses(
      () => frontierClosure({ seeds: ["a"], edges, budgets: { maxRounds: 2 } }),
      "rounds",
    );
    const result = await frontierClosure({ seeds: ["a"], edges, budgets: { maxRounds: 3 } });
    expect(reachFrom(result, "a")).toEqual(["a", "b", "c"]);
    const chain = await frontierClosure({
      seeds: ["a"],
      edges: memoryEdges([
        ["a", "b"],
        ["b", "c"],
      ]),
      budgets: { maxRounds: 2 },
    });
    expect(chain.rounds.at(-1)?.newNodes).toBe(0);
    expect(chain.complete).toBe(true);
  });

  it("F2: rule cycle enforces round and distinct-endpoint budgets including duplicate base rows", async () => {
    const input = {
      base: [
        ["c", "z"],
        ["c", "z"],
      ] as FrontierEdge[],
      steps: [
        {
          tail: "free" as const,
          predecessors: memoryEdges([
            ["c", "b"],
            ["b", "a"],
            ["a", "c"],
          ]),
        },
      ],
      maxDepth: 10,
      maxPairs: 20,
    };
    await refuses(
      () => ruleClosure({ ...input, budgets: { maxRounds: 1, maxVisited: 4 } }),
      "rounds",
    );
    await refuses(
      () => ruleClosure({ ...input, budgets: { maxRounds: 2, maxVisited: 3 } }),
      "visited",
    );
    const result = await ruleClosure({ ...input, budgets: { maxRounds: 2, maxVisited: 4 } });
    expect(result.pairs).toEqual([
      ["a", "z"],
      ["b", "z"],
      ["c", "z"],
    ]);
    expect(
      (await ruleClosure({ ...input, maxDepth: 1, budgets: { maxRounds: 1, maxVisited: 3 } }))
        .pairs,
    ).toHaveLength(2);
    await refuses(
      () =>
        ruleClosure({ base: [["a", "b"]], maxDepth: 1, maxPairs: 2, budgets: { maxVisited: 1 } }),
      "visited",
    );
  });

  it("F3: 24000-edge DAG and deep cyclic graph count exactly without recursive stack use; pathSteps edge is typed", async () => {
    const n = 24_000;
    const edges: FrontierEdge[] = Array.from({ length: n }, (_, i) => [String(i), String(i + 1)]);
    const seeds = Array.from({ length: n + 1 }, (_, i) => String(i));
    const dag = await frontierClosure({ seeds, edges: memoryEdges(edges) });
    expect(countSimplePaths(dag, "0", String(n), n)).toBe(1n);
    await refuses(() => countSimplePaths(dag, "0", String(n), n - 1), "pathSteps");
    const cycle = await frontierClosure({
      seeds,
      edges: memoryEdges([...edges, [String(n - 1), "1"]]),
    });
    expect(countSimplePaths(cycle, "0", String(n), n + 1)).toBe(1n);
    await refuses(() => countSimplePaths(cycle, "0", String(n), n), "pathSteps");
    expect(countSimplePaths(cycle, "0", "0", n + 1)).toBe(0n);
  });
});

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

describe("CX-VC8-2 delta fail-closed accounting", () => {
  it("F4: unknown request forms must count or refuse, while health and query controls stay clean", async () => {
    const forwarded: string[] = [];
    const upstream = http.createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        forwarded.push(`${req.method} ${req.url}`);
        res.end("{}");
      });
    });
    await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
    const counter = await startQleverWriteCounter(
      `http://127.0.0.1:${(upstream.address() as net.AddressInfo).port}`,
    );
    try {
      for (const url of ["/health", "/?query=SELECT%20*%20WHERE%20%7B%7D"]) {
        counter.reset();
        await (await fetch(counter.url + url)).text();
        expect(counter.counts().writes).toBe(0);
      }
      const cases = [
        {
          path: "/",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '{"cmd":"clear-delta-triples"}',
        },
        {
          path: "/",
          method: "POST",
          headers: { "Content-Type": "multipart/form-data; boundary=y" },
          body: '--y\r\nContent-Disposition: form-data; name="query"\r\n\r\nSELECT * WHERE {}\r\n--y--\r\n',
        },
        { path: "/?unexpected-operation=change-data", method: "GET" },
        { path: "/?action=unclassified", method: "GET" },
        { path: "/?access-token=generic", method: "GET" },
      ];
      for (const { path, ...init } of cases) {
        counter.reset();
        const before = forwarded.length;
        const response = await fetch(counter.url + path, init);
        await response.text();
        const counts = counter.counts();
        console.log(
          JSON.stringify({
            shape: init.method + " " + path,
            counts,
            forwarded: forwarded.length > before,
          }),
        );
        expect.soft(!response.ok || counts.writes > 0, init.method + " " + path).toBe(true);
      }
    } finally {
      await counter.close();
      await new Promise<void>((r) => upstream.close(() => r()));
    }
  });

  it("F5: prepared reads, writes, commits, rebindings and Close remain classified across six resets", async () => {
    await pgFixture(async (counter, send) => {
      await send(
        Buffer.concat([
          parse("w", "DELETE FROM t"),
          parse("r", "SELECT 1"),
          parse("c", "COMMIT"),
          bind("pw", "w"),
          bind("pr", "r"),
          bind("pc", "c"),
          sync,
        ]),
      );
      for (let i = 0; i < 3; i++) {
        counter.reset();
        await send(Buffer.concat([execute("pw"), execute("pc"), sync]));
        expect(counter.counts()).toMatchObject({
          statements: 2,
          writes: 2,
          commits: 1,
          unparsed: 0,
        });
        counter.reset();
        await send(Buffer.concat([execute("pr"), sync]));
        expect(counter.counts()).toMatchObject({
          statements: 1,
          writes: 0,
          commits: 0,
          unparsed: 0,
        });
      }
      counter.reset();
      await send(Buffer.concat([frame("C", Buffer.from("Sw\0")), execute("pw"), sync]));
      expect(counter.counts()).toMatchObject({ statements: 1, writes: 1 });
      counter.reset();
      await send(Buffer.concat([frame("C", Buffer.from("Ppw\0")), execute("pw"), sync]));
      expect(counter.counts().unparsed).toBeGreaterThan(0);
      counter.reset();
      await send(Buffer.concat([bind("pr", "c"), execute("pr"), sync]));
      expect(counter.counts()).toMatchObject({ statements: 1, writes: 1, commits: 1 });
    });
  });

  it("F5 variation: bytes forwarded after a parser exception cannot become zero-write traffic after reset", async () => {
    await pgFixture(async (counter, send) => {
      await send(frame("P", Buffer.from("unterminated")));
      expect(counter.counts().unparsed).toBeGreaterThan(0);
      for (let i = 0; i < 3; i++) {
        counter.reset();
        await send(Buffer.concat([frame("Q", Buffer.from("DELETE FROM t\0")), sync]));
        console.log(JSON.stringify({ afterExceptionWindow: i, counts: counter.counts() }));
        expect.soft(counter.counts().writes).toBeGreaterThan(0);
      }
    });
  });
});

describe("CX-VC8-2 Q76 follow-ups", () => {
  it("Q76b: initialization never submits tx_query_relations schema", async () => {
    const submitted: unknown[] = [];
    const adapter = makeXtdbStorageAdapter(
      {
        query: async () => [],
        submit: async (ops: unknown) => {
          submitted.push(ops);
        },
        close: async () => {},
      } as any,
      "test",
    );
    await Effect.runPromise(adapter.initialize());
    expect(submitted.length).toBeGreaterThan(0);
    expect(JSON.stringify(submitted)).not.toContain("tx_query_relations");
  });

  for (const lane of ["xtql", "xtdb-sql", "qlever"] as const) {
    it(`Q76d: ${lane} workload counts three long cyclic supports at the requested cut`, async () => {
      const edges = [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "e"],
        ["e", "f"],
        ["a", "f"],
        ["b", "d"],
        ["d", "b"],
        ["a", "b"],
      ];
      const calls: any[] = [];
      const select = (_contract: any, input: any, build: any, options: any) => {
        const ctx = {
          facts: () => (lane === "xtdb-sql" ? "(SELECT * FROM facts)" : "(-> facts)"),
          attribute: () => "'support'",
          fact: () => "?assertion <urn:edge> ?target .",
        };
        calls.push({ text: build(ctx, input), options });
        return Effect.succeed({
          rows: edges.map(([source, target]) => ({ source, target })),
          basis: { recordedPosition: 7 },
          trace: {},
        });
      };
      const session = { select, selectSql: select } as any;
      const entry = {
        id: "delta-long-cycle",
        operation: "reachability_supports",
        cut: { known_at: "7", valid_at: "0" },
        parameters: { from: { value: "a" }, to: { value: "f" } },
      };
      const result = await Effect.runPromise(
        lane === "qlever"
          ? evaluateQleverNativeWorkload(session, { id: "20" }, entry, new Map(), [])
          : evaluateXtdbNativeWorkload(session, { id: "20" }, entry, new Map(), [], lane),
      );
      expect(result).toEqual([[true, { type: "integer", value: "3" }]]);
      expect(calls).toHaveLength(1);
      expect(calls[0].options).toMatchObject({
        basis: { recordedAt: 1007, validAt: 1000000 },
        maxRows: 100_000,
      });
      console.log(JSON.stringify({ lane, calls }));
    });
  }
});
