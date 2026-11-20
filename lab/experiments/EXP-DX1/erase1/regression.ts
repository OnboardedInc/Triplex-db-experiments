import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  DatomicClient,
  Replica,
  datomicReplicaSource,
} from "../../../../packages/datomic/dist/index.js";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { taskId } from "../../../bench/lib/deep-world.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { Documents, hash, unpack } from "../notify1/store.ts";
import { Dispatcher, type Packet } from "../notify1/dispatcher.ts";
import { Fixture as NoticeFixture } from "../notify1/fixture.ts";
import { Notices } from "../notify1/journal.ts";
import { openStore, fact } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";
import { W0, triplexValue } from "../../../bench/lib/w0-world.ts";
import { publishWork, replayErased } from "./scenarios.ts";

interface Fixture {
  name: string;
  scope: string;
  db: string;
  comp: CompositionHandle;
  position: number;
}
type Witness = {
  entityId: string;
  assertionId: string;
  attribute: string;
  value: string;
  txId: string;
};
type Cut = { t: string; erasedAt: number; assertionId: string; seq?: number };
type Call = (op: string, data: object) => Promise<any>;
type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
type Evidence = { route: string; check: boolean; detail: Record<string, unknown> };

function marker(v: unknown, erasedAt: number): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    "type" in v &&
    v.type === "erased" &&
    "erasedAt" in v &&
    v.erasedAt === erasedAt
  );
}

function maskedRow(row: Row | undefined, id: string, erasedAt: number) {
  if (row?.id !== id || row.value_type !== "erased") return false;
  if (typeof row.value_json !== "string") return false;
  return marker(JSON.parse(row.value_json), erasedAt);
}

const sha = (bytes: string) => createHash("sha256").update(bytes).digest("hex");

function contains(value: unknown, token: string): boolean {
  return (
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))?.includes(token) ??
    false
  );
}

