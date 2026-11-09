// [CX-VINTQ] Why: preserve the excluded segment-era ACK/group assertions against the actual SQLite log. Rejected: treating backend replacement as evidence that the semantic property still runs.
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const Database = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
import { vi, it, expect } from "vitest";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
const open = async () => {
  const dir = path.join(import.meta.dirname, "output", "ack-" + randomUUID());
  return { b: await HostBroker.open({ dir, scopeKey: "vintq-ack", minFreeBytes: 0 }), dir };
};
const transaction = (b: HostBroker, id: string) => ({
  operationId: id,
  attemptId: id,
  sourceK: b.head(),
  reads: { entities: new Set<string>(), scopeWide: false },
  claims: [],
  placeholders: [-1],
  rows: [
    {
      ...Object.fromEntries(columns.map((c) => [c, null])),
      id,
      entity_id: id,
      attribute: ":x",
      value_type: "string",
      value_string: id,
      recorded_at: 100,
      recorded_position: -1,
      valid_from: 0,
      entity_type: "Subject",
    } as any,
  ],
  priors: new Map(),
  newIds: new Set([id]),
});
it("a lone commit resolves with all parent setTimeout callbacks frozen", async () => {
  const { b } = await open();
  const realTimeout = setTimeout,
    realClear = clearTimeout;
  let timer: any;
  try {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const decision = await Promise.race([
      b.submit(transaction(b, "lone")),
      new Promise<never>((_, reject) => {
        timer = realTimeout(() => reject(Error("commit required a timer callback")), 5000);
      }),
    ]);
    expect(decision.kind).toBe("committed");
  } finally {
    vi.useRealTimers();
    realClear(timer);
    await b.close();
  }
});
it("every ACK follows completed SQLite append and publication, with at most 64 commands per durable group", async () => {
  const { b, dir } = await open(),
    trace: { event: string; lsn: number }[] = [];
  const log = (b as any).log;
  const append = log.append.bind(log),
    publish = log.publishWatermark.bind(log);
  log.append = async (...args: any[]) => {
    const f = await append(...args);
    trace.push({ event: "sqlite-return", lsn: f.lsn });
    return f;
  };
  log.publishWatermark = (m: any) => {
    publish(m);
    trace.push({ event: "publication", lsn: m.lsn });
  };
  try {
    const answers = await Promise.all(
      Array.from({ length: 160 }, (_, i) =>
        b.submit(transaction(b, "c" + i)).then((d) => {
          expect(d.kind).toBe("committed");
          if (d.kind !== "committed") throw Error("unexpected conflict");
          trace.push({ event: "ack", lsn: d.lsn });
          return d;
        }),
      ),
    );
    expect(answers).toHaveLength(160);
    for (let i = 0; i < trace.length; i++)
      if (trace[i]!.event === "ack") {
        const lsn = trace[i]!.lsn,
          start = trace.findIndex((t) => t.event === "sqlite-return" && t.lsn === lsn),
          pub = trace.findIndex((t) => t.event === "publication" && t.lsn === lsn);
        expect(start).toBeGreaterThanOrEqual(0);
        expect(pub).toBeGreaterThan(start);
        expect(i).toBeGreaterThan(pub);
      }
    const db = new Database(path.join(dir, "broker.db"), { readonly: true });
    try {
      const frames = db.prepare("SELECT payload FROM frames WHERE kind=1 ORDER BY lsn").all() as {
        payload: Buffer;
      }[];
      const sizes = frames.map((f) => JSON.parse(f.payload.toString()).m.length);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(160);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(64);
      expect(Math.max(...sizes)).toBeGreaterThan(1);
      expect(db.prepare("SELECT count(*) n FROM recent_rows").get()).toEqual({ n: 160 });
    } finally {
      db.close();
    }
  } finally {
    await b.close();
  }
});
it("the same SQLite stream cannot be reopened through a directory alias", async () => {
  const { b, dir } = await open();
  const fs = await import("node:fs");
  const alias = dir + "-alias";
  fs.symlinkSync(dir, alias);
  try {
    await expect(
      HostBroker.open({ dir: alias, scopeKey: "alias", minFreeBytes: 0 }),
    ).rejects.toThrow(/already open/);
    expect((await b.submit(transaction(b, "owner"))).kind).toBe("committed");
  } finally {
    await b.close();
  }
});
it("a SQLite statement failure sends no ACK, fails later admissions, and preserves the prior complete prefix", async () => {
  const { b, dir } = await open();
  let db: any;
  const prior = await b.submit(transaction(b, "prior"));
  expect(prior.kind).toBe("committed");
  try {
    db = new Database(path.join(dir, "broker.db"));
    db.exec(
      "CREATE TRIGGER review_fail BEFORE INSERT ON frames WHEN NEW.kind=1 BEGIN SELECT RAISE(ABORT, 'review injected SQLite statement failure'); END;",
    );
    await expect(b.submit(transaction(b, "uncertain"))).rejects.toThrow(/outcome.*unknown/);
    await expect(b.submit(transaction(b, "later"))).rejects.toThrow(/failed|unknown/i);
    expect(db.prepare("SELECT count(*) n FROM recent_rows").get()).toEqual({ n: 1 });
    expect(db.prepare("SELECT op FROM operations ORDER BY op").all()).toEqual([{ op: "prior" }]);
    db.exec("DROP TRIGGER review_fail");
    db.close();
    db = undefined;
  } finally {
    db?.close();
    await b.close();
  }
  const recovered = await HostBroker.open({ dir, scopeKey: "vintq-ack", minFreeBytes: 0 });
  try {
    expect((await recovered.pullAt(recovered.head(), {})).rows.map((r) => r.id)).toEqual(["prior"]);
    expect((await recovered.submit(transaction(recovered, "uncertain"))).kind).toBe("committed");
  } finally {
    await recovered.close();
  }
});
