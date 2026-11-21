import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";

const protectedField = ":privacy/field";
const quietField = ":privacy/control";
const guardUnavailable = (cause: unknown): boolean => {
  if (!cause || typeof cause !== "object") return false;
  const error = cause as { code?: string; cause?: unknown };
  return (
    error.code === "ErasureFrontierUnavailable" ||
    (error.cause !== error && guardUnavailable(error.cause))
  );
};
async function available<T>(read: () => Promise<T>) {
  const deadline = performance.now() + 35_000;
  for (;;) {
    try {
      return await read();
    } catch (e) {
      if (!guardUnavailable(e) || performance.now() >= deadline) throw e;
      await delay(1);
    }
  }
}
const at = () => performance.timeOrigin + performance.now();
const stats = (samples: readonly { ms: number }[]) => {
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  return {
    n: sorted.length,
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p99: sorted[Math.ceil(sorted.length * 0.99) - 1],
  };
};

export async function quietNeighbours(
  f: { db: string; scope: string; comp: CompositionHandle },
  nonce: string,
  diag: (action: string, input: object) => Promise<any>,
  output: (name: string, value: unknown) => void,
  reportTiming: boolean,
) {
  const saves = reportTiming ? 500 : 8;
  const peer = new DatomicClient(process.env.DATOMIC_URL!, 35_000);
  let serial = 0;
  const business = (entityId: string, attribute: string, value: string) => ({
    op: "assert" as const,
    entityId,
    attribute,
    value: { type: "string" as const, value },
    validFrom: SEED_VALID_FROM,
  });
  type Ops = Parameters<CompositionHandle["transact"]>[0];
  async function write(ops: Ops, actor: string) {
    const commandId = `neighbours-${nonce}-${++serial}`;
    return available(async () => {
      const result = await f.comp.transact(ops, { commandId, actor });
      if (!result.ok) throw result.error ?? Error(result.tag);
      return { commandId, receipt: result.value };
    });
  }
  try {
    const saved = await peer.erasureFrontier(f.db);
    assert(saved.protected && saved.seq === 0);
    const population = [0, 1, 2, 3];
    const qualified = (entity: string) => `acct/b/${entity}`;
    const roots = population.map((i) => qualified(ids.placement(i)));
    for (const member of population)
      await write(
        deepOwnFacts(member).map((row) => ({
          op: "assert" as const,
          entityId: qualified(row.e),
          attribute: row.a,
          value: row.v.type === "ref" ? { ...row.v, value: qualified(row.v.value) } : row.v,
          validFrom: SEED_VALID_FROM,
        })),
        "quiet-seed",
      );
    const victims = Array.from({ length: 128 }, (_, i) =>
      business(`acct/a/person-${i}`, protectedField, `a-planted-${nonce}-${i}`),
    );
    const initial = await write(victims, "removal-seed");
    const assertionIds = initial.receipt.triples.map((row) => row.id);
    assert.equal(new Set(assertionIds).size, victims.length);
    assert.deepEqual(
      initial.receipt.triples.map((row) => row.entityId).sort(),
      victims.map((row) => row.entityId).sort(),
    );
    const pin = { recordedPosition: initial.receipt.position, validAt: SEED_VALID_FROM };
    const pinned = new Map<string, string>();
    for (const subject of roots)
      pinned.set(subject, canonicalWorld((await f.comp.pull(subject, pin)).triples));
    for (const rows of pinned.values()) assert(rows.length > 5);
    const prior = new Map<string, string>();
    const sample = (start: number) => {
      const end = at();
      return { start, end, ms: end - start };
    };
    const block = async (name: string, interfere?: () => Promise<unknown>) => {
      let active = true;
      const started = Promise.withResolvers<void>();
      const reads: ReturnType<typeof sample>[] = [],
        feed: ReturnType<typeof sample>[] = [],
        writes: ReturnType<typeof sample>[] = [];
      const acks = new Map<number, string>(),
        delivered = new Map<number, readonly string[]>();
      let offset = String(BigInt((await peer.basis(f.db)).t.v as string) + 1n);
      const pullFeed = async () => {
        const begin = at();
        const page = await available(() => peer.log(f.db, offset, 32, 0));
        const timing = sample(begin);
        assert.equal(page.fromT, offset);
        for (const row of page.rows) {
          assert(BigInt(row.t) >= BigInt(offset));
          if (row.kind === "commit")
            for (const position of row.transaction.positions)
              delivered.set(Number(position), row.transaction.txIds);
        }
        assert(!JSON.stringify(page).includes(`a-planted-${nonce}`));
        assert(BigInt(page.nextT) >= BigInt(offset));
        offset = page.nextT;
        return timing;
      };
      let failure: unknown;
      const readers = [
        ...roots.map(async (subject) => {
          while (active) {
            const begin = at();
            const found = await available(() => f.comp.pull(subject, pin));
            reads.push(sample(begin));
            assert.equal(canonicalWorld(found.triples), pinned.get(subject));
          }
        }),
        (async () => {
          while (active) feed.push(await pullFeed());
        })(),
      ].map((job) =>
        job.catch((e) => {
          failure = e;
          active = false;
        }),
      );
      const competing = started.promise.then(async () => {
        if (!interfere) return;
        const start = at();
        const observed = await interfere();
        return { ...sample(start), observed };
      });
      // A failed neighbouring task is returned by the attempted block before another arm starts.
      let errorFromInterference: unknown;
      const noise = competing.catch((e) => {
        errorFromInterference = e;
        active = false;
      });
      try {
        let head = pin.recordedPosition;
        for (let i = 0; i < saves && active; i++) {
          const owner = roots[i % roots.length]!;
          const old = prior.get(owner);
          const want = `quiet-${i}`;
          const begin = at();
          const pending = write(
            [
              ...(old ? [{ op: "retract" as const, id: old }] : []),
              business(owner, quietField, want),
            ],
            "quiet-save",
          );
          started.resolve();
          const { receipt, commandId } = await pending;
          writes.push(sample(begin));
          assert(receipt.position > head && !acks.has(receipt.position));
          assert(receipt.triples.length === 1);
          const row = receipt.triples[0]!;
          assert(
            row.entityId === owner &&
              row.attribute === quietField &&
              row.value.type === "string" &&
              row.value.value === want,
          );
          assert(row.id !== old && commandId.startsWith(`neighbours-${nonce}-`));
          head = receipt.position;
          prior.set(owner, row.id);
          acks.set(head, receipt.txId);
        }
      } finally {
        started.resolve();
        active = false;
        await Promise.all(readers);
      }
      const observed = await noise;
      if (failure || errorFromInterference) throw failure ?? errorFromInterference;
      for (let i = 0; i < 200 && [...acks.keys()].some((p) => !delivered.has(p)); i++)
        await pullFeed();
      for (const [position, tx] of acks)
        assert(delivered.get(position)?.includes(tx), "Quiet save absent from the actual feed");
      assert.equal(writes.length, saves);
      assert(reads.length && feed.length);
      if (interfere)
        assert(observed && writes.some((s) => s.start <= observed.end && s.end >= observed.start));
      const summary = { writes: stats(writes), reads: stats(reads), feed: stats(feed) };
      if (reportTiming)
        output(`quiet-${name}`, {
          summary,
          writes,
          reads,
          feed,
          observed,
          acknowledgements: [...acks],
        });
      else
        output(`quiet-${name}`, {
          reads: reads.length,
          feed: feed.length,
          overlapped: Boolean(interfere),
          acknowledgements: [...acks],
        });
      return summary;
    };
    const first = await block("before");
    const erasing = await block("removal", async () => {
      const removed = await peer.erase(
        f.db,
        `quiet-removal-${nonce}`,
        assertionIds.slice(0, 100).map((id) => ({ id })),
      );
      assert.deepEqual(
        removed.identities.map((row) => row.assertionId).sort(),
        assertionIds.slice(0, 100).sort(),
      );
      const hold = await peer.rows(f.db, { entityIds: [victims[0]!.entityId], basis: pin });
      const marker = hold.find((row) => row.id === assertionIds[0]);
      assert(marker?.value_type === "erased" && marker.value_string === null);
      return removed;
    });
    const middle = await block("middle");
    const cleaning = await block("cleanup", async () => {
      const selected = assertionIds.slice(0, 100);
      const job = await diag("ciphertext-cleanup", { scope: f.scope, ids: selected });
      assert.deepEqual(job.ids, selected);
      assert.equal(job.matched, selected.length);
      assert(job.matched <= 2000 && job.requestedIndex !== undefined);
      return job;
    });
    const last = await block("after");
    const ratio = (arm: typeof erasing, control: typeof first) => {
      return Object.fromEntries(
        (["writes", "reads", "feed"] as const).map((metric) => {
          assert(arm[metric].p99 && control[metric].p99);
          return [metric, arm[metric].p99 / control[metric].p99];
        }),
      );
    };
    output(
      "quiet-comparison",
      reportTiming
        ? {
            database: f.db,
            pin,
            saves,
            bar: 1.25,
            removal: [ratio(erasing, first), ratio(erasing, middle)],
            cleanup: [ratio(cleaning, middle), ratio(cleaning, last)],
          }
        : { database: f.db, pin, saves, blocks: 5 },
    );
  } finally {
    peer.close();
  }
}
