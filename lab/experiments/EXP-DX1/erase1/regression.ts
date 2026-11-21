import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  DatomicClient,
  Replica,
  datomicReplicaSource,
  orderedSaveIdentity,
} from "../../../../packages/datomic/dist/index.js";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { taskId } from "../../../bench/lib/deep-world.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { ErasureChanged, readErasure } from "../../../bench/lib/datomic-erasure.ts";
import { receiveOrdered } from "../notify1/receiver.ts";
import { Documents, hash, unpack } from "../notify1/store.ts";
import { Dispatcher, type Packet } from "../notify1/dispatcher.ts";
import { Fixture as NoticeFixture, originalWorld } from "../notify1/fixture.ts";
import { Notices } from "../notify1/journal.ts";
import { ReleaseCopy } from "../notify1/copy-plan.ts";
import { openStore, fact } from "../actv-lazy/store.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { valid } from "../actv-lazy/fixture.ts";
import { rosterRoot, rosterSeal } from "../actv-lazy/read.ts";
import { W0, factValue, triplexValue } from "../../../bench/lib/w0-world.ts";
import { command } from "../w1/group/workload.ts";
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
type Cut = {
  t: string;
  erasedAt: number;
  assertionId: string;
  seq?: number;
  position?: number;
  txId?: string;
};
type Call = (op: string, data: object) => Promise<any>;
type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
type Evidence = { route: string; check: boolean; detail: Record<string, unknown> };

function marker(v: unknown, erasedAt: number, txId?: string): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    "type" in v &&
    v.type === "erased" &&
    "valueType" in v &&
    v.valueType === "string" &&
    "erasedAt" in v &&
    v.erasedAt === erasedAt &&
    "erasureTxId" in v &&
    typeof v.erasureTxId === "string" &&
    (txId === undefined || v.erasureTxId === txId) &&
    Object.keys(v).length === 4
  );
}

function maskedRow(row: Row | undefined, id: string, erasedAt: number, txId?: string) {
  if (row?.id !== id || row.value_type !== "erased") return false;
  if (typeof row.value_json !== "string") return false;
  return row.value_string === null && marker(JSON.parse(row.value_json), erasedAt, txId);
}

