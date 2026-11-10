import type { Receipt } from "./composition.ts";
import { memberOf } from "./world.ts";
// [DX-H3] Why: normalization can reorder blob keys without changing the value or its assertion identity.
// Rejected: JSON-string object equality (the real oracle case lost blob assertion IDs).
export function alignAssertIds(operations: readonly any[], receipt: Receipt): (string | null)[] {
  const pool = new Map<string, string[]>();
  for (const t of receipt.triples) {
    const key = memberOf(t.entityId, t.attribute, t.value);
    const ids = pool.get(key) ?? [];
    ids.push(t.id);
    pool.set(key, ids);
  }
  return operations.map((op) =>
    op.op === "assert"
      ? (pool.get(memberOf(op.entityId, op.attribute, op.value))?.shift() ?? null)
      : null,
  );
}
