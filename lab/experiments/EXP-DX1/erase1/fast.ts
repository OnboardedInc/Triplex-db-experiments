import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { measureW0Http } from "../../../bench/lib/w0-http.ts";

export const protectedField = ":privacy/field";
const controlField = ":privacy/control";
interface Fixture {
  db: string;
  scope: string;
  name: string;
  comp: CompositionHandle;
  position: number;
}
type Call = (op: string, data: object) => Promise<any>;
type Store = () => Promise<{ valueBytes: number; relationBytes: number; rows: number }>;
type Sample = { start: number; end: number; ms: number };
const clock = () => performance.timeOrigin + performance.now();
const sample = (start: number) => {
  const end = clock();
  return { start, end, ms: end - start };
};
function stats(samples: readonly number[]) {
  const v = [...samples].sort((a, b) => a - b);
  const at = (p: number) => v[Math.ceil(p * v.length) - 1] ?? null;
  return { n: v.length, p50: at(0.5), p99: at(0.99), max: v.at(-1) ?? null };
}
const range = (n: number) => Array.from({ length: n }, (_, j) => j);
const assertFact = (entityId: string, attribute: string, value: unknown) => ({
  op: "assert" as const,
  entityId,
  attribute,
  value,
  validFrom: SEED_VALID_FROM,
});

