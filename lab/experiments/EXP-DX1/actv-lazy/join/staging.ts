import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import type { Store } from "../store.ts";
import type { Documents, Op } from "../../notify1/store.ts";
import { encodedHash } from "./material.ts";

export const stageActor = "lazy/join/stage";
const root = (a: string) => "join-stage:" + a;
export const stageKey = (a: string, i: number) => root(a) + ":" + i;
export type Stage = {
  attempt: string;
  cut: number;
  chunks: number;
  hash: string;
  scope: string;
  release: string;
  command: string;
};
export function stageChanges(prefix: string, changes: readonly { entityId: string }[]) {
  return changes.every((c) => c.entityId.startsWith(prefix + "join-stage:"));
}
export async function stage(
  s: Store,
  db: Documents,
  cut: number,
  id: string,
  release: string,
  parts: string[],
  afterChunk?: (attempt: string) => Promise<void>,
) {
  assert(parts.length);
  const attempt = randomUUID(),
    header: Stage = {
      attempt,
      cut,
      chunks: parts.length,
      hash: encodedHash(parts),
      scope: s.scope,
      release,
      command: id,
    };
  let batch: Op[] = [db.put(root(attempt), header)],
    bytes = 0,
    p = cut,
    writes = 0;
  async function flush() {
    if (!batch.length) return;
    // [DX-ACT1] Why: stage only unreachable bytes and require an unbroken native suffix after the source cut. Rejected: sealing through a concurrent save or exposing a partially written release.
    const r = await s.commit("join-stage:" + attempt + ":" + writes, stageActor, batch, p, {
      attempt,
      cut,
      id,
      release,
      manifest: header.hash,
    });
    p = r.position;
    writes++;
    batch = [];
    bytes = 0;
    await afterChunk?.(attempt);
  }
  for (const [i, value] of parts.entries()) {
    const size = Buffer.byteLength(value);
    assert(size <= 128 << 10, "One output chunk must fit the native body budget");
    if (bytes + size > 128 << 10) await flush();
    batch.push(db.put(stageKey(attempt, i), value));
    bytes += size;
  }
  await flush();
  return { header, predecessor: p, writes };
}
export async function checkStage(db: Documents, stage: Stage, at: number) {
  const r = await db.get<Stage>(root(stage.attempt), at);
  assert.equal(canonical(r.value), canonical(stage));
  assert.equal(r.at, stage.cut + 1);
}
export async function collectStage(s: Store, db: Documents, attempt: string) {
  assert(/^[a-f0-9-]{36}$/.test(attempt));
  for (;;) {
    const p = await s.head(),
      controls = await s.controls(p);
    // [DX-ACT1] Why: the strict predecessor fences a racing final marker. Rejected: deleting old provisional chunks merely because a wall clock elapsed.
    assert(
      !controls.releases.some((r) => r.stage?.attempt === attempt),
      "Cannot collect published values",
    );
    const head = await db.row<Stage>(root(attempt), p);
    if (!head) return;
    assert(head.value.scope === s.scope && head.value.attempt === attempt);
    const keys = Array.from({ length: head.value.chunks }, (_, i) => stageKey(attempt, i));
    const ops: Op[] = [];
    for (let i = 0; i < keys.length; i += 64)
      for (const row of (await db.rows<string>(keys.slice(i, i + 64), p)).values())
        ops.push({ op: "retract", id: row.id });
    ops.push({ op: "retract", id: head.id });
    assert(Buffer.byteLength(canonical(ops)) <= 1024 * 1024);
    try {
      await s.commit("join-stage-collect:" + attempt, stageActor, ops, p, {
        attempt,
        header: sha256(canonical(head.value)),
      });
      return;
    } catch (error) {
      if ((await s.head()) === p) throw error;
    }
  }
}
