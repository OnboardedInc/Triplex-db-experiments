import assert from "node:assert/strict";
import { deepOwnFacts, string } from "../../../../bench/lib/deep-world.ts";
import { ids, subjectOf, type Fact } from "../../../../bench/lib/world.ts";
type Account = { index: number; key: string; first: number; people: number };
export const accounts: Account[] = Array.from({ length: 10 }, (_, i) => ({
  index: i,
  key: "account-" + String(i + 1).padStart(3, "0"),
  first: i * 10000,
  people: 10000,
}));
export const pooledDigest = "2720380f5b5e6f31fd632380e6ef6d16acc4d646735962d2cb908e0ab40e1146";
const catalog = "tenant:catalog",
  accountRoot = (a: Account) => "tenant:directory:" + a.key,
  shard = (a: Account, n: number) => "tenant:roster:" + a.key + ":" + Math.floor(n / 256);
// [DX-W1] Why: preserve the exact pooled Interference seed from SCALE1 1f710e73, including directory facts and references.
// Rejected: prefixing arbitrary entity names (changes the workload and cannot reproduce its frozen input hash).
function move(e: string, delta: number) {
  if (!delta) return e;
  const s = subjectOf(e);
  if (s === null) return e;
  return e.replace(
    /^([a-z0-9]+:)\d{8}/,
    (_, prefix: string) => prefix + String(s + delta).padStart(8, "0"),
  );
}
function mapped(f: Fact, by: number): Fact {
  return {
    e: move(f.e, by),
    a: f.a,
    v: f.v.type === "ref" ? { ...f.v, value: move(String(f.v.value), by) } : f.v,
  };
}
// [DX-SCALE1] Why: explicit subject tenant keys and an atomic, paged membership index serve cross-account counts at the same physical cut. Rejected: inferring tenancy only from a subject-number range, or claiming a count from planned seed totals.
export function tenantRows(a: Account, local: number): Fact[] {
  assert(local >= 0 && local < a.people);
  const subject = a.first + local;
  const rows = deepOwnFacts(local).map((f) => mapped(f, a.first));
  rows.push(
    { e: ids.placement(subject), a: ":subject/account", v: string(a.key) },
    { e: shard(a, local), a: ":tenant/member", v: string(ids.placement(subject)) },
  );
  if (local % 256 === 0)
    rows.push({ e: accountRoot(a), a: ":tenant/shard", v: string(shard(a, local)) });
  if (local === 0) rows.push({ e: catalog, a: ":tenant/account", v: string(a.key) });
  return rows;
}
