// Brief check 5: Q31c falsifiers of my own (the branch's four are re-run from packages/qlever/test/broker.test.ts).
// (a) A wrong allocator would fail: mixed-width members in one group, an over-wide member, the 1,024-ordinal cap.
// (b) Nested transacts inside one command: consecutive ordinals, each nested cut an exact prefix.
// (c) A burned LSN names nothing, before and after later commits, and the feed lists it aborted.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { LogFeed } from "../../../../packages/qlever/src/broker/feed.js";
import { attempt, at, freshDir, key, logMembers, openRt, oracleAt, ops, writeJson } from "./harness.js";

const far = () => Date.now() + 10 ** 9;
let placeholderSeq = 10_000_000;
const synthetic = (width: number, tag: string) => {
  const placeholders = Array.from({ length: width }, () => -++placeholderSeq);
  return {
    operationId: `op-${tag}-${randomUUID()}`,
    attemptId: `at-${tag}`,
    sourceK: 0,
    reads: { entities: new Set<string>(), scopeWide: false },
    claims: [],
    placeholders,
    rows: [],
    priors: new Map(),
    newIds: new Set<string>(),
  };
};

describe("allocator falsifiers", () => {
  it("mixed widths, an over-wide member and the ordinal cap: positions unique, consecutive per member, never past ordinal 1023", async () => {
    const dir = freshDir("c5-alloc");
    const rt = await openRt(dir, `v-p2q-c5:${randomUUID()}`);
    try {
      const widths = [1, 600, 600, 300, 1025, 2, 3, 1, 512, 512, 1];
      const submitted = widths.map((w, i) => ({ w, p: rt.broker.submit(synthetic(w, String(i)) as any).then((d) => d, (e) => e) }));
      const outcomes = await Promise.all(submitted.map(async ({ w, p }) => ({ w, d: await p })));
      const all: number[] = [];
      const perMember: { w: number; lsn?: number; positions?: number[]; error?: string }[] = [];
      for (const { w, d } of outcomes) {
        if (d instanceof Error) {
          perMember.push({ w, error: `${d.constructor.name}: ${d.message}` });
          continue;
        }
        const positions = [...(d as any).positions.values()].sort((a: number, b: number) => a - b);
        perMember.push({ w, lsn: (d as any).lsn, positions: [positions[0], positions.at(-1)] });
        all.push(...positions);
        for (let i = 1; i < positions.length; i++) expect(positions[i]).toBe(positions[i - 1] + 1);
        expect(new Set(positions.map((p: number) => Math.floor(p / 1024))).size).toBe(1);
        expect(positions.at(-1)! % 1024).toBeLessThan(1024);
      }
      expect(new Set(all).size).toBe(all.length);
      const frames = new Map<number, number>();
      for (const m of perMember) if (m.lsn !== undefined) frames.set(m.lsn, (frames.get(m.lsn) ?? 0) + m.w);
      writeJson("check5-allocator.json", { perMember, ordinalsPerFrame: Object.fromEntries(frames) });
      expect(perMember.find((m) => m.w === 1025)!.error).toMatch(/BrokerInvalidTransaction/);
      expect([...frames.values()].every((n) => n <= 1024)).toBe(true);
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("nested transacts in one command: consecutive ordinals in one frame, every nested cut exact", async () => {
    const dir = freshDir("c5-nested");
    const rt = await openRt(dir, `v-p2q-c5b:${randomUUID()}`);
    try {
      const nested = (tag: string) =>
        rt.adapter.withTransaction(
          Effect.gen(function* () {
            const a = yield* rt.triples.transact(ops(`s:n-${tag}`, 1, `${tag}a`));
            const b = yield* rt.triples.transact(ops(`s:n-${tag}`, 1, `${tag}b`));
            const c = yield* rt.triples.transact(ops(`s:m-${tag}`, 1, `${tag}c`));
            return [a, b, c];
          }),
        );
      const results = await Promise.all(["x", "y", "z", "w"].map((t) => attempt(rt, nested(t))));
      const record: any[] = [];
      for (const r of results) {
        expect(r.ok).toBe(true);
        const ps = r.value.map((x: any) => x.position);
        record.push(ps);
        expect(ps[1]).toBe(ps[0] + 1);
        expect(ps[2]).toBe(ps[1] + 1);
        expect(Math.floor(ps[0] / 1024)).toBe(Math.floor(ps[2] / 1024));
      }
      const subjects = ["x", "y", "z", "w"].flatMap((t) => [`s:n-${t}`, `s:m-${t}`]);
      for (const p of record.flat())
        for (const s of subjects) {
          const got = await rt.run(rt.adapter.getByEntity(s, at(p)));
          expect(key(got)).toBe(key(oracleAt(rt.broker.segmentPath, p, far(), (row) => row.entity_id === s)));
        }
      writeJson("check5-nested.json", { positions: record, frames: [...new Set(record.flat().map((p: number) => Math.floor(p / 1024)))] });
    } finally {
      await rt.dispose();
      await rt.broker.close();
    }
  });

  it("a burned LSN names nothing, stays empty after later commits, and is listed aborted in the feed", async () => {
    const dir = freshDir("c5-burn");
    const scope = `v-p2q-c5c:${randomUUID()}`;
    const rt = await openRt(dir, scope);
    const before = await rt.run(rt.triples.transact(ops("s:b", 2, "pre")));
    await rt.dispose();
    await rt.broker.abandon();
    fs.appendFileSync(path.join(dir, "segment-000001.log"), Buffer.from([0x54, 0x58, 0x4c, 0x46, 0x10, 0, 0, 0, 7, 7]));
    const rt2 = await openRt(dir, scope);
    try {
      const burned = rt2.broker.abortedLsns()[0]!;
      const inside = burned * 1024 + 17;
      const first = await rt2.run(rt2.adapter.getByEntity("s:b", at(inside)));
      const later = [];
      for (let i = 0; i < 3; i++) later.push(await rt2.run(rt2.triples.transact(ops("s:b", 1, `post${i}`))));
      const second = await rt2.run(rt2.adapter.getByEntity("s:b", at(inside)));
      expect(key(first)).toBe(key(second));
      expect(key(first)).toBe(key(oracleAt(rt2.broker.segmentPath, inside, far(), (row) => row.entity_id === "s:b")));
      expect(first.length).toBe(2);
      expect(logMembers(rt2.broker.segmentPath).some((m) => m.positions.some((p) => Math.floor(p / 1024) === burned))).toBe(false);
      expect(later.every((r) => Math.floor(r.position / 1024) > burned)).toBe(true);
      const feed = new LogFeed(dir);
      let cursor = feed.start();
      const kinds: string[] = [];
      for (;;) {
        const page = feed.poll(cursor);
        if (page.resolutions.length === 0) break;
        for (const r of page.resolutions) kinds.push(`${r.kind}:${r.lsn}`);
        cursor = page.cursor;
      }
      expect(kinds).toContain(`aborted:${burned}`);
      writeJson("check5-burned.json", { before: before.position, burned, inside, kinds, laterPositions: later.map((r) => r.position) });
    } finally {
      await rt2.dispose();
      await rt2.broker.close();
    }
  });
});