// [DX-ERASE1] Why: retain one failure per route while also proving that the route had the exact input before erasure.
// Rejected: using a shared assertion that stops at the first leak (the later boundaries would be untested).
export async function regression(
  f: Fixture,
  subject: number,
  dir: string,
  binding: string,
  diag: Call,
  ipc: Call,
  output: (name: string, value: unknown) => void,
) {
  const client = new DatomicClient(process.env.DATOMIC_URL!, 35_000);
  const rows = (entityId: string, input = {}) =>
    client.rows(f.db, { entityIds: [entityId], ...input });
  const root = ids.placement(subject);
  const entityId = taskId(subject, 0);
  const attribute = ":task/field-0";
  const before = (await rows(entityId)).find((r) => r.attribute === attribute);
  assert(before && typeof before.value_string === "string" && typeof before.tx_id === "string");
  const w: Witness = {
    entityId,
    attribute,
    assertionId: before.id,
    value: before.value_string,
    txId: before.tx_id,
  };
  const getJournal = () =>
    client.rows(f.db, { entityIds: [w.txId], pattern: { attribute: ":_tx/change" } });
  const previousJournal = await getJournal();
  assert(contains(previousJournal, w.value), "Missing pre-erasure journal positive control");
  const replica = new Replica(
    datomicReplicaSource(client, f.db, () => f.comp.currentPosition()),
    SEED_VALID_FROM,
  );
  await replica.bootstrap([root], f.position);
  const heldReplica = await replica.snapshotAt(f.position);
  const hasWitness = (world: ReturnType<typeof replica.world>) =>
    world.some(
      (r) => r.id === w.assertionId && r.value.type === "string" && r.value.value === w.value,
    );
  assert(
    hasWitness(replica.world(root)) && hasWitness(heldReplica.world(root)),
    "Missing replica positive control",
  );
  const advance = await f.comp.transact(
    [
      {
        op: "assert",
        entityId: "replica-control",
        attribute: "replica/advance",
        value: { type: "string", value: "next" },
        validFrom: SEED_VALID_FROM,
      },
    ],
    { commandId: "replica-pin-advance", actor: "erasure-regression" },
  );
  assert(advance.ok && advance.value.position > heldReplica.position);
  await replica.followOnce(200, advance.value.position);
  assert.equal((await replica.capture()).position, advance.value.position);
  const pending = await client.begin(f.db);
  const evidence: Evidence[] = [];
  const verify = (route: string, check: boolean, detail: Record<string, unknown>) => {
    evidence.push({ route, check, detail });
    output("regression-" + route, { cut: f.position, id: w.assertionId, ...evidence.at(-1) });
  };
  let beforeArchive = false;
  try {
    const pinned = await rows(entityId, { handle: pending.handle });
    assert(pinned.some((r) => r.id === w.assertionId && r.value_string === w.value));
    const archive = await ipc("archive", { scope: f.scope, action: "backup" }).catch((e) =>
      String(e),
    );
    if (typeof archive === "string") {
      output("regression-backup-start", { bytes: archive.length, sha256: sha(archive) });
      beforeArchive = !archive.startsWith("Error:");
    }
    const erased: Cut = await diag("regression-excise", {
      scope: f.scope,
      entityId,
      assertionId: w.assertionId,
    });
    assert(
      erased.assertionId === w.assertionId &&
        Number.isSafeInteger(erased.erasedAt) &&
        /^\d+$/.test(erased.t),
    );
    const kept = (await rows(entityId, { handle: pending.handle })).find(
      (r) => r.id === w.assertionId,
    );
    verify("open-handle", maskedRow(kept, w.assertionId, erased.erasedAt), {
      stale: kept?.value_string === w.value,
      erased,
    });
    const now = (await rows(entityId, { history: true })).find((r) => r.id === w.assertionId);
    verify("fresh-history", maskedRow(now, w.assertionId, erased.erasedAt), {
      missing: now === undefined,
      stale: now?.value_string === w.value,
    });
    for (const [name, world] of [
      ["replica-current", replica.world(root)],
      ["replica-retained", heldReplica.world(root)],
    ] as const) {
      verify(
        name,
        world.some((r) => r.id === w.assertionId && marker(r.value, erased.erasedAt)),
        { stale: hasWitness(world) },
      );
    }
    const journal = await getJournal();
    const change = journal
      .map((r) => JSON.parse(r.value_json!))
      .find((c) => c.tripleId === w.assertionId);
    verify("journal", marker(change?.value, erased.erasedAt) && !contains(journal, w.value), {
      stale: contains(journal, w.value),
      rows: journal.length,
    });
    try {
      const page = await client.log(f.db, erased.t, 4);
      const resumedClient = new DatomicClient(process.env.DATOMIC_URL!);
      try {
        const resumed = await resumedClient.log(f.db, page.nextT, 4);
        const event = page.rows.find(
          (r) =>
            r.kind === "commit" &&
            r.transaction.changes.some((c) => c.op === "erase" && c.assertionId === w.assertionId),
        );
        verify(
          "feed-resume",
          !!event && !contains([page, resumed], w.value) && resumed.fromT === page.nextT,
          { event: !!event, next: page.nextT },
        );
      } finally {
        resumedClient.close();
      }
    } catch (e) {
      verify("feed-resume", false, { error: (e as { code?: string }).code ?? String(e) });
    }
    try {
      const replay = await replayErased(f.name, binding, dir, w.entityId, w.value);
      const restoredValue = (await rows(entityId)).some(
        (r) => r.attribute === attribute && r.value_string === w.value,
      );
      verify("import-replay", !restoredValue && !replay.valueReintroduced, {
        restoredValue,
        position: replay.receipt.position,
        txId: replay.receipt.txId,
      });
    } catch (e) {
      verify("import-replay", false, { error: String(e) });
    }

    const published = await publishWork(
      f.name + "-publish",
      binding,
      dir,
      async (_comp, cohort, overlap) => {
        const scope = String(runtimeApi.DatabaseScope.test(f.name + "-publish"));
        const [selected] = await client.rows("s2-" + Buffer.from(scope).toString("base64url"), {
          entityIds: [taskId(cohort.people[0]!, 0)],
          pattern: { attribute },
        });
        assert(selected && selected.value_string === cohort.values[0]?.[0]);
        return overlap(async () => {
          const sentAt = performance.timeOrigin + performance.now();
          const cut: Cut = await diag("regression-excise", {
            scope,
            entityId: selected.entity_id,
            assertionId: selected.id,
          });
          const receivedAt = performance.timeOrigin + performance.now();
          return { sentAt, receivedAt, window: { start: sentAt, end: receivedAt }, cut };
        });
      },
    );
    const oldProjection = published as {
      retained: { projectedValue: boolean; outboxValue: boolean };
      publish: { commits: number };
    };
    verify("publish-barrier", !oldProjection.retained.projectedValue, {
      committed: oldProjection.publish.commits,
      ...oldProjection.retained,
    });
    await recipientRegression(f, w, verify);
    await joinedRegression(binding, verify);
  } finally {
    await replica.stop();
    await client.release(f.db, pending.handle);
    client.close();
  }
  if (beforeArchive) {
    const archivedClient = new DatomicClient(process.env.DATOMIC_URL!, 35000);
    try {
      const archive = await ipc("archive", { scope: f.scope, action: "restore" });
      const [restored] = await archivedClient.rows(f.db, { id: w.assertionId, history: true });
      const recorded = evidence.find((e) => e.route === "open-handle")?.detail.erased as Cut;
      verify("backup-restore", maskedRow(restored, w.assertionId, recorded.erasedAt), {
        stale: restored?.id === w.assertionId && restored.value_string === w.value,
        toolReceiptSha256: sha(archive),
      });
    } catch (e) {
      verify("backup-restore", false, { error: String(e) });
    } finally {
      archivedClient.close();
    }
  } else verify("backup-restore", false, { error: "Backup positive control unavailable" });
  output("regression-cases", { evidence });
  assert(
    evidence.every(({ check }) => check),
    "Erasure contract: " +
      evidence
        .filter((e) => !e.check)
        .map((e) => e.route)
        .join(", "),
  );
}

