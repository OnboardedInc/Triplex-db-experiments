import http from "node:http";
import net from "node:net";
import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import {
  frontierClosure,
  reachFrom,
  closurePairs,
  ruleClosure,
  countSimplePaths,
  memoryEdges,
  RecursionBudgetExceeded,
  type FrontierEdge,
  type RuleTail,
} from "../../../packages/core/src/native/FrontierClosure.ts";
import {
  classifyXtdbStatement,
  startQleverWriteCounter,
  startXtdbWriteCounter,
} from "../../../packages/qualification/src/engine-write-counter.ts";
import { readOnlyXtdbClient, readPathBase } from "../../../packages/xtdb/src/ReadOnlyClient.ts";
import { readOnlyQleverClient } from "../../../packages/qlever/src/ReadOnlyClient.ts";
import { makeXtdbQueryExecutor } from "../../../packages/xtdb/src/XtdbQueryExecutor.ts";
import { evaluateRules } from "../../../packages/xtdb/src/query/recursion.ts";
import { evaluateQleverRules } from "../../../packages/qlever/src/recursion.ts";
import { CurrentTransactions } from "../../../packages/xtdb/src/TransactionContext.ts";
import { makeXtdbStorageAdapter } from "../../../packages/xtdb/src/XtdbStorageAdapter.ts";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.ts";

