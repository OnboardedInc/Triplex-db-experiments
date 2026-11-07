/**
 * [EXP-C8] Differential and unit tests for the shared read-only frontier loop.
 *
 * Why: R10 6.7 asks for one differential test of `frontierClosure` against the oracle's
 * `reachable` on the R10 fixtures plus random graphs. The oracle here is the packet's own Python
 * (qualification/workloads/event_oracles.py: `reachable`, and `support_rows` for simple-path
 * counts), run unchanged in a child process, so the TypeScript loop is never compared with a
 * TypeScript copy of itself. The fixture graphs are the live recursive edges of workloads 11,
 * 13, 14, 15 and 20 at every case cut, extracted the way R10's fixture_sizes.py did (R10 1.2).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  RecursionBudgetExceeded,
  closurePairs,
  countSimplePaths,
  frontierClosure,
  memoryEdges,
  reachFrom,
  ruleClosure,
  type FrontierEdge,
} from "../../src/native/FrontierClosure.js";

const workloads = path.resolve(import.meta.dirname, "../../../../qualification/workloads");

/** An in-memory edge reader with the lane contract: sources in the batch, at most `limit` rows. */
const reader = (edges: readonly FrontierEdge[], log?: string[][]) => {
  const out = new Map<string, Set<string>>();
  for (const [s, t] of edges) out.set(s, (out.get(s) ?? new Set()).add(t));
  return async (batch: readonly string[], limit: number) => {
    log?.push([...batch]);
    const rows: FrontierEdge[] = [];
    for (const s of batch) for (const t of out.get(s) ?? []) rows.push([s, t]);
    return rows.slice(0, limit);
  };
};

