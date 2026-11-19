import assert from "node:assert/strict";
import fs from "node:fs";
import {
  Account,
  immutable,
  errorCode,
  type Receipt,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { clock, root, sleep, until } from "./common.ts";
import type { Stack } from "./stack.ts";
export { Account, immutable, errorCode };
export type { Receipt };
export type State = {
  database: string;
  basis: string;
  indexBasis: string | null;
  position: string;
};
export async function state(ac: Account) {
  const v = await ac.w.request<State>("GET", "/ha1/" + ac.db + "/state");
  assert(v.database === ac.db && /^\d+$/.test(v.basis) && /^\d+$/.test(v.position));
  if (v.indexBasis !== null)
    assert(/^\d+$/.test(v.indexBasis) && BigInt(v.indexBasis) <= BigInt(v.basis));
  return v;
}
export async function healthyBroker(s: Stack, role: "active" | "standby") {
  await until("serving transactor", async () => (await s.broker(role)) || undefined);
}
export async function standby(s: Stack, role: "active" | "standby") {
  const marker = await until("standby monitoring", async () => {
    const line = await s.exec(
      role,
      "sh",
      "-c",
      "grep -h ':transactor/standby' log/*.log | tail -1",
    );
    return line.includes(":transactor/standby") ? line : undefined;
  });
  assert(!(await s.broker(role)));
  return { id: (await s.view(role)).Id, marker: s.redact(marker) };
}
export async function openOne(s: Stack, ha = false, reader = false) {
  await s.tool();
  await s.postgres("pg", s.a);
  await s.database("pg", "moving");
  await s.tx("active", s.a, "pg", "moving");
  await healthyBroker(s, "active");
  if (ha) await s.tx("standby", s.b, "pg", "moving");
  await s.gateway("write", s.a, "pg", "moving");
  const w = await s.ready("write");
  if (reader) await s.gateway("read", s.a, "pg", "moving");
  const ac = new Account(s.e.prefix + "-one", w, reader ? await s.ready("read") : w);
  await ac.open();
  return ac;
}
export const pgBytes = (s: Stack) =>
  s.sql("pg", "SELECT pg_total_relation_size('datomic_kvs')", "moving").then(Number);
export async function receipts(ac: Account, list = ac.inputs, client = ac.r) {
  for (let i = 0; i < list.length; i += 256) {
    const inputs = list.slice(i, i + 256);
    const res = await client.request<{ database: string; operations: unknown[] }>(
      "POST",
      "/ha1/" + ac.db + "/operations",
      { ids: inputs.map((v) => v.operationId) },
      20000,
    );
    assert.equal(res.database, ac.db);
    assert.equal(res.operations.length, inputs.length);
    for (const [j, input] of inputs.entries())
      assert.deepEqual(immutable(res.operations[j]), ac.receipts.get(input.operationId));
  }
  return list.length;
}
export async function populate(s: Stack, ac: Account, people: number, seedBudgetMs = 540000) {
  const start = clock(),
    initial = await pgBytes(s);
  let n = 0,
    reason = "requested size",
    bytes = initial;
  while (n < people) {
    if (s.a === s.b) {
      const f = fs.statfsSync(root);
      if (
        f.bavail * f.bsize < 5 * 2 ** 30 ||
        bytes - initial > 700 * 2 ** 20 ||
        clock() - start > seedBudgetMs
      ) {
        reason =
          f.bavail * f.bsize < 5 * 2 ** 30
            ? "host disk floor"
            : bytes - initial > 700 * 2 ** 20
              ? "reserved SQL growth"
              : "local measurement window";
        break;
      }
    }
    const end = Math.min(people, n + 32);
    for (; n < end; ) {
      const batch = [];
      for (let j = 0; j < 4 && n < end; j++, n++)
        batch.push(ac.intent("seed-" + n, 160, "tenant-" + (n % 10) + "/person-" + n));
      const results = await Promise.allSettled(batch.map((v) => ac.send(v)));
      for (const r of results) if (r.status === "rejected") throw r.reason;
    }
    if (n % 256 === 0 || n === people) {
      bytes = await pgBytes(s);
      s.e.log("seed-progress", { people: n, bytes, elapsed: clock() - start });
    }
  }
  assert(n > 0);
  const acks = await receipts(ac, ac.inputs, ac.w);
  for (const i of new Set([0, Math.floor(n / 2), n - 1]))
    await ac.pinned(ac.receipts.get(ac.inputs[i]!.operationId)!);
  const result = {
    requested: people,
    people: n,
    facts: n * 160,
    tenantCount: Math.min(n, 10),
    reason,
    seedMs: clock() - start,
    bytes: await pgBytes(s),
    acknowledged: acks,
  };
  s.e.write("population", result);
  return result;
}
export async function requestIndex(ac: Account) {
  const b = await state(ac);
  const v = await ac.w.request<{ database: string; requestedT: string; completed: boolean }>(
    "POST",
    "/v2/db/" + ac.db + "/request-index",
    { waitMs: 90000 },
    95000,
  );
  assert(v.completed && v.database === ac.db && BigInt(v.requestedT) >= BigInt(b.basis));
  return { requested: v.requestedT, after: await state(ac) };
}
export function pinnedLoop(ac: Account, pin: Receipt) {
  const events: { start: number; end: number; code: string }[] = [];
  let stop = false,
    fatal: unknown;
  const done = (async () => {
    while (!stop) {
      const start = clock();
      try {
        await ac.pinned(pin);
        events.push({ start, end: clock(), code: "ok" });
      } catch (e) {
        if (!errorCode(e)) {
          fatal = e;
          break;
        }
        events.push({ start, end: clock(), code: errorCode(e)! });
      }
      await sleep(80);
    }
  })();
  return {
    events,
    async finish() {
      stop = true;
      await done;
      if (fatal) throw fatal;
      return events;
    },
  };
}
export async function verifySuffix(ac: Account, cursor: string, inputs: typeof ac.inputs) {
  const expected = inputs
    .map((i) => ac.receipts.get(i.operationId)!)
    .sort((a, b) => Number(BigInt(a.t.v) - BigInt(b.t.v)));
  const seen: string[] = [];
  let next = cursor;
  for (;;) {
    const page = await ac.r.log(ac.db, next, 12);
    for (const row of page.rows)
      if (row.kind === "commit") {
        ac.checkEntry(row);
        seen.push(row.transaction.operationId);
      }
    next = page.nextT;
    if (!page.rows.length) break;
  }
  assert.deepEqual(
    seen,
    expected.map((r) => r.operationId),
  );
  return { from: cursor, next, count: seen.length };
}