function taggedError(error: unknown, code: string, seen = new Set<unknown>()): boolean {
  if (!error || typeof error !== "object" || seen.has(error)) return false;
  seen.add(error);
  const e = error as Record<string, unknown>;
  return (
    e.name === code ||
    e.code === code ||
    taggedError(e.cause, code, seen) ||
    taggedError(e.error, code, seen)
  );
}
const databaseFor = (scope: string) => "s2-" + Buffer.from(scope).toString("base64url");

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
  ledger: boolean,
) {
  const client = new DatomicClient(process.env.DATOMIC_URL!, 35_000);
  const subjectWriter = process.env.DX_ERASE1_SUBJECT_WRITER;
  const orderedIds = process.env.DX_ERASE1_ORDERED_IDS === "1";
  if (subjectWriter !== undefined) {
    // [DX-PREP1] Why: prove which writer setting actually reached the protected regression gateway.
    // Rejected: trusting launcher flags or a readback from another scope.
    const opts = await client.request<{
      database: string;
      subjectSave?: boolean;
      subjectFunction?: string;
      subjectFunctionTx?: string;
      subjectOrderedIds?: boolean;
      subjectNumericOwner?: boolean;
    }>("GET", `/v1/db/${f.db}/write-options`);
    assert.equal(opts.database, f.db);
    assert.equal(Boolean(opts.subjectSave), subjectWriter === "1");
    assert.equal(Boolean(opts.subjectOrderedIds), orderedIds);
    assert.equal(Boolean(opts.subjectNumericOwner), orderedIds);
    if (subjectWriter === "1") {
      assert.match(opts.subjectFunction ?? "", /^:triplex\.subject\/v-[0-9a-f]{24}$/);
      assert(Number(opts.subjectFunctionTx) > 0);
    } else {
      assert.equal(opts.subjectFunction, undefined);
      assert.equal(opts.subjectFunctionTx, undefined);
    }
    output("subject-writer-options", { binding, ...opts });
  }
  let observedSequence: number | undefined;
  client.onRequest = (r) => {
    if (r.path.endsWith("/read")) observedSequence = r.erasureSeq;
  };
  const rows = (entityId: string, input = {}) =>
    client.rows(f.db, { entityIds: [entityId], ...input });
  const publishErase = async (
    scope: string,
    entityId: string,
    assertionId: string,
  ): Promise<Cut> => {
    if (!ledger) return diag("regression-excise", { scope, entityId, assertionId });
    const result = await client.erase(databaseFor(scope), "regression-erase", [
      { id: assertionId },
    ]);
    assert.deepEqual(
      result.identities.map((r) => [r.assertionId, r.entity]),
      [[assertionId, entityId]],
    );
    assert.deepEqual(
      await client.erase(databaseFor(scope), "regression-erase", [{ id: assertionId }]),
      result,
    );
    assert.equal((await client.erasureFrontier(databaseFor(scope))).seq, result.seq);
    return { ...result, assertionId };
  };
  const root = ids.placement(subject);
  const entityId = taskId(subject, 0);
  const attribute = ":task/field-0";
  let witnessCut = f.position;
  let before = (await rows(entityId)).find((r) => r.attribute === attribute);
  assert(before && typeof before.value_string === "string" && typeof before.tx_id === "string");
  if (orderedIds) {
    // [DX-PREP1] Why: erase a real ordered assertion through all thirteen existing routes.
    // Rejected: checking the writer switch while the erased witness still uses a legacy ID.
    const identity = orderedSaveIdentity();
    const value = "ordered-witness-" + identity.token;
    const input = command(
      "ordered-erasure-witness",
      [{ e: entityId, a: attribute, v: { type: "string", value } }],
      [before],
      true,
      false,
      identity,
    );
    input.sourceK = witnessCut;
    const ack = (await client.transact(f.db, input)) as {
      operationId: string;
      position: { v: string };
      subjectSave?: string;
    };
    assert.equal(ack.operationId, input.operationId);
    assert.equal(
      ack.subjectSave,
      undefined,
      "Protected writes must take the erasure-fenced reference path",
    );
    assert.equal(Number(ack.position.v), witnessCut + 1);
    witnessCut = Number(ack.position.v);
    before = (await rows(entityId)).find((r) => r.id === identity.assertionId(0));
    assert(
      before &&
        before.tx_id === identity.transactionId &&
        before.value_string === value &&
        before.recorded_position === witnessCut,
    );
  }
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
  await replica.bootstrap([root], witnessCut);
  const heldReplica = await replica.snapshotAt(witnessCut);
  const hasWitness = (world: ReturnType<typeof replica.world>) =>
    world.some(
      (r) => r.id === w.assertionId && r.value.type === "string" && r.value.value === w.value,
    );
  assert(
    hasWitness(await replica.readWorld(root)) && hasWitness(await heldReplica.readWorld(root)),
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
  if (ledger) {
    const unprotected = advance.value.triples[0]!;
    await assert.rejects(client.erase(f.db, "unprotected-control", [{ id: unprotected.id }]), (e) =>
      taggedError(e, "EraseNotProtected"),
    );
  }
  await replica.followOnce(200, advance.value.position);
  assert.equal((await replica.capture()).position, advance.value.position);
  const pending = await client.begin(f.db);
  const evidence: Evidence[] = [];
  const verify = (route: string, check: boolean, detail: Record<string, unknown>) => {
    evidence.push({ route, check, detail });
    output("regression-" + route, { cut: witnessCut, id: w.assertionId, ...evidence.at(-1) });
  };
  let beforeArchive = false;
  try {
    const pinned = await rows(entityId, { handle: pending.handle });
    assert(pinned.some((r) => r.id === w.assertionId && r.value_string === w.value));
    if (ledger) assert.equal(observedSequence, 0);
    const archive = await ipc("archive", { scope: f.scope, action: "backup" }).catch((e) =>
      String(e),
    );
    if (typeof archive === "string") {
      output("regression-backup-start", { bytes: archive.length, sha256: sha(archive) });
      beforeArchive = !archive.startsWith("Error:");
    }
    const erased = await publishErase(f.scope, entityId, w.assertionId);
    assert(
      erased.assertionId === w.assertionId &&
        Number.isSafeInteger(erased.erasedAt) &&
        /^\d+$/.test(erased.t),
    );
    const kept = (await rows(entityId, { handle: pending.handle })).find(
      (r) => r.id === w.assertionId,
    );
    verify(
      "open-handle",
      maskedRow(kept, w.assertionId, erased.erasedAt, erased.txId) &&
        observedSequence === erased.seq,
      {
        stale: kept?.value_string === w.value,
        observedSequence,
        erased,
      },
    );
    const now = (await rows(entityId, { history: true })).find((r) => r.id === w.assertionId);
    verify("fresh-history", maskedRow(now, w.assertionId, erased.erasedAt, erased.txId), {
      missing: now === undefined,
      stale: now?.value_string === w.value,
    });
    for (const [name, world] of [
      ["replica-current", await replica.readWorld(root)],
      ["replica-retained", await heldReplica.readWorld(root)],
    ] as const) {
      verify(
        name,
        world.some((r) => r.id === w.assertionId && marker(r.value, erased.erasedAt, erased.txId)),
        { stale: hasWitness(world) },
      );
    }
    const journal = await getJournal();
    const change = journal
      .map((r) => JSON.parse(r.value_json!))
      .find((c) => c.tripleId === w.assertionId);
    try {
      const typed = (await f.comp.feedPage(before.recorded_position - 1, 1)).transactions[0];
      const typedChange = typed?.changes.find((c) => c.tripleId === w.assertionId);
      const directMarker = marker(change?.value, erased.erasedAt, erased.txId);
      const typedMarker = marker(typedChange?.value, erased.erasedAt, erased.txId);
      verify(
        "journal",
        typed?.txId === w.txId &&
          directMarker &&
          typedMarker &&
          !contains([journal, typed], w.value),
        {
          stale: contains([journal, typed], w.value),
          rows: journal.length,
          transactionMatches: typed?.txId === w.txId,
          directMarker,
          typedMarker,
          hasTypedChange: typedChange !== undefined,
          hasDirectChange: change !== undefined,
        },
      );
    } catch (e) {
      verify("journal", false, { error: String(e), stale: contains(journal, w.value) });
    }
    try {
      const next = await f.comp.transact(
        [
          {
            op: "assert",
            entityId: "resume-control",
            attribute: "resume/step",
            value: { type: "string", value: "after-erase" },
            validFrom: SEED_VALID_FROM,
          },
        ],
        { commandId: "post-erase-feed-control", actor: "erasure-regression" },
      );
      assert(next.ok && next.value.triples[0]?.value.value === "after-erase");
      const page = await client.log(f.db, erased.t, 1);
      const resumedClient = new DatomicClient(process.env.DATOMIC_URL!);
      try {
        const resumed = await resumedClient.log(f.db, page.nextT, 4);
        const event = page.rows.find(
          (r) =>
            r.t === erased.t &&
            r.kind === "commit" &&
            r.transaction.changes.some(
              (c) =>
                c.op === "erase" &&
                c.assertionId === w.assertionId &&
                c.erasureSeq === String(erased.seq),
            ),
        );
        const follow = resumed.rows.some(
          (r) =>
            r.kind === "commit" &&
            r.transaction.txIds.includes(next.value.txId) &&
            r.transaction.changes.some(
              (c) => c.op === "assert" && c.assertionId === next.value.triples[0]?.id,
            ),
        );
        verify(
          "feed-resume",
          !!event && follow && !contains([page, resumed], w.value) && resumed.fromT === page.nextT,
          { event: !!event, follow, next: page.nextT },
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
      const after = await rows(entityId);
      verify(
        "import-replay",
        ledger &&
          taggedError(e, "ErasureReplayDeclined") &&
          maskedRow(
            after.find((r) => r.id === w.assertionId),
            w.assertionId,
            erased.erasedAt,
            erased.txId,
          ) &&
          !contains(after, w.value),
        { error: String(e), restoredValue: contains(after, w.value) },
      );
    }

    const publishScope = String(runtimeApi.DatabaseScope.test(f.name + "-publish"));
    let nativeCut: Cut | undefined;
    try {
      const published = await publishWork(
        f.name + "-publish",
        binding,
        dir,
        async (_comp, cohort, overlap) => {
          const [selected] = await client.rows(databaseFor(publishScope), {
            entityIds: [taskId(cohort.people[0]!, 0)],
            pattern: { attribute },
          });
          assert(selected && selected.value_string === cohort.values[0]?.[0]);
          return overlap(async () => {
            const sentAt = performance.timeOrigin + performance.now();
            const cut = await publishErase(publishScope, selected.entity_id, selected.id);
            nativeCut = cut;
            const receivedAt = performance.timeOrigin + performance.now();
            return { sentAt, receivedAt, window: { start: sentAt, end: receivedAt }, cut };
          });
        },
        ledger ? () => client.declareProtection(databaseFor(publishScope), [attribute]) : undefined,
      );
      const oldProjection = published as {
        retained: { projectedValue: boolean; outboxValue: boolean };
        publish: { commits: number };
      };
      verify("publish-barrier", !oldProjection.retained.projectedValue, {
        committed: oldProjection.publish.commits,
        ...oldProjection.retained,
      });
    } catch (e) {
      const current = await client.basis(databaseFor(publishScope));
      const unchangedSinceErasure = nativeCut?.position === Number(current.position.v);
      const guardedProjection = (e as { guardedProjection?: boolean }).guardedProjection === true;
      verify(
        "publish-barrier",
        ledger &&
          taggedError(e, "ErasureFrontierChanged") &&
          unchangedSinceErasure &&
          guardedProjection,
        { error: String(e), unchangedSinceErasure, guardedProjection, nativeCut },
      );
    }
    await recipientRegression(f, w, verify, ledger);
    await joinedRegression(binding, verify, ledger);
    if (ledger) await ssnRegression(f.name + "-ssn", verify);
  } finally {
    await replica.stop();
    await client.release(f.db, pending.handle);
    client.close();
  }
  if (beforeArchive) {
    const archivedClient = new DatomicClient(process.env.DATOMIC_URL!, 35000);
    try {
      const archive = await ipc("archive", { scope: f.scope, action: "restore" });
      if (ledger) {
        await assert.rejects(archivedClient.rows(f.db, { id: w.assertionId, history: true }), (e) =>
          taggedError(e, "ErasureFrontierUnavailable"),
        );
        await archivedClient.restoreErasure(f.db);
      }
      const [restored] = await archivedClient.rows(f.db, { id: w.assertionId, history: true });
      const recorded = evidence.find((e) => e.route === "open-handle")?.detail.erased as Cut;
      verify(
        "backup-restore",
        maskedRow(restored, w.assertionId, recorded.erasedAt, recorded.txId),
        {
          stale: restored?.id === w.assertionId && restored.value_string === w.value,
          toolReceiptSha256: sha(archive),
        },
      );
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
  ledger: boolean,
) {
  const recipient = await openComposition("reach", "datomic", source.name + "-recipient");
  const db = new Documents(recipient, "effects");
  const notices = new Notices(source.comp, "erase-case", new NoticeFixture(source.comp));
  const sender = new Dispatcher(notices, db);
  const account = notices.db.prefix;
  const epoch = "same-source-generation";
  const origin = hash([account, epoch]);
  const packet: Packet = {
    ...(ledger ? { erasureSeq: 0 } : {}),
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
    if (ledger) {
      await assert.rejects(sender.receive(packet, hash(packet)), ErasureChanged);
      verify("notice-sender", true, { packetStale: true, packetSha256: hash(packet) });
      await assert.rejects(
        receiveOrdered(db, account, packet, hash(packet), undefined, undefined, () =>
          readErasure(source.comp),
        ),
        ErasureChanged,
      );
      const positionAfterDecline = await db.head();
      const authority = await readErasure(source.comp);
      assert(authority && authority.seq > 0);
      const current: Packet = {
        ...packet,
        erasureSeq: authority.seq,
        deliveries: packet.deliveries.map((d) => ({
          ...d,
          payload: '{"evidence":"current-control"}',
        })),
      };
      await sender.receive(current, hash(current));
      const positionAfterControl = await db.head();
      const effect = await db.get<string>("effects:" + origin + ":1", positionAfterControl);
      const recipientState = await db.get<string>(
        "receiver:" + origin + ":subject-1",
        positionAfterControl,
      );
      verify(
        "notice-recipient",
        positionAfterDecline === 0 &&
          positionAfterControl === 1 &&
          contains(unpack(effect.value), "current-control") &&
          contains(unpack(recipientState.value), "current-control") &&
          !contains([unpack(effect.value), unpack(recipientState.value)], w.value),
        {
          stalePacketRefused: true,
          positionAfterDecline,
          positionAfterControl,
        },
      );
      return;
    }
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
  ledger: boolean,
) {
  const store = await openStore("lazy-erase-regress-" + binding.slice(0, 12));
  const db = databaseFor(String(runtimeApi.DatabaseScope.test(store.scope)));
  if (ledger) {
    const client = new DatomicClient(process.env.DATOMIC_URL!);
    try {
      await client.declareProtection(db, ["bgcStatus"]);
    } finally {
      client.close();
    }
  }
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
      seed(first, "location", "loc:canary"),
      seed("loc:canary", "jurisdiction", "jur:canary"),
      seed("loc:canary", "localMinWageCents", 1700),
      seed("jur:canary", "stateMinWageCents", 1650),
      seed(first, "payRateCents", 1660),
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
    const markerBound =
      Object.hasOwn(physical.marker, "erasureSeq") &&
      physical.marker.stage &&
      physical.marker.stage.erasureSeq === (physical.marker as { erasureSeq?: number }).erasureSeq;
    let staleStageDeclined = false;
    if (ledger) {
      const native = new DatomicClient(process.env.DATOMIC_URL!);
      try {
        const held = (await native.rows(db, { entityIds: [first] })).find(
          (r) => r.attribute === "bgcStatus",
        );
        assert(held?.value_string === "clear");
        let erased = false;
        await assert.rejects(
          account.publish("joined-old-stage", W0.R2.doc, valid, "staged", undefined, {
            sources: "census",
            afterChunk: async () => {
              if (erased) return;
              const cut = await native.erase(db, "joined-stage-erase", [{ id: held.id }]);
              erased = cut.seq === 1 && cut.identities[0]?.assertionId === held.id;
            },
          }),
          (error) => taggedError(error, "ErasureFrontierChanged"),
        );
        staleStageDeclined = erased && !(await store.lookup("joined:joined-old-stage"));
        await assert.rejects(account.physical(sequence), ErasureChanged);
      } finally {
        native.close();
      }
    }
    verify("joined-marker-staging", !!markerBound && staleStageDeclined, {
      protectedWritesDeclined: true,
      markerBound,
      staleStageDeclined,
      stagedControlPosition: r.position,
      physical,
    });
  } catch (e) {
    verify("joined-marker-staging", false, { error: String(e) });
  } finally {
    await store.close();
  }
}

export async function derivedRegression(
  binding: string,
  output: (name: string, value: unknown) => void,
) {
  const store = await openStore("lazy-erase-owed-" + binding.slice(0, 18));
  const peer = new DatomicClient(process.env.DATOMIC_URL!);
  const db = databaseFor(String(runtimeApi.DatabaseScope.test(store.scope)));
  const account = new JoinedAccount(store);
  const person = W0.placementId(0);
  const release = Promise.withResolvers<void>();
  const entered = Promise.withResolvers<void>();
  let values: Archive | undefined;
  let noticeArchive: Archive | undefined;
  let control: Archive | undefined;
  class HeldQueue extends BulkQueue {
    calls = 0;
    override async submit<T>(scope: string, work: () => Promise<T>) {
      if (++this.calls === 2) entered.resolve();
      await release.promise;
      return super.submit(scope, work);
    }
  }
  try {
    await peer.declareProtection(db, ["bgcStatus"]);
    const seed = (entityId: string, attribute: string, value: string | number) => ({
      op: "assert" as const,
      entityId,
      attribute,
      value: triplexValue(attribute, value),
      validFrom: 0,
    });
    await store.input("owed-seed", { kind: "baseline", at: valid }, [
      fact(rosterRoot(0), "lazy/members", [person]),
      fact("members/seal", "lazy/roster-seal", rosterSeal([person])),
      seed(person, "bgcStatus", "clear"),
      seed(person, "weeklyMinutes", 2400),
      seed(person, "location", "loc:canary"),
      seed("loc:canary", "jurisdiction", "jur:canary"),
      seed("loc:canary", "localMinWageCents", 1700),
      seed("jur:canary", "stateMinWageCents", 1650),
      seed(person, "payRateCents", 1660),
    ]);
    await account.install([person], valid);
    await account.publish("owed-one", W0.R1.doc, valid, "owed", undefined, { sources: "census" });
    const first = (await account.notices.observe()).value.sequence;
    control = await Archive.open(account, new BulkQueue(1));
    assert.equal((await control.runValues(first)).status, "stored");
    assert((await control.stored(first)).output.length > 0);
    await account.publish("owed-two", W0.R2.doc, valid, "owed", undefined, { sources: "census" });
    const next = (await account.notices.observe()).value.sequence;
    const event = await account.notices.event(next, await store.head());
    const copy = new ReleaseCopy(store.comp, 1, false, 1);
    assert.equal(await copy.suggest(account.notices, event, event.at), undefined);
    assert.equal(copy.stats.captures, 0);
    const queue = new HeldQueue(1);
    values = await Archive.open(account, queue);
    noticeArchive = await Archive.open(account, queue, "notices");
    const before = [await values.store.head(), await noticeArchive.store.head()];
    const attempts = [values.turn(next), new RecordedNotices(noticeArchive).record(next)];
    const done = Promise.allSettled(attempts);
    const originalRequest = DatomicClient.prototype.request;
    const submitted = new Set<string>();
    try {
      DatomicClient.prototype.request = function <T>(
        this: DatomicClient,
        ...args: Parameters<DatomicClient["request"]>
      ) {
        const [, path, body] = args;
        if (
          path.endsWith("/transact") &&
          body &&
          typeof body === "object" &&
          "erasureSourceDatabase" in body &&
          body.erasureSourceDatabase === db &&
          "erasureSeq" in body &&
          body.erasureSeq === 0
        ) {
          submitted.add(path.split("/").at(-2)!);
        }
        return originalRequest.apply(this, args) as Promise<T>;
      };
      await Promise.race([
        entered.promise,
        ...attempts.map((pending) =>
          pending.then(() => assert.fail("Archive completed before its held turn")),
        ),
        delay(5_000).then(() => assert.fail("Both archive turns must reach the held queue")),
      ]);
      const target = (await peer.rows(db, { entityIds: [person] })).find(
        (row) => row.attribute === "bgcStatus",
      );
      assert(target?.value_string === "clear");
      const erased = await peer.erase(db, "owed-value-removal", [{ id: target.id }]);
      assert.equal(erased.seq, 1);
      assert.equal(erased.identities[0]?.assertionId, target.id);
      release.resolve();
      const rejected = await done;
      const replies = rejected.map((result) => {
        if (result.status === "fulfilled") return { status: result.status };
        const causes: string[] = [];
        let cause: unknown = result.reason;
        while (cause instanceof Error && causes.length < 4) {
          causes.push(String(cause));
          cause = cause.cause;
        }
        return { status: result.status, causes };
      });
      const after = [await values.store.head(), await noticeArchive.store.head()];
      output("derived-observed", { replies, before, after, submitted: [...submitted] });
      assert.deepEqual(
        submitted,
        new Set(
          [values, noticeArchive].map(({ store: archiveStore }) =>
            databaseFor(String(runtimeApi.DatabaseScope.test(archiveStore.scope))),
          ),
        ),
      );
      assert(
        rejected.every(
          (result) =>
            result.status === "rejected" && taggedError(result.reason, "ErasureFrontierChanged"),
        ),
      );
      assert.deepEqual(after, before);
      await assert.rejects(control.stored(first), ErasureChanged);
      output("derived-writer", {
        first,
        next,
        erased,
        before,
        refused: rejected.length,
        copiedImages: copy.stats.captures,
      });
    } finally {
      release.resolve();
      await done;
      DatomicClient.prototype.request = originalRequest;
    }
  } finally {
    peer.close();
    await Promise.all([values?.close(), noticeArchive?.close(), control?.close(), store.close()]);
  }
}

async function ssnRegression(
  name: string,
  verify: (route: string, check: boolean, detail: Record<string, unknown>) => void,
) {
  const comp = await openComposition("reach", "datomic", name);
  const db = databaseFor(String(runtimeApi.DatabaseScope.test(name)));
  const native = new DatomicClient(process.env.DATOMIC_URL!);
  const first = W0.placementId(0);
  try {
    await native.declareProtection(db, ["ssn"]);
    const seed = await comp.transact(
      [
        {
          op: "assert",
          entityId: first,
          attribute: "ssn",
          value: { type: "string", value: "000000000" },
          validFrom: 0,
        },
      ],
      { commandId: "ssn-seed", actor: "erasure-regression" },
    );
    assert(seed.ok && seed.value.triples[0]?.value.value === "000000000");
    const before = await native.basis(db);
    const [ssn] = await native.rows(db, { entityIds: [first], pattern: { attribute: "ssn" } });
    assert(ssn);
    const control = originalWorld(0);
    const world = {
      ...control,
      facts: control.facts.map((f) => ({ ...f, tx: ssn.recorded_position })),
    };
    assert.equal(ssn.value_string, world.facts.find((f) => f.a === "ssn")?.v);
    const basis = { tx: Number(before.position.v), validTime: valid };
    const beforePolicy = W0.evaluateWorld(world, W0.R2, basis);
    assert(!W0.isFailure(beforePolicy));
    assert(beforePolicy.workItems.some((work) => work.kind === "everify.submit-case"));
    const eraseSsn = await native.erase(db, "ssn-erase", [{ id: ssn.id }]);
    const [marked] = await native.rows(db, {
      id: ssn.id,
      history: true,
      basis: { recordedPosition: Number(before.position.v) },
    });
    assert(maskedRow(marked, ssn.id, eraseSsn.erasedAt, eraseSsn.txId));
    const currentPolicy = W0.evaluateWorld(
      {
        ...world,
        facts: world.facts.map((f) =>
          f.a === "ssn" ? { ...f, v: factValue(JSON.parse(marked!.value_json!)) } : f,
        ),
      },
      W0.R2,
      basis,
    );
    assert(!W0.isFailure(currentPolicy));
    verify(
      "ssn-rule",
      currentPolicy.tasks.some((task) => task.kind === "everify.ssn-erased") &&
        !currentPolicy.workItems.some((work) => work.kind === "everify.submit-case"),
      {
        seq: eraseSsn.seq,
        ssnAssertion: ssn.id,
        marker: JSON.parse(marked!.value_json!),
      },
    );
  } catch (error) {
    verify("ssn-rule", false, { error: String(error) });
  } finally {
    native.close();
    await comp.close();
  }
}