const python = (script: string, input: unknown): any => {
  const result = spawnSync(
    "python3",
    ["-I", "-B", "-c", `import sys, json; sys.path.insert(0, ${JSON.stringify(workloads)})\n${script}`],
    { input: JSON.stringify(input), encoding: "utf8", maxBuffer: 256 * 1024 ** 2 },
  );
  if (result.status !== 0) throw new Error(`oracle failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
};

/** Seeded generator so a failing graph is reproducible. */
const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomGraphs = (count: number, maxNodes: number, seed: number) => {
  const random = prng(seed);
  const graphs: { readonly nodes: string[]; readonly edges: FrontierEdge[] }[] = [];
  for (let g = 0; g < count; g++) {
    const n = 1 + Math.floor(random() * maxNodes);
    const nodes = Array.from({ length: n }, (_, i) => `n${i}`);
    const shape = g % 4;
    const edges: FrontierEdge[] = [];
    if (shape === 0) {
      // Random digraph, self-loops and duplicates allowed (duplicates must collapse, C5.1).
      const m = Math.floor(random() * n * 3);
      for (let i = 0; i < m; i++)
        edges.push([nodes[Math.floor(random() * n)]!, nodes[Math.floor(random() * n)]!]);
    } else if (shape === 1) {
      // Tree with diamonds: each node points at 1 to 2 later nodes.
      for (let i = 0; i < n - 1; i++) {
        edges.push([nodes[i]!, nodes[i + 1 + Math.floor(random() * (n - i - 1))]!]);
        if (random() < 0.4) edges.push([nodes[i]!, nodes[i + 1 + Math.floor(random() * (n - i - 1))]!]);
      }
    } else if (shape === 2) {
      // Ring (one giant cycle) plus chords.
      for (let i = 0; i < n; i++) edges.push([nodes[i]!, nodes[(i + 1) % n]!]);
      for (let i = 0; i < n / 3; i++)
        edges.push([nodes[Math.floor(random() * n)]!, nodes[Math.floor(random() * n)]!]);
    } else {
      // Sparse forest with isolated nodes.
      for (let i = 1; i < n; i++)
        if (random() < 0.6) edges.push([nodes[Math.floor(random() * i)]!, nodes[i]!]);
    }
    graphs.push({ nodes, edges });
  }
  return graphs;
};

describe("frontierClosure differential against the packet oracle", () => {
  it("matches event_oracles.reachable on every fixture cut and on 300 random graphs", async () => {
    const fixtures: { readonly label: string; readonly edges: FrontierEdge[] }[] = python(
      `
d = json.load(open(${JSON.stringify(path.join(workloads, "temporal-workloads.json"))}))
recursive = {"11": ["member_of", "parent"], "13": ["contains"], "14": ["input_of"], "15": ["depends_on"], "20": ["edge"]}
out = []
for w in d["workloads"]:
    if w["id"] not in recursive: continue
    for c in w["cases"]:
        P, V = int(c["cut"]["known_at"]), int(c["cut"]["valid_at"] or 0)
        for attr in recursive[w["id"]]:
            edges = []
            for a in w["assertions"]:
                if a["attribute"] != attr or a["value"]["tag"] != "str": continue
                kf, kt = int(a["known"][0]), a["known"][1]
                vf, vt = int(a["valid"][0]), a["valid"][1]
                if kf <= P and (kt is None or P < int(kt)) and vf <= V and (vt is None or V < int(vt)):
                    edges.append([a["entity"], a["value"]["value"]])
            out.append({"label": w["id"] + "/" + c["id"] + "/" + attr, "edges": edges})
print(json.dumps(out))
`,
      null,
    );
    expect(fixtures.length).toBeGreaterThanOrEqual(17);
    expect(fixtures.some((fixture) => fixture.edges.length > 0)).toBe(true);
    const graphs = [
      ...fixtures.map((fixture) => ({
        label: fixture.label,
        nodes: [...new Set(fixture.edges.flat()), "absent-origin"],
        edges: fixture.edges,
      })),
      ...randomGraphs(300, 40, 20261107).map((graph, index) => ({ label: `random-${index}`, ...graph })),
    ];
    const queries = graphs.flatMap((graph) =>
      graph.nodes.map((origin) => ({ label: graph.label, edges: graph.edges, origin })),
    );
    const oracle: string[][] = python(
      `from event_oracles import reachable
queries = json.load(sys.stdin)
print(json.dumps([sorted(reachable([tuple(e) for e in q["edges"]], q["origin"])) for q in queries]))`,
      queries,
    );
    expect(oracle).toHaveLength(queries.length);
    let checked = 0;
    for (const [index, query] of queries.entries()) {
      // Batch size 3 forces several engine reads per round, the multi-chunk path of R10 3.1.
      const closure = await frontierClosure({
        seeds: [query.origin],
        edges: reader(query.edges),
        budgets: { maxBatch: 3 },
      });
      expect(closure.complete).toBe(true);
      expect([...closure.reached].sort(), `${query.label} from ${query.origin}`).toEqual(oracle[index]);
      expect(reachFrom(closure, query.origin)).toEqual(oracle[index]);
      checked++;
    }
    expect(checked).toBeGreaterThan(1_000);
  }, 120_000);

  it("multi-seed closures give every seed its own exact reach (closurePairs)", async () => {
    const graphs = randomGraphs(60, 25, 7);
    const queries = graphs.flatMap((graph) =>
      graph.nodes.map((origin) => ({ edges: graph.edges, origin })),
    );
    const oracle: string[][] = python(
      `from event_oracles import reachable
queries = json.load(sys.stdin)
print(json.dumps([sorted(reachable([tuple(e) for e in q["edges"]], q["origin"])) for q in queries]))`,
      queries,
    );
    let cursor = 0;
    for (const graph of graphs) {
      const closure = await frontierClosure({ seeds: graph.nodes, edges: reader(graph.edges) });
      const pairs = closurePairs(closure, 100_000);
      for (const origin of closure.seeds) {
        const index = queries.findIndex((q, i) => i >= cursor && q.origin === origin && q.edges === graph.edges);
        expect(pairs.filter(([s]) => s === origin).map(([, t]) => t)).toEqual(oracle[index]);
      }
      cursor += graph.nodes.length;
    }
  });

  it("counts simple paths exactly like the oracle's support_rows on acyclic and cyclic graphs", async () => {
    const graphs = randomGraphs(160, 9, 99);
    const queries = graphs.flatMap((graph) =>
      graph.nodes.flatMap((from) => graph.nodes.map((to) => ({ edges: graph.edges, from, to }))),
    );
    const oracle: [boolean, string][] = python(
      `from event_oracles import support_rows
cell = lambda v: {"tag": "str", "value": v}
out = []
for q in json.load(sys.stdin):
    events = [{"kind": "edges_asserted", "occurred_at": 0, "recorded_at": 0, "payload": {"edges": [{"from": cell(s), "to": cell(t)} for s, t in q["edges"]]}}]
    case = {"operation": "reachability_supports", "cut": {"valid_at": 0}, "parameters": {"from": cell(q["from"]), "to": cell(q["to"])}}
    row = support_rows(events, case)[0]
    out.append([row[0]["value"], row[1]["value"]])
print(json.dumps(out))`,
      queries,
    );
    for (const [index, query] of queries.entries()) {
      const closure = await frontierClosure({ seeds: [query.from], edges: reader(query.edges) });
      expect(countSimplePaths(closure, query.from, query.to).toString(), JSON.stringify(query)).toBe(
        oracle[index]![1],
      );
    }
  }, 120_000);
});

describe("frontierClosure semantics and budgets", () => {
  // WL15 dependency-set: cycle Y<->Z plus a diamond; R10 3.2 recorded rounds (1,2),(2,2),(1,1).
  const wl15: FrontierEdge[] = [
    ["X", "Y"],
    ["X", "W"],
    ["W", "Z"],
    ["Y", "Z"],
    ["Z", "Y"],
  ];

  it("terminates on cycles, never re-expands, and records per-round stats", async () => {
    const log: string[][] = [];
    const closure = await frontierClosure({ seeds: ["X"], edges: reader(wl15, log) });
    expect([...closure.reached].sort()).toEqual(["W", "Y", "Z"]);
    expect(log).toEqual([["X"], ["W", "Y"], ["Z"]]);
    expect(closure.rounds.map((r) => [r.frontier, r.rows])).toEqual([
      [1, 2],
      [2, 2],
      [1, 1],
    ]);
  });

  it("includes the origin only when a cycle returns to it, and handles an absent origin", async () => {
    const cycle = await frontierClosure({ seeds: ["a"], edges: reader([["a", "b"], ["b", "a"]]) });
    expect([...cycle.reached].sort()).toEqual(["a", "b"]);
    const absent = await frontierClosure({ seeds: ["nobody"], edges: reader(wl15) });
    expect(absent.reached.size).toBe(0);
    expect(absent.rounds).toHaveLength(1);
  });

  it("collapses duplicate edges (C5.1)", async () => {
    const closure = await frontierClosure({ seeds: ["a"], edges: reader([["a", "b"], ["a", "b"]]) });
    expect(closure.edgeCount).toBe(1);
  });

  it("honours a semantic maxDepth without error and without expanding beyond it", async () => {
    const chain: FrontierEdge[] = [["a", "b"], ["b", "c"], ["c", "d"]];
    const log: string[][] = [];
    const closure = await frontierClosure({ seeds: ["a"], edges: reader(chain, log), maxDepth: 2 });
    expect([...closure.reached].sort()).toEqual(["b", "c"]);
    expect(closure.complete).toBe(false);
    expect(log).toEqual([["a"], ["b"]]);
  });

  it.each([
    ["rounds", { maxRounds: 2 }],
    ["visited", { maxVisited: 2 }],
    ["edges", { maxEdges: 2 }],
    ["roundRows", { maxRoundRows: 1 }],
  ] as const)("fails with a typed %s budget error and no partial answer", async (kind, budgets) => {
    const fan: FrontierEdge[] = [["r", "a"], ["r", "b"], ["a", "c"], ["c", "d"]];
    const error = await frontierClosure({ seeds: ["r"], edges: reader(fan), budgets }).catch(
      (cause: unknown) => cause,
    );
    expect(error).toBeInstanceOf(RecursionBudgetExceeded);
    expect((error as RecursionBudgetExceeded).kind).toBe(kind);
  });

  it("rejects malformed lane reads instead of dropping edges", async () => {
    await expect(
      frontierClosure({ seeds: ["a"], edges: async () => [["z", "b"]] }),
    ).rejects.toThrow(/outside its frontier batch/);
    await expect(
      frontierClosure({ seeds: ["a"], edges: async () => [["a", null as unknown as string]] }),
    ).rejects.toThrow(/text identity/);
  });

  it("stops between rounds when the caller aborts", async () => {
    const controller = new AbortController();
    const edges = reader([["a", "b"], ["b", "c"]]);
    await expect(
      frontierClosure({
        seeds: ["a"],
        signal: controller.signal,
        edges: async (batch, limit) => {
          controller.abort(new Error("cancelled"));
          return edges(batch, limit);
        },
      }),
    ).rejects.toThrow(/cancelled/);
  });

  it("closurePairs enforces the pair budget", async () => {
    const closure = await frontierClosure({ seeds: ["X"], edges: reader(wl15) });
    expect(() => closurePairs(closure, 2)).toThrow(RecursionBudgetExceeded);
    expect(closurePairs(closure, 3)).toEqual([
      ["X", "W"],
      ["X", "Y"],
      ["X", "Z"],
    ]);
  });
});

describe("ruleClosure (bounded right-linear Datalog rules)", () => {
  type Tail = "free" | "head" | "next";
  /**
   * Independent reference: the old depth-tagged naive rounds, evaluated in memory, with the old
   * SQL's tail binding (`t = h` or `t = n` as equality conditions).
   */
  const naive = (base: FrontierEdge[], steps: { edges: FrontierEdge[]; tail: Tail }[], maxDepth: number) => {
    const key = (s: string, t: string) => JSON.stringify([s, t]);
    const relation = new Map(base.map(([s, t]) => [key(s, t), [s, t] as FrontierEdge]));
    for (let depth = 1; depth <= maxDepth; depth++) {
      // Each round reads only rows of depth < round (the old `depth < $round` filter).
      const previous = [...relation.values()];
      for (const { edges, tail } of steps)
        for (const [h, n] of edges)
          for (const [s, t] of previous)
            if (s === n && (tail === "free" || (tail === "head" ? t === h : t === n)))
              relation.set(key(h, t), [h, t]);
      if (relation.size === previous.length) break;
    }
    return [...relation.values()].sort((a, b) => (key(...a) < key(...b) ? -1 : 1));
  };
  const reverse = (edges: readonly FrontierEdge[]) =>
    reader(edges.map(([h, n]) => [n, h] as FrontierEdge));

  it("equals the naive depth-bounded fixpoint on random graphs, depths and tail constraints", async () => {
    const random = prng(5);
    const tails: Tail[] = ["free", "head", "next"];
    for (const [index, graph] of randomGraphs(150, 15, 11).entries()) {
      const base = graph.edges.filter(() => random() < 0.5);
      const maxDepth = 1 + Math.floor(random() * 6);
      // Two recursive definitions of one name over different edge subsets, as rules allow.
      const steps = [
        { edges: graph.edges.filter(() => random() < 0.7), tail: tails[index % 3]! },
        { edges: graph.edges.filter(() => random() < 0.3), tail: tails[(index + 1) % 3]! },
      ];
      const { pairs } = await ruleClosure({
        base,
        steps: steps.map((step) => ({ predecessors: reverse(step.edges), tail: step.tail })),
        maxDepth,
        maxPairs: 100_000,
        budgets: { maxBatch: 2 },
      });
      expect(pairs, `graph ${index}`).toEqual(naive(base, steps, maxDepth));
    }
  });

  it("keeps the tail constraint (EXP-C8 review: r(h,h) :- [h next n], r(n,h))", async () => {
    // Facts 1->2, 2->3; base r = next. Free tail adds (1,3); a tail equal to the head adds nothing.
    const next: FrontierEdge[] = [["1", "2"], ["2", "3"]];
    const free = await ruleClosure({ base: next, steps: [{ predecessors: reverse(next), tail: "free" }], maxDepth: 10, maxPairs: 10 });
    expect(free.pairs).toEqual([["1", "2"], ["1", "3"], ["2", "3"]]);
    const head = await ruleClosure({ base: next, steps: [{ predecessors: reverse(next), tail: "head" }], maxDepth: 10, maxPairs: 10 });
    expect(head.pairs).toEqual([["1", "2"], ["2", "3"]]);
  });

  it("returns the base relation alone when there is no recursive definition", async () => {
    const { pairs, rounds } = await ruleClosure({
      base: [["b", "c"], ["a", "b"], ["a", "b"]],
      maxDepth: 100,
      maxPairs: 10,
    });
    expect(pairs).toEqual([
      ["a", "b"],
      ["b", "c"],
    ]);
    expect(rounds).toHaveLength(0);
  });

  it("enforces the pair budget", async () => {
    await expect(
      ruleClosure({
        base: [["c", "d"]],
        steps: [{ predecessors: reverse([["a", "b"], ["b", "c"]]), tail: "free" }],
        maxDepth: 10,
        maxPairs: 2,
      }),
    ).rejects.toBeInstanceOf(RecursionBudgetExceeded);
  });
});

describe("rounds budget and single-read edges", () => {
  it("completes a chain of exactly maxRounds edges, like the old helper, and fails one beyond", async () => {
    const chain = (length: number) => Array.from({ length }, (_, i) => [`n${i}`, `n${i + 1}`] as FrontierEdge);
    const ok = await frontierClosure({ seeds: ["n0"], edges: reader(chain(3)), budgets: { maxRounds: 3 } });
    expect(ok.reached.size).toBe(3);
    await expect(
      frontierClosure({ seeds: ["n0"], edges: reader(chain(4)), budgets: { maxRounds: 3 } }),
    ).rejects.toMatchObject({ kind: "rounds" });
  });

  it("memoryEdges serves the frontier loop from one read and bounds it", async () => {
    const edges = memoryEdges([["X", "Y"], ["X", "W"], ["W", "Z"], ["Y", "Z"], ["Z", "Y"]]);
    expect(edges.sources).toEqual(["W", "X", "Y", "Z"]);
    const closure = await frontierClosure({ seeds: ["X"], edges });
    expect([...closure.reached].sort()).toEqual(["W", "Y", "Z"]);
    expect(() => memoryEdges([["a", "b"], ["b", "c"]], 1)).toThrow(RecursionBudgetExceeded);
  });
});
