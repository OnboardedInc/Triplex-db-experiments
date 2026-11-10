import fs from "node:fs";
import type { CompositionHandle } from "./composition.ts";
import { W0, canonical, sha256, w0Basis, isReference, type PositionBasis } from "./w0-world.ts";

export interface PreviewMemo {
  version: 1;
  scope: string;
  releaseHash: string;
  basis: PositionBasis;
  entries: Record<string, any>;
}
// [DX-H8] Why: include empty reference targets too; their first later fact changes an already reached entity.
// Rejected: listing only entities with visible rows (misses absent-to-present referenced worlds).
export function memoEntry(r: any, basis: PositionBasis, releaseHash: string) {
  const closure = new Set<string>([r.subject]);
  for (const f of r.world.facts) {
    closure.add(f.e);
    if (isReference(f.a) && typeof f.v === "string") closure.add(f.v);
  }
  return {
    subject: r.subject,
    basis,
    releaseHash,
    closure: [...closure].sort(),
    worldSha256: sha256(canonical(r.world)),
    output: r.output,
    record: r.record,
  };
}
export function saveMemo(file: string, memo: PreviewMemo) {
  fs.writeFileSync(file + ".tmp", canonical(memo));
  fs.renameSync(file + ".tmp", file);
}
export function loadMemo(file: string): PreviewMemo | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    if (e instanceof SyntaxError) return undefined;
    throw e;
  }
}
export async function selectMemo(o: {
  comp: CompositionHandle;
  memo?: PreviewMemo;
  scope: string;
  releaseHash: string;
  previewBasis: PositionBasis;
  basis: PositionBasis;
  subjects: readonly string[];
}) {
  const reused = new Map<string, any>(),
    affected = new Set<string>();
  const memo = o.memo;
  const sameBasis = (a: any, b: PositionBasis) =>
    a?.position === b.position && a?.validAt === b.validAt;
  const sameOutputBasis = (a: any, b: PositionBasis) =>
    a?.tx === b.position && a?.validTime === w0Basis(b).validTime;
  const valid =
    memo?.version === 1 &&
    memo.scope === o.scope &&
    memo.releaseHash === o.releaseHash &&
    sameBasis(memo.basis, o.previewBasis) &&
    memo.basis.validAt === o.basis.validAt &&
    memo.basis.position <= o.basis.position &&
    !!memo.entries &&
    typeof memo.entries === "object" &&
    !Array.isArray(memo.entries);
  if (!valid)
    return {
      reused,
      affected: [...o.subjects],
      changedEntities: 0,
      largestFanout: 0,
      fallback: true,
    };
  const validEntries: any[] = [];
  for (const subject of o.subjects) {
    const r = memo.entries[subject];
    if (
      !r ||
      r.subject !== subject ||
      r.releaseHash !== o.releaseHash ||
      !sameBasis(r.basis, memo.basis) ||
      !sameOutputBasis(r.output?.basis, memo.basis) ||
      !sameOutputBasis(r.record?.basis, memo.basis) ||
      r.output?.release !== o.releaseHash ||
      r.record?.release !== o.releaseHash ||
      r.output?.subject !== subject ||
      r.record?.subject !== subject ||
      !Array.isArray(r.closure) ||
      !r.closure.includes(subject) ||
      r.closure.some((e: any) => typeof e !== "string") ||
      !/^[a-f0-9]{64}$/.test(r.worldSha256)
    ) {
      affected.add(subject);
      continue;
    }
    validEntries.push(r);
  }
  const changed = new Set<string>();
  let after = memo.basis.position;
  // [DX-H8] Why: consume the complete ordered interval through B1, excluding later transactions.
  // Rejected: stopping on an empty page before B1 or counting only the last writer's subjects.
  while (after < o.basis.position) {
    const page = await o.comp.feedPage(after, 100);
    if (!page.transactions.length) throw Error("memo change feed ended before B1");
    for (const tx of page.transactions) {
      if (tx.position > o.basis.position) break;
      if (tx.position !== after + 1 || !Array.isArray(tx.changes))
        throw Error("memo feed gap/order");
      after = tx.position;
      for (const c of tx.changes) {
        if (typeof c.entityId !== "string") throw Error("memo feed missing changed entity");
        changed.add(c.entityId);
      }
    }
  }
  // [DX-H8] Why: one activation needs only membership in its changed set, not a reverse Set for every unchanged entity.
  // Rejected: allocating 145k dependency sets per 1k subjects (404 ms measured controller CPU).
  const fanouts = new Map<string, number>();
  for (const r of validEntries) {
    let matches: Set<string> | undefined;
    for (const entity of r.closure)
      if (changed.has(entity) && !matches?.has(entity)) {
        (matches ??= new Set()).add(entity);
        affected.add(r.subject);
        fanouts.set(entity, (fanouts.get(entity) ?? 0) + 1);
      }
  }
  let largestFanout = 0;
  for (const count of fanouts.values()) largestFanout = Math.max(largestFanout, count);
  // [DX-H8] Why: W0 uses tx only to validate fact positions and label output/record basis; time and release stay fixed.
  // Rejected: retaining B0 labels or reusing when valid time changes (time rules could change without a write).
  const basis = w0Basis(o.basis);
  for (const subject of o.subjects)
    if (!affected.has(subject)) {
      const r = memo.entries[subject];
      reused.set(subject, {
        subject,
        worldSha256: r.worldSha256,
        output: { ...r.output, basis },
        record: { ...r.record, basis },
      });
    }
  return {
    reused,
    affected: [...affected].sort(),
    changedEntities: changed.size,
    largestFanout,
    fallback: false,
  };
}
