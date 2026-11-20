import assert from "node:assert/strict";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ImportRun, pace } from "../import1/lane.ts";
import { openNative } from "../import1/native.ts";
import { bytes, sha, snapshot, type Source } from "../import1/source.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { activate } from "../int1/activation.ts";
import { Account } from "../int1/account.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { deepOwnFacts, taskId } from "../../../bench/lib/deep-world.ts";
import { pageNamespace } from "../../../bench/lib/w0-page-outbox.ts";
import { openComposition } from "../../../bench/lib/composition.ts";

const wall = () => performance.timeOrigin + performance.now();
type RunErase = () => Promise<{
  sentAt: number;
  receivedAt: number;
  window: { start: number; end: number };
}>;

// [DX-ERASE1] Why: compare the real import's durable frames and prove their overlap with native indexing.
// Rejected: placing a synthetic sleep between bulk writes and counting it as import work.
export async function importWork(
  scope: string,
  generation: string,
  dir: string,
  load: (erasing: (start: RunErase) => Promise<unknown>) => Promise<unknown>,
) {
  const target = await openNative(scope, "snapshot");
  try {
    async function go(label: string, startErase?: RunErase) {
      const source = snapshot("deep", 160, `erase-${label}/`, generation);
      const run = await ImportRun.open(
        target,
        source,
        pace(512, 1),
        path.join(dir, `import-${label}.sqlite`),
      );
      const frames: {
        first: number;
        end: number;
        start: number;
        ack: number;
        txId: string;
        changes: number;
        serviceMs: number;
      }[] = [];
      let pending: ReturnType<RunErase> | undefined;
      try {
        for (;;) {
          let start = 0,
            ack = 0;
          const item = await run.step({
            beforeWrite: () => {
              start = wall();
              if (startErase && !pending) pending = startErase();
            },
            afterWrite: () => {
              ack = wall();
            },
          });
          if (!item) break;
          assert(start > 0 && ack >= start);
          frames.push({
            first: item.first,
            end: item.end,
            start,
            ack,
            txId: item.txId,
            changes: item.facts,
            serviceMs: item.serviceMs,
          });
        }
        assert.equal(frames.at(-1)?.end, source.header.groups);
        const result = await pending;
        const crossing = result
          ? frames.filter((r) => r.start < result.window.end && r.ack > result.window.start)
          : [];
        if (result)
          assert(crossing.length, "The import had no frame touching the excision index interval");
        return { seal: source.header.seal, scope: target.scopeName, frames, crossing, result };
      } finally {
        await pending?.catch(() => undefined);
        run.close();
      }
    }
    const control = await go("control");
    const arm = await load((start) => go("overlap", start));
    return { control, arm };
  } finally {
    await target.close();
  }
}

// [DX-ERASE1] Why: hold the actual INT1 Publish after it takes a cut, then verify the durable outbox the old projection produces.
// Rejected: using an empty test Publish or treating only the value's removal in Datomic as enough to fence old decisions.
export async function publishWork(
  scope: string,
  binding: string,
  dir: string,
  exercise: (
    comp: Awaited<ReturnType<typeof openComposition>>,
    group: {
      people: number[];
      depths: number[];
      journal: string[];
      positions: number[];
      values: string[][];
    },
    overlap: (start: RunErase) => Promise<unknown>,
  ) => Promise<unknown>,
) {
  const comp = await openComposition("reach", "datomic", scope);
  const db = new DatabaseSync(path.join(dir, "publisher.sqlite"));
  const account = new Account(comp, "deep", binding, 0, 320, db);
  process.env.TX2_W0_OUTBOX_NAMESPACE = pageNamespace("erase1");
  try {
    const i = 0;
    const before = deepOwnFacts(i).find((f) => f.e === taskId(i, 0) && f.a === ":task/field-0");
    assert(before?.v.type === "string");
    const value = before.v.value;
    await account.seed([i]);
    const position = account.head;
    const seed = (await comp.feedPage(position - 1, 1)).transactions[0];
    assert(seed.position === position && typeof seed.txId === "string");
    for (let first = 1; first < account.count; first += 8)
      await account.seed(
        Array.from({ length: Math.min(8, account.count - first) }, (_, j) => first + j),
      );
    const cut = account.head;
    return await exercise(
      comp,
      { people: [i], depths: [0], journal: [seed.txId], positions: [position], values: [[value]] },
      async (runErase) => {
        const started = wall();
        let pause: Promise<void> | undefined;
        let erase: Awaited<ReturnType<RunErase>> | undefined;
        const publish = await activate(account, dir, W0.R1, cut, () => {
          pause ??= runErase().then((result) => {
            erase = result;
          });
          return pause;
        });
        assert(erase && erase.sentAt >= started && erase.receivedAt <= wall());
        assert.equal(publish.cut.basis.tx, cut);
        assert.equal(publish.covered, account.count);
        assert.equal(publish.guardReadbacks, account.count);
        const retained = db.prepare("SELECT body FROM outboxes WHERE i=?").get(i);
        assert(retained);
        const body = JSON.parse(String(retained.body));
        const cached = (await account.world(i, cut)).facts.some((f) => f.v === value);
        assert(cached, "Old Publish input differed from the seeded protected marker");
        return {
          publish,
          started,
          finished: wall(),
          erase,
          retained: {
            items: body.items?.length,
            pending: body.pending?.length,
            projectedValue: cached,
            outboxValue: String(retained.body).includes(value),
          },
          onlineTraffic: "Publish held at first checkpoint, resumed after sync-excise",
        };
      },
    );
  } finally {
    db.close();
    await comp.close();
  }
}

// [DX-ERASE1] Why: a late archive entry can arrive after physical removal.
// Rejected: retrying bare d/transact, which would bypass the import's receipt/checkpoint path.
export async function replayErased(
  scope: string,
  generation: string,
  dir: string,
  entityId: string,
  value: string,
) {
  const target = await openNative(scope, "snapshot");
  const group = {
    ordinal: 0,
    id: "late-erased-archive",
    ops: [
      {
        op: "assert" as const,
        ref: "archived-field",
        entityId,
        attribute: ":task/field-0",
        value: { type: "string" as const, value },
        validFrom: SEED_VALID_FROM,
      },
    ],
  };
  const source: Source = {
    header: {
      source: group.id,
      generation,
      mode: "snapshot",
      groups: 1,
      validAt: SEED_VALID_FROM,
      seal: sha(bytes(group)),
    },
    group(i) {
      assert.equal(i, 0);
      return group;
    },
  };
  try {
    const run = await ImportRun.open(
      target,
      source,
      pace(8, 1),
      path.join(dir, "import-late.sqlite"),
    );
    try {
      const entry = await run.step();
      assert(entry);
      assert.equal(await run.step(), undefined);
      const record = await run.lookup(entry.command);
      const [change] = record?.changes ?? [];
      assert(
        record?.position === entry.position &&
          record.txId === entry.txId &&
          entityId === change?.entityId &&
          change.value.value === value,
      );
      return { receipt: entry, valueReintroduced: true, sourceSeal: source.header.seal };
    } finally {
      run.close();
    }
  } finally {
    await target.close();
  }
}