async function recipientRegression(
  source: Fixture,
  w: Witness,
  verify: (route: string, check: boolean, detail: Record<string, unknown>) => void,
) {
  const recipient = await openComposition("reach", "datomic", source.name + "-recipient");
  const db = new Documents(recipient, "effects");
  const notices = new Notices(source.comp, "erase-case", new NoticeFixture(source.comp));
  const sender = new Dispatcher(notices, db);
  const account = notices.db.prefix;
  const epoch = "same-source-generation";
  const origin = hash([account, epoch]);
  const packet: Packet = {
    account,
    epoch,
    batch: 1,
    previous: hash([account, epoch, "receiver-genesis"]),
    event: 1,
    position: source.position,
    recipe: hash("case"),
    start: 0,
    through: 1,
    deliveries: [
      {
        id: "notice-1",
        key: "notice-1/1",
        kind: "Open",
        subject: "subject-1",
        seq: 1n,
        rule: "protected",
        version: "v1",
        payload: JSON.stringify({ evidence: w.value }),
      },
    ],
  };
  try {
    await sender.receive(packet, hash(packet));
    const accepted = sender.metrics.sinkWrites === 1;
    verify("notice-sender", !accepted, { accepted, packetSha256: hash(packet) });
    const view = await db.get<string>("effects:" + origin + ":1", await db.head());
    const reopened = await db.get<string>("receiver:" + origin + ":subject-1", await db.head());
    const payloadPresent = contains(unpack(view.value), w.value);
    const ledgerPresent = contains(unpack(reopened.value), w.value);
    verify("notice-recipient", !accepted || (!payloadPresent && !ledgerPresent), {
      accepted,
      payloadPresent,
      ledgerPresent,
      packetSha256: hash(packet),
    });
  } catch (e) {
    verify("notice-rejected", false, { error: String(e) });
  } finally {
    await recipient.close();
  }
}

async function joinedRegression(
  binding: string,
  verify: (route: string, check: boolean, detail: Record<string, unknown>) => void,
) {
  const store = await openStore("lazy-erase-regress-" + binding.slice(0, 12));
  const account = new JoinedAccount(store);
  const subjects = [W0.placementId(0)];
  const first = subjects[0]!;
  const seed = (entityId: string, attribute: string, value: string | number) => ({
    op: "assert" as const,
    entityId,
    attribute,
    value: triplexValue(attribute, value),
    validFrom: 0,
  });
  try {
    await store.input("joined-seed", { kind: "baseline", at: valid }, [
      fact(rosterRoot(0), "lazy/members", subjects),
      fact("members/seal", "lazy/roster-seal", rosterSeal(subjects)),
      seed(first, "bgcStatus", "clear"),
      seed(first, "weeklyMinutes", 2400),
      seed(first, "location", "location:canary"),
      seed("location:canary", "jurisdiction", "jurisdiction:canary"),
      seed("jurisdiction:canary", "stateMinWageCents", 1650),
      seed(first, "payRateCents", 1600),
    ]);
    await account.install(subjects, valid);
    await assert.rejects(
      account.save("joined-protected", { e: first, a: "ssn", values: ["000000000"] }, valid),
      /retention/,
    );
    const r = await account.publish("joined-publish", W0.R1.doc, valid, "staged", undefined, {
      sources: "census",
    });
    const sequence = (await account.notices.observe()).value.sequence;
    const physical = await account.physical(sequence);
    const markerBound = Object.hasOwn(physical.marker, "erasureSeq");
    verify("joined-marker-staging", markerBound, {
      protectedWritesDeclined: true,
      markerBound,
      stagedControlPosition: r.position,
      physical,
    });
  } catch (e) {
    verify("joined-marker-staging", false, { error: String(e) });
  } finally {
    await store.close();
  }
}
