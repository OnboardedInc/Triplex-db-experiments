import { describe, expect, it } from "vitest";
import {
  exchangeAnatomy,
  parsePostgres,
  correlateStatements,
  tailCauses,
  bookendComparison,
  aggregateExchanges,
} from "../../../lab/trace/anatomy.mjs";

describe("commit anatomy observations", () => {
  it("does not promote an apparent saving within the bookend drift", () => {
    expect(bookendComparison([13, 13.4], [13.1, 13.2]).lowerBeyondBookendDrift).toBe(false);
    expect(bookendComparison([13, 13.2], [11, 11.2]).lowerBeyondBookendDrift).toBe(true);
    expect(() => bookendComparison([13], [11, 11])).toThrow();
    expect(() => bookendComparison([13, 13], [11, NaN])).toThrow();
  });
  const owner = {
    traceId: "1".repeat(32),
    run: "run",
    source: "head",
    slot: "slot",
    spans: [
      { id: "encode", parent: "root", name: "client.encode", start: 0, end: 1 },
      { id: "http", parent: "root", name: "client.http", start: 1, end: 15 },
      { id: "write", parent: "http", name: "socket.queue-and-write", start: 1, end: 2 },
      { id: "body", parent: "http", name: "socket.body-read", start: 14, end: 15 },
      { id: "parse", parent: "root", name: "client.parse", start: 15, end: 16 },
    ],
  };
  const gateway = {
    ...owner,
    parent: "http",
    start: 3,
    end: 13,
    spans: [{ id: "peer", name: "d/transact", start: 4, end: 12 }],
  };
  it("partitions the bound exchange and retains an overlapping response boundary", () => {
    const r = exchangeAnatomy(owner, gateway)!;
    expect(Object.values(r.steps).reduce((a: number, b: unknown) => a + Number(b), 0)).toBe(16);
    expect(r.steps["peer transact wait"]).toBe(8);
    expect(
      exchangeAnatomy(owner, {
        ...gateway,
        spans: [
          { ...gateway.spans[0], name: "peer.transact-await (includes order/network/storage)" },
        ],
      })?.steps["peer transact wait"],
    ).toBe(8);
    const overlap = exchangeAnatomy(owner, { ...gateway, end: 15.5 })!;
    expect(overlap.steps["return network, body and callback"]).toBe(-0.5);
    expect(overlap.boundaryOverlapMs).toBe(0.5);
    expect(() => exchangeAnatomy(owner, { ...gateway, source: "another" })).toThrow("Foreign");
    expect(exchangeAnatomy(owner, { ...gateway, parent: "unrelated" })).toBeNull();
  });
  it("counts retries once per commit and exposes concurrent HTTP overlap", () => {
    const e = { traceId: "t", start: 1, end: 4, steps: { peer: 2, client: 1 } };
    const root = { traceId: "t", name: "baseline", wallMs: 12 };
    expect(aggregateExchanges(root, [e, { ...e, start: 5, end: 8 }])).toMatchObject({
      attempts: 2,
      httpWallMs: 6,
      outsideHttpMs: 6,
      steps: { peer: 4, client: 2 },
    });
    expect(aggregateExchanges(root, [e, { ...e, start: 2, end: 5 }])).toMatchObject({
      attempts: 2,
      httpWallMs: 4,
      outsideHttpMs: 8,
      overlapMs: 2,
      steps: null,
    });
  });
  it("charges a native function only to its exact peer parent", async () => {
    const { attribute } = await import("../../../lab/trace/report.mjs");
    const binding = { traceId: "t", run: "r", source: "h", slot: "s" };
    const root = {
      ...binding,
      root: "root",
      kind: "commit",
      start: 0,
      end: 10,
      process: "node",
      thread: 0,
      spans: [
        {
          id: "http",
          parent: "root",
          name: "client.http",
          layer: "gateway-wait",
          start: 1,
          end: 9,
        },
      ],
    };
    const gateway = {
      ...binding,
      root: "gw",
      parent: "http",
      name: "gateway /transact",
      process: "gw-w",
      thread: 1,
      start: 1.5,
      end: 8.5,
      spans: [
        {
          id: "peer",
          parent: "gw",
          name: "peer.transact-await",
          layer: "peer-wait",
          start: 2,
          end: 8,
        },
      ],
    };
    const event = {
      ...binding,
      id: "tx",
      parent: "peer",
      process: "tx",
      thread: 2,
      nativeType: "triplex.TransactionFunction",
      name: "transactor.triplex-function",
      layer: "transactor",
      start: 3,
      end: 5,
    };
    expect(attribute(root, [gateway], [event]).layers.transactor).toBe(2);
    expect(
      attribute(root, [gateway], [{ ...event, parent: "other" }]).layers.transactor,
    ).toBeNull();
    expect(
      attribute(root, [gateway], [{ ...event, source: "foreign" }]).layers.transactor,
    ).toBeNull();
  });
  it("counts executions rather than JDBC parse/bind messages and omits payloads", () => {
    const prefix =
      "2026-11-13T03:40:17.553228299Z 2026-11-13 03:40:17.553 UTC [126] LOG:  duration: 0.076 ms  ";
    expect(parsePostgres(prefix + "bind S_1: insert into datomic_kvs values ($1)")).toBeNull();
    expect(
      parsePostgres(prefix + "execute S_1: insert into datomic_kvs values ($1)"),
    ).toMatchObject({ pid: 126, kind: "insert", ms: 0.076 });
    expect(
      parsePostgres(prefix + "execute S_1: insert into datomic_kvs values ($1)"),
    ).not.toHaveProperty("sql");
    expect(
      parsePostgres(prefix + "statement: SELECT json_build_object('type','postgres-sample')"),
    ).toBeNull();
  });
  it("marks overlapping transaction windows ambiguous instead of multiplying statements", () => {
    const s = { start: 5, end: 6, ms: 1, pid: 1, kind: "update" };
    expect(
      correlateStatements(
        [
          { start: 0, end: 10 },
          { start: 3, end: 7 },
        ],
        [s],
      ).map((r: any) => [r.statements.length, r.ambiguousStatements]),
    ).toEqual([
      [0, 1],
      [0, 1],
    ]);
    expect(
      correlateStatements(
        [
          { start: 0, end: 10 },
          { start: 20, end: 30 },
        ],
        [s],
      )[0].statements,
    ).toEqual([s]);
  });
  it("keeps every primary tail and identifies predecessor waiting separately", () => {
    const commit = {
      name: "L256",
      writer: { stream: "background", queue: [] },
      root: { spans: [{ name: "driver.queue.subject", start: 0, end: 70 }] },
      wallMs: 100,
      layers: { "driver-queue": 70, "peer-wait": 20, typescript: 10 },
      unexplainedMs: 0,
      traceId: "trace",
    };
    const rows = tailCauses([commit, { ...commit, writer: { ...commit.writer, resend: true } }]);
    expect(rows).toMatchObject([
      {
        cause: "driver.queue.subject",
        count: 1,
        totalWallMs: 100,
        totalCauseMs: 70,
        worstTraceId: "trace",
      },
    ]);
  });
});
