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
  return JSON.parse(fs.readFileSync(file, "utf8"));
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
  const valid =
    memo?.version === 1 &&
    memo.scope === o.scope &&
    memo.releaseHash === o.releaseHash &&
    canonical(memo.basis) === canonical(o.previewBasis) &&
    memo.basis.validAt === o.basis.validAt &&
    memo.basis.position <= o.basis.position;
  if (!valid)
    return {
      reused,
      affected: [...o.subjects],
      changedEntities: 0,
      largestFanout: 0,
      fallback: true,
    };
  const dependencies = new Map<string, Set<string>>();
  for (const subject of o.subjects) {
    const r = memo.entries[subject];
    if (
      !r ||
      r.subject !== subject ||
      r.releaseHash !== o.releaseHash ||
      canonical(r.basis) !== canonical(memo.basis) ||
      canonical(r.output?.basis) !== canonical(w0Basis(memo.basis)) ||
      canonical(r.record?.basis) !== canonical(w0Basis(memo.basis)) ||
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
    for (const entity of r.closure) {
      const subjects = dependencies.get(entity) ?? new Set<string>();
      subjects.add(subject);
      dependencies.set(entity, subjects);
    }
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
  let largestFanout = 0;
  for (const entity of changed) {
    const subjects = dependencies.get(entity);
    largestFanout = Math.max(largestFanout, subjects?.size ?? 0);
    for (const subject of subjects ?? []) affected.add(subject);
  }
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