// [CX-VC8] Why: independent matrix composition and path enumeration, derived from event_oracles.py's definitions. Rejected: reusing the production traversal as oracle.
const nodesOf = (edges: readonly FrontierEdge[]) => [...new Set(edges.flatMap((e) => [...e]))];
const oracleReach = (
  edges: readonly FrontierEdge[],
  origin: string,
  hops = nodesOf(edges).length + 1,
) => {
  const nodes = [...new Set([origin, ...nodesOf(edges)])];
  let power = new Set([origin]);
  const result = new Set<string>();
  for (let k = 0; k < hops; k++) {
    power = new Set(edges.filter(([a]) => power.has(a)).map(([, b]) => b));
    for (const x of nodes) if (power.has(x)) result.add(x);
  }
  return [...result].sort();
};
const oraclePaths = (edges: readonly FrontierEdge[], from: string, to: string) => {
  const unique = [...new Map(edges.map((e) => [JSON.stringify(e), e])).values()];
  let count = 0n;
  const todo = [[from]];
  while (todo.length) {
    const path = todo.pop()!;
    for (const [a, b] of unique)
      if (a === path.at(-1) && !path.includes(b)) {
        if (b === to) count++;
        else todo.push([...path, b]);
      }
  }
  return count;
};
const oracleRule = (
  base: readonly FrontierEdge[],
  edges: readonly FrontierEdge[],
  depth: number,
  tail: RuleTail,
) => {
  const relation = new Map(base.map((e) => [JSON.stringify(e), e]));
  for (let k = 0; k < depth; k++) {
    const before = [...relation.values()];
    for (const [h, n] of edges)
      for (const [a, t] of before)
        if (n === a && (tail !== "head" || h === t) && (tail !== "next" || n === t))
          relation.set(JSON.stringify([h, t]), [h, t]);
  }
  return [...relation.keys()].sort();
};
const encoded = (pairs: readonly FrontierEdge[]) => pairs.map((e) => JSON.stringify(e)).sort();
const refusal = async (run: () => unknown, kind: string) => {
  let error: any;
  try {
    await run();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(RecursionBudgetExceeded);
  expect(error._tag).toBe("RecursionBudgetExceeded");
  expect(error.kind).toBe(kind);
  expect(Object.keys(error)).not.toContain("pairs");
  expect(Object.keys(error)).not.toContain("reached");
};

describe("CX-VC8 independent semantics", () => {
  it("exhausts every directed 3-node graph including loops, cycles, diamonds, disconnected seeds", async () => {
    let comparisons = 0;
    for (let mask = 0; mask < 512; mask++) {
      const edges: FrontierEdge[] = [];
      for (let k = 0; k < 9; k++)
        if (mask & (1 << k)) edges.push([String(Math.floor(k / 3)), String(k % 3)]);
      const closure = await frontierClosure({
        seeds: ["0", "1", "2", "absent"],
        edges: memoryEdges(edges),
      });
      const pairs: FrontierEdge[] = [];
      for (const origin of closure.seeds) {
        const expected = oracleReach(edges, origin);
        expect(reachFrom(closure, origin)).toEqual(expected);
        for (const t of expected) pairs.push([origin, t]);
        for (const target of closure.seeds)
          expect(countSimplePaths(closure, origin, target)).toBe(
            oraclePaths(edges, origin, target),
          );
        comparisons++;
      }
      expect(encoded(closurePairs(closure, 100))).toEqual(encoded(pairs));
      for (const maxDepth of [1, 2, 3]) {
        const bounded = await frontierClosure({
          seeds: ["0"],
          edges: memoryEdges(edges),
          maxDepth,
        });
        expect(reachFrom(bounded, "0")).toEqual(oracleReach(edges, "0", maxDepth));
      }
      for (const tail of ["free", "head", "next"] as const) {
        const base: FrontierEdge[] = [
          ["0", "2"],
          ["1", "1"],
        ];
        for (const depth of [1, 2, 4]) {
          const result = await ruleClosure({
            base,
            steps: [{ predecessors: memoryEdges(edges.map(([h, n]) => [n, h])), tail }],
            maxDepth: depth,
            maxPairs: 100,
          });
          expect(encoded(result.pairs)).toEqual(oracleRule(base, edges, depth, tail));
        }
      }
    }
    console.log(
      JSON.stringify({
        graphCount: 512,
        originComparisons: comparisons,
        ruleComparisons: 512 * 9,
        pathComparisons: 512 * 16,
      }),
    );
  });

  it("high fanout, duplicates and exact limits / one past visited, edges, roundRows, pairs, rounds", async () => {
    const edges: FrontierEdge[] = Array.from({ length: 80 }, (_, i) => ["root", String(i)]);
    const exact = await frontierClosure({
      seeds: ["root"],
      edges: memoryEdges(edges),
      budgets: { maxVisited: 80, maxEdges: 80, maxRoundRows: 80, maxBatch: 1, maxRounds: 1 },
    });
    expect(closurePairs(exact, 80)).toHaveLength(80);
    expect(exact.rounds[0]?.calls).toBe(1);
    for (const [budget, kind] of [
      ["maxVisited", "visited"],
      ["maxEdges", "edges"],
      ["maxRoundRows", "roundRows"],
    ] as const)
      await refusal(
        () =>
          frontierClosure({
            seeds: ["root"],
            edges: memoryEdges(edges),
            budgets: { [budget]: 79 },
          }),
        kind,
      );
    await refusal(() => closurePairs(exact, 79), "pairs");
    await refusal(
      () =>
        frontierClosure({
          seeds: ["a"],
          edges: memoryEdges([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
          ]),
          budgets: { maxRounds: 1 },
        }),
      "rounds",
    );
    expect(
      (
        await frontierClosure({
          seeds: ["a"],
          edges: memoryEdges([
            ["a", "b"],
            ["a", "b"],
          ]),
          budgets: { maxEdges: 1, maxVisited: 1, maxRoundRows: 2 },
        })
      ).edgeCount,
    ).toBe(1);
    expect(countSimplePaths(exact, "root", "0")).toBe(1n);
    await refusal(() => memoryEdges(edges, 79), "roundRows");
    expect(memoryEdges(edges, 80).sources).toEqual(["root"]);
    const cyclic = await frontierClosure({
      seeds: ["a"],
      edges: memoryEdges([
        ["a", "a"],
        ["a", "b"],
      ]),
    });
    expect(countSimplePaths(cyclic, "a", "b", 2)).toBe(1n);
    await refusal(() => countSimplePaths(cyclic, "a", "b", 1), "pathSteps");
    await refusal(
      () =>
        ruleClosure({
          base: [
            ["a", "b"],
            ["b", "c"],
          ],
          maxDepth: 1,
          maxPairs: 1,
        }),
      "pairs",
    );
    await refusal(
      () =>
        ruleClosure({
          base: [["b", "z"]],
          steps: [
            {
              tail: "free",
              predecessors: memoryEdges([
                ["b", "a"],
                ["b", "c"],
              ]),
            },
          ],
          maxDepth: 1,
          maxPairs: 20,
          budgets: { maxEdges: 1 },
        }),
      "edges",
    );
    await refusal(
      () =>
        ruleClosure({
          base: [["b", "z"]],
          steps: [
            {
              tail: "free",
              predecessors: memoryEdges([
                ["b", "a"],
                ["b", "c"],
              ]),
            },
          ],
          maxDepth: 1,
          maxPairs: 20,
          budgets: { maxRoundRows: 1 },
        }),
      "roundRows",
    );
  });

  it("BUG: refuses a cycle that adds a reached seed beyond maxRounds", async () => {
    await refusal(
      () =>
        frontierClosure({
          seeds: ["a"],
          edges: memoryEdges([
            ["a", "b"],
            ["b", "a"],
          ]),
          budgets: { maxRounds: 1 },
        }),
      "rounds",
    );
  });

  it("BUG: ruleClosure honors explicitly supplied maxRounds", async () => {
    await refusal(
      () =>
        ruleClosure({
          base: [["c", "z"]],
          steps: [
            {
              tail: "free",
              predecessors: memoryEdges([
                ["c", "b"],
                ["b", "a"],
              ]),
            },
          ],
          maxDepth: 10,
          maxPairs: 20,
          budgets: { maxRounds: 1 },
        }),
      "rounds",
    );
  });

  it("BUG: ruleClosure honors explicitly supplied maxVisited", async () => {
    await refusal(
      () =>
        ruleClosure({
          base: [["c", "z"]],
          steps: [
            {
              tail: "free",
              predecessors: memoryEdges([
                ["c", "b"],
                ["c", "a"],
              ]),
            },
          ],
          maxDepth: 10,
          maxPairs: 20,
          budgets: { maxVisited: 1 },
        }),
      "visited",
    );
  });

  it("BUG: path counts on a 12000-node DAG within default frontier budgets do not overflow the JS stack", async () => {
    const edges: FrontierEdge[] = Array.from({ length: 12_000 }, (_, i) => [
      String(i),
      String(i + 1),
    ]);
    const closure = await frontierClosure({ seeds: nodesOf(edges), edges: memoryEdges(edges) });
    expect(closure.complete).toBe(true);
    expect(countSimplePaths(closure, "0", "12000")).toBe(1n);
  });
});

describe("CX-VC8 guards and Datalog", () => {
  it("all storage read methods on both lanes send query only, although constructors retain writable clients", async () => {
    let writes = 0,
      reads = 0;
    const query = async () => {
      reads++;
      return [];
    };
    const mutate = async () => {
      writes++;
      throw new Error("write during storage read");
    };
    const x: any = makeXtdbStorageAdapter(
      { query, submit: mutate, close: async () => {} } as any,
      "test",
    );
    const q: any = makeQleverStorageAdapter(
      {
        query,
        update: mutate,
        close: async () => {},
        command: async () => ({}),
        cancel: async () => {},
      } as any,
      "test",
    );
    for (const adapter of [x, q]) {
      for (const operation of [
        adapter.getById("absent"),
        adapter.getByEntity("absent"),
        adapter.getByEntities(["absent"]),
        adapter.query({}),
        adapter.history("absent"),
        adapter.currentCommitPosition(),
        adapter.dependencyState([":test/edge"], { validAt: 0, recordedPosition: 0 }),
      ])
        await Effect.runPromise(operation);
    }
    expect(writes).toBe(0);
    expect(reads).toBe(15);
  });
  it("submit/update guards refuse without delegation, nested facade retains overlay identity", async () => {
    let writes = 0;
    const x: any = {
      query: async () => [],
      submit: async () => {
        writes++;
      },
      close: async () => {},
    };
    const q: any = {
      query: async () => [],
      update: async () => {
        writes++;
      },
      close: async () => {},
      command: async () => ({}),
      cancel: async () => {},
    };
    const view = readOnlyXtdbClient(readOnlyXtdbClient(x));
    expect(readPathBase(view)).toBe(x);
    await expect(view.submit([])).rejects.toMatchObject({ _tag: "ReadPathWriteRefused" });
    await expect(readOnlyQleverClient(q).update("CLEAR ALL")).rejects.toMatchObject({
      _tag: "QleverReadPathWriteRefused",
    });
    expect(writes).toBe(0);
  });

  it("staged XTDB rows reach main, count and rule selection queries through the same client identity", async () => {
    const seen: string[] = [];
    const client: any = {
      query: async (sql: string) => {
        seen.push(sql);
        return [];
      },
      submit: async () => {
        throw new Error("write in read");
      },
      close: async () => {},
    };
    const row: any = {
      id: "staged",
      entity_id: "new",
      attribute: ":test/edge",
      value_type: "ref",
      value_string: "target",
      recorded_position: 2,
      valid_from: 0,
    };
    const state: any = {
      client,
      scopeKey: "test",
      sourceK: 1,
      position: 2,
      rows: new Map([["staged", row]]),
      claims: new Map(),
      newIds: new Set(["staged"]),
    };
    const executor = makeXtdbQueryExecutor(client, "test");
    const query: any = {
      inner: {
        find: ["?s"],
        where: [["r", "?s", "?t"]],
        rules: [{ name: "r", body: [["?s", ":test/edge", "?t"]] }],
      },
      limit: 1,
      includeCount: true,
    };
    await Effect.runPromise(
      executor
        .executePage(query, false, { validAt: 10 })
        .pipe(Effect.provideService(CurrentTransactions, new Map([[Symbol(), state]]))),
    );
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(
      seen
        .filter((sql) => sql.includes("tx_assertions"))
        .every((sql) => sql.includes("triplex_pending_")),
    ).toBe(true);
    console.log(
      JSON.stringify({
        overlayStatements: seen.length,
        stagedSourceRewrites: seen.filter((sql) => sql.includes("triplex_pending_")).length,
      }),
    );
  });

  const refused: any = {
    find: ["?h", "?t"],
    where: [["r", "?h", "?t"]],
    rules: [
      { name: "r", body: [["?h", ":test/base", "?t"]], maxDepth: 1 },
      {
        name: "r",
        body: [
          ["?h", "?a", "?n"],
          ["r", "?n", "?a"],
        ],
        maxDepth: 1,
      },
    ],
  };
  it("QLever attribute-tail refusal is typed", async () => {
    const client: any = { query: async () => [] };
    await expect(
      evaluateQleverRules(client, refused, "test", {
        basis: { validAt: 0, recordedPosition: 0 },
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ _tag: "DatalogValidationError" });
  });
  it("XTDB public attribute-tail refusal is a typed ReadError with no partial answer", async () => {
    const client: any = { query: async () => [] };
    const executor = makeXtdbQueryExecutor(client, "test");
    const result = await Effect.runPromise(
      Effect.result(executor.execute(refused, false, { validAt: 0, recordedPosition: 0 })),
    );
    expect(result._tag).toBe("Failure");
    expect((result as any).failure._tag).toBe("ReadError");
    expect((result as any).failure.cause.message).toContain(
      "recursive tail bound to the attribute",
    );
  });

  it("both lane evaluators preserve maxDepth and tail constraints on controlled direct-read relations", async () => {
    const base: FrontierEdge[] = [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
      ["d", "d"],
    ];
    const recursive: FrontierEdge[] = [
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
    ];
    for (const maxDepth of [1, 2])
      for (const tail of ["?tail", "?head", "?next"]) {
        const query: any = {
          find: ["?a", "?b"],
          where: [["r", "?a", "?b"]],
          rules: [
            { name: "r", maxDepth, body: [["?head", ":test/base", "?tail"]] },
            {
              name: "r",
              maxDepth,
              body: [
                ["?head", ":test/recur", "?next"],
                ["r", "?next", tail],
              ],
            },
          ],
        };
        const x: any = {
          query: async (_sql: string, params: unknown[]) =>
            (params.includes(":test/base") ? base : recursive).map(([arg1, arg2]) => ({
              arg1,
              arg2,
            })),
        };
        const q: any = {
          query: async (sparql: string) =>
            (sparql.includes(":test/base") ? base : recursive).map(([a, b]) => ({
              v0_value: { type: "literal", value: a },
              v1_value: { type: "literal", value: b },
            })),
        };
        const expected = oracleRule(
          base,
          recursive,
          maxDepth,
          tail === "?head" ? "head" : tail === "?next" ? "next" : "free",
        );
        expect(
          encoded(
            (await evaluateRules(x, query, "test", { validAt: 0, recordedPosition: 0 })).get("r")!,
          ),
        ).toEqual(expected);
        expect(
          encoded(
            (
              await evaluateQleverRules(q, query, "test", {
                basis: { validAt: 0, recordedPosition: 0 },
                signal: new AbortController().signal,
              })
            ).get("r")!,
          ),
        ).toEqual(expected);
      }
  });
});

describe("CX-VC8 fail closed counter", () => {
  it("BUG: pgwire execute of an existing prepared write after reset cannot silently count zero", async () => {
    let received = 0;
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
    const int = (n: number) => {
      const b = Buffer.alloc(4);
      b.writeInt32BE(n);
      return b;
    };
    const frame = (type: string, payload: Buffer) =>
      Buffer.concat([Buffer.from(type), int(payload.length + 4), payload]);
    const waitBytes = async (n: number) => {
      while (received < n) await new Promise((r) => setTimeout(r, 2));
    };
    try {
      const startupFields = Buffer.from("user\0generic\0database\0db\0\0");
      const startup = Buffer.concat([int(8 + startupFields.length), int(196608), startupFields]);
      const parse = frame(
        "P",
        Buffer.concat([Buffer.from("write_stmt\0DELETE FROM t\0"), Buffer.from([0, 0])]),
      );
      client.write(Buffer.concat([startup, parse]));
      await waitBytes(startup.length + parse.length);
      expect(counter.counts().writes).toBe(1);
      counter.reset();
      const bind = frame("B", Buffer.concat([Buffer.from("\0write_stmt\0"), Buffer.alloc(6)]));
      const execute = frame("E", Buffer.alloc(5));
      const sync = frame("S", Buffer.alloc(0));
      client.write(Buffer.concat([bind, execute, sync]));
      await waitBytes(startup.length + parse.length + bind.length + execute.length + sync.length);
      console.log(JSON.stringify({ repeatedPreparedWriteAfterReset: counter.counts() }));
      expect(counter.counts().writes).toBeGreaterThan(0);
    } finally {
      client.destroy();
      await counter.close();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((r) => upstream.close(() => r()));
    }
  });
  it("classifies required SQL adversaries as writes", () => {
    for (const text of [
      "SELECT 1; COPY t FROM STDIN",
      "BEGIN",
      "BEGIN READ WRITE",
      "START TRANSACTION",
      "LOAD 'thing'",
      "CLEAR ALL",
      "WITH q AS (DELETE FROM t RETURNING *) SELECT * FROM q",
    ])
      expect(classifyXtdbStatement(text)).toBe("write");
  });

  it("QLever GET/form LOAD and CLEAR updates count; unknown multipart must count or fail", async () => {
    const seen: string[] = [];
    const upstream = http.createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        seen.push(req.url!);
        res.end("{}");
      });
    });
    await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
    const counter = await startQleverWriteCounter(
      `http://127.0.0.1:${(upstream.address() as net.AddressInfo).port}`,
    );
    try {
      for (const update of ["LOAD <urn:test>", "CLEAR ALL"]) {
        counter.reset();
        await (await fetch(`${counter.url}/?update=${encodeURIComponent(update)}`)).text();
        expect(counter.counts().writes).toBe(1);
        counter.reset();
        await (
          await fetch(counter.url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ update }),
          })
        ).text();
        expect(counter.counts().writes).toBe(1);
      }
      counter.reset();
      const response = await fetch(counter.url, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=x" },
        body: '--x\r\nContent-Disposition: form-data; name="cmd"\r\n\r\nclear-delta-triples\r\n--x--\r\n',
      });
      await response.text();
      console.log(JSON.stringify({ unknownMultipart: counter.counts(), forwarded: seen.length }));
      expect(counter.counts().writes).toBeGreaterThan(0);
    } finally {
      await counter.close();
      await new Promise<void>((r) => upstream.close(() => r()));
    }
  });
});