export async function fast(
  f: Fixture,
  people: number,
  facts: number,
  nonce: string,
  diag: Call,
  storage: Store,
  guard: () => Promise<unknown>,
  output: (name: string, data: unknown) => void,
  rounds = 100,
  saves = 500,
) {
  assert(people >= 100 && rounds >= 1 && saves >= 8);
  const client = new DatomicClient(process.env.DATOMIC_URL!, 35_000);
  const quiet = await openComposition("reach", "datomic", f.name + "-quiet");
  const qscope = String(runtimeApi.DatabaseScope.test(f.name + "-quiet"));
  const qdb = "s2-" + Buffer.from(qscope).toString("base64url");
  const quietSubjects = range(4);
  const subject = ids.placement;
  const erasedIds: string[] = [];
  const outputs: (Sample & {
    scenario: string;
    markerVerifiedMs: number;
    count: number;
    seq: number;
    identities: number;
    t: string;
    position: number;
  })[] = [];
  const transport: { responseBytes: number; requestBytes: number }[] = [];
  let clockOffset = { low: -Infinity, high: Infinity };
  client.onRequest = (r) => {
    if (r.path.endsWith("/erase"))
      transport.push({ requestBytes: r.requestBytes, responseBytes: r.responseBytes });
  };
  const assertMarker = (
    row: Awaited<ReturnType<DatomicClient["rows"]>>[number] | undefined,
    id: string,
    result: { erasedAt: number; txId: string },
  ) => {
    assert(row?.id === id && row.value_type === "erased" && row.value_string === null);
    assert.deepEqual(JSON.parse(row.value_json!), {
      type: "erased",
      valueType: "string",
      erasedAt: result.erasedAt,
      erasureTxId: result.txId,
    });
  };
  let operation = 0;
  const canary = (i: number, ver: number) =>
    "dx-sensitive-" +
    createHash("sha256")
      .update(nonce + "/" + i + "/" + ver)
      .digest("hex")
      .slice(0, 36);
  const local = { comp: f.comp, head: f.position, live: new Map<string, string>() };
  const bystander = { comp: quiet, head: 0, live: new Map<string, string>() };
  async function save(group: typeof local, subjects: number[], attribute: string) {
    const version = ++operation;
    const want = subjects.map((i) => [subject(i), canary(i, version)] as const);
    const commands = want.flatMap(([id, value]) => {
      const old = group.live.get(id + attribute);
      return [
        ...(old ? [{ op: "retract" as const, id: old }] : []),
        assertFact(id, attribute, { type: "string", value }),
      ];
    });
    const begun = clock();
    const result = await group.comp.transact(commands, {
      commandId: "fast-saved-" + version,
      actor: "privacy-timing",
    });
    const timing = sample(begun);
    if (!result.ok) throw Error("Protected save failed", { cause: result.error });
    assert.equal(result.value.position, group.head + 1);
    assert.equal(result.value.triples.length, subjects.length);
    for (const [id, value] of want) {
      const row = result.value.triples.find(
        (r) =>
          r.entityId === id &&
          r.attribute === attribute &&
          r.value.type === "string" &&
          r.value.value === value,
      );
      assert(row);
      group.live.set(id + attribute, row.id);
    }
    group.head = result.value.position;
    return {
      timing,
      version,
      txId: result.value.txId,
      position: result.value.position,
      rows: result.value.triples,
    };
  }

  async function erase(
    subjects: number[],
    label: string,
    expected: string[],
    heldId?: string,
    handle?: string,
  ) {
    const start = clock();
    const result = await client.erase(
      f.db,
      label,
      subjects.map((i) => ({ entityId: subject(i), attribute: protectedField })),
    );
    const timing = sample(start);
    assert.equal(result.position, local.head + 1);
    local.head = result.position;
    assert.equal(result.seq, outputs.length + 1);
    assert.deepEqual(result.identities.map((v) => v.assertionId).sort(), expected.toSorted());
    for (const identity of result.identities) {
      assert.equal(identity.attribute, protectedField);
      assert.equal(identity.valueType, "string");
      assert.equal(identity.validFrom, SEED_VALID_FROM);
      assert.equal(identity.validTo, null);
      assert(subjects.some((i) => identity.entity === subject(i)));
    }
    const [view] = await client.rows(f.db, {
      id: heldId ?? expected[0]!,
      history: true,
      ...(handle ? { handle } : {}),
    });
    assertMarker(view, heldId ?? expected[0]!, result);
    outputs.push({
      ...timing,
      scenario: label,
      markerVerifiedMs: clock() - start,
      count: subjects.length,
      seq: result.seq,
      identities: result.identities.length,
      t: result.t,
      position: result.position,
    });
    erasedIds.push(...expected);
    for (const i of subjects) local.live.delete(subject(i) + protectedField);
  }
  async function traffic(name: string, attribute: string, doomed: string[][] = []) {
    let running = true;
    let fail: unknown;
    const writes: Sample[] = [],
      reads: Sample[] = [],
      feed: Sample[] = [];
    const acknowledged = new Map<number, string>();
    const delivered = new Map<number, readonly string[]>();
    const jobs: {
      ids: string[];
      matched: number;
      startedAt: number;
      indexAskedAt?: number;
      finishedAt: number;
    }[] = [];
    const basis = { recordedPosition: bystander.head, validAt: SEED_VALID_FROM };
    const expected = new Map<string, string>();
    for (const i of quietSubjects) {
      const id = subject(i);
      const rows = await client.rows(qdb, { entityIds: [id], basis });
      assert(rows.length > 0);
      expected.set(id, JSON.stringify(rows));
    }
    let offset = String(BigInt((await client.basis(qdb)).t.v as string) + 1n);
    async function nextFeed(waitMs: number) {
      const began = clock();
      const page = await client.log(qdb, offset, 16, waitMs);
      const timing = sample(began);
      assert.equal(page.fromT, offset);
      let next = BigInt(offset);
      for (const row of page.rows) {
        assert(BigInt(row.t) >= next);
        assert(!JSON.stringify(row).includes("dx-sensitive-"));
        if (row.kind === "commit")
          for (const p of row.transaction.positions)
            delivered.set(Number(p), row.transaction.txIds);
        next = BigInt(row.t) + 1n;
      }
      assert.equal(page.nextT, String(next));
      offset = page.nextT;
      return timing;
    }
    const before = await storage();
    const requestBytes = await measureW0Http(async () => {
      const streams = [
        ...quietSubjects.map(async (i) => {
          const id = subject(i);
          while (running) {
            const began = clock();
            const rows = await client.rows(qdb, { entityIds: [id], basis });
            reads.push(sample(began));
            assert.equal(JSON.stringify(rows), expected.get(id));
          }
        }),
        (async () => {
          while (running) feed.push(await nextFeed(0));
        })(),
        (async () => {
          for (const batch of doomed) {
            if (!running) break;
            const job = await diag("ciphertext-cleanup", { scope: f.scope, ids: batch });
            assert.deepEqual(job.ids, batch);
            assert(
              job.matched === batch.length &&
                job.matched <= 2000 &&
                job.requestedIndex !== undefined,
            );
            jobs.push(job);
            await delay(150);
          }
        })(),
      ].map((p) =>
        p.catch((error) => {
          fail ??= error;
          running = false;
        }),
      );
      try {
        for (let i = 0; i < saves && running; i++) {
          const ack = await save(bystander, [quietSubjects[i % quietSubjects.length]!], attribute);
          writes.push(ack.timing);
          acknowledged.set(ack.position, ack.txId);
          if ((i + 1) % 100 === 0) await guard();
        }
      } finally {
        running = false;
        await Promise.all(streams);
      }
    });
    if (fail) throw fail;
    assert.equal(writes.length, saves);
    for (let page = 0; delivered.size < acknowledged.size && page < 60; page++) await nextFeed(100);
    for (const [p, txId] of acknowledged)
      assert(delivered.get(p)?.includes(txId), "Feed did not verify the actual save");
    if (doomed.length) assert(jobs.length && jobs.some((j) => j.indexAskedAt !== undefined));
    const latest = await client.rows(qdb, { id: bystander.live.get(subject(0) + attribute) });
    assert(
      latest[0]?.value_type === "string" && latest[0].value_string?.startsWith("dx-sensitive-"),
    );
    const after = await storage();
    const min = (items: Sample[]) => stats(items.map((r) => r.ms));
    const indexed = (items: Sample[]) =>
      min(
        items.filter((r) =>
          jobs.some(
            (j) =>
              j.indexAskedAt !== undefined &&
              r.start >= j.indexAskedAt + clockOffset.high &&
              r.end <= j.finishedAt + clockOffset.low,
          ),
        ),
      );
    const calls = requestBytes.samples.filter((r) => String(r.path).endsWith("/transact"));
    const summary = {
      writes: min(writes),
      reads: min(reads),
      feed: min(feed),
      savesReplayed: acknowledged.size,
      during: { writes: indexed(writes), reads: indexed(reads), feed: indexed(feed) },
      jobs: jobs.map(({ ids, ...j }) => ({ count: ids.length, ...j })),
      wire: {
        request: stats(calls.map((r) => Number(r.requestBytes))),
        response: stats(calls.map((r) => Number(r.responseBytes))),
      },
      nativeDatomsPerSave: requestBytes.datomSamples === saves ? requestBytes.datoms / saves : null,
      storageBytesPerSave: (after.valueBytes - before.valueBytes) / writes.length,
    };
    output("fast-traffic-" + name, { writes, reads, feed, jobs, before, after, summary });
    return summary;
  }

  try {
    await client.declareProtection(qdb, [protectedField], true);
    const seeded = await quiet.transact(
      quietSubjects.flatMap((i) => deepOwnFacts(i).map((r) => assertFact(r.e, r.a, r.v))),
      { commandId: "quiet-seed", actor: "privacy-timing" },
    );
    assert(seeded.ok && seeded.value.position === 1);
    bystander.head = seeded.value.position;
    const warmIndex = await diag("index", { scope: f.scope });
    assert(warmIndex.basis >= warmIndex.t);
    const first = await save(local, [0], protectedField);
    const original = first.rows[0]!;
    const retained = await client.begin(f.db);
    const agedIds = [original.id];
    try {
      const [preErase] = await client.rows(f.db, {
        id: original.id,
        history: true,
        handle: retained.handle,
      });
      assert(preErase?.id === original.id && preErase.value_string === canary(0, first.version));
      let retractionPosition: number | undefined;
      for (let i = 0; i < 415; i++) {
        const edited = await save(local, [0], protectedField);
        retractionPosition ??= edited.position;
        agedIds.push(edited.rows[0]!.id);
      }
      const [retired] = await client.rows(f.db, { id: original.id, history: true });
      assert(retired?.id === original.id && retired.value_string === canary(0, first.version));
      const inventory = await diag("ciphertext-inventory", {
        scope: f.scope,
        id: original.id,
        canary: canary(0, first.version),
        assertionPosition: first.position,
        retractionPosition,
      });
      assert(
        inventory.id === original.id &&
          inventory.body &&
          inventory.keyBytes === 32 &&
          inventory.unsealed &&
          !inventory.plaintext &&
          BigInt(inventory.nativeT) < BigInt(inventory.retirementT) &&
          inventory.references >= 2 &&
          inventory.retirementReferences >= 1,
      );
      output("fast-inventory", inventory);
      await erase([0], "aged-person", agedIds, original.id, retained.handle);
      const after = outputs[0]!.end;
      for (let attempt = 0; ; attempt++) {
        const observed = await diag("key-state", { scope: f.scope, id: original.id });
        assert(observed.id === original.id && observed.seq === 1 && observed.bodyPresent);
        if (!observed.keyPresent) {
          output("fast-key-absence", { ...observed, observedByMsAfterAck: clock() - after });
          break;
        }
        assert(attempt < 100, "Published key remained available to the independent worker");
        await delay(100);
      }
    } finally {
      await client.release(f.db, retained.handle);
    }
    const batch = range(100);
    for (let i = 0; i < rounds; i++) {
      for (const people of [[0], batch]) {
        const { rows } = await save(local, people, protectedField);
        await erase(
          people,
          "fresh-" + people.length + "-" + i,
          rows.map((r) => r.id),
        );
      }
      if ((i + 1) % 10 === 0) await guard();
    }
    assert.equal(transport.length, outputs.length);
    output("fast-publication", { warmIndex, outputs, wire: transport });

    const alignment = [];
    for (let i = 0; i < 5; i++) {
      const a = clock();
      const { now } = await diag("clock", {});
      alignment.push({ low: a - now, high: clock() - now });
    }
    clockOffset = alignment.sort((a, b) => a.high - a.low - (b.high - b.low))[0]!;
    assert(clockOffset.high - clockOffset.low < 200);
    output("fast-clock-offset", { alignment, clockOffset });
    const a = await traffic("control-before", controlField);
    const cleanupBatches = Array.from({ length: Math.ceil(erasedIds.length / 128) }, (_, i) =>
      erasedIds.slice(i * 128, (i + 1) * 128),
    );
    const b = await traffic("cleanup", controlField, cleanupBatches);
    const a2 = await traffic("control-after", controlField);
    const p = await traffic("protected-save", protectedField);
    const more: { ids: string[]; matched: number }[] = [];
    for (
      let start = b.jobs.reduce((n, job) => n + job.count, 0);
      start < erasedIds.length;
      start += 2000
    ) {
      const ids = erasedIds.slice(start, start + 2000);
      const job = await diag("ciphertext-cleanup", { scope: f.scope, ids });
      assert.deepEqual(job.ids, ids);
      assert.equal(job.matched, ids.length);
      more.push(job);
      await guard();
      await delay(150);
    }
    output("fast-remaining-cleanup", more);
    const ratio = (key: "writes" | "reads" | "feed") => {
      assert(a[key].p99 && a2[key].p99 && b[key].p99);
      return [b[key].p99 / a[key].p99, b[key].p99 / a2[key].p99];
    };
    output("fast-result", {
      facts,
      single: stats(outputs.filter((r) => r.scenario.startsWith("fresh-1-")).map((r) => r.ms)),
      hundred: stats(outputs.filter((r) => r.scenario.startsWith("fresh-100-")).map((r) => r.ms)),
      aged: outputs[0],
      a,
      b,
      a2,
      protectedSave: p,
      ratios: { saves: ratio("writes"), reads: ratio("reads"), feed: ratio("feed") },
    });
  } finally {
    await quiet.close();
    client.close();
  }
}
