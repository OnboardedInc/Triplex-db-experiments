import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import {
  EntityId,
  TripleId,
  Triples,
  type TransactionMeta,
  type TransactOp,
} from "@triplex-build/triplex";
import { Attribute, ConfigNode, ConfigStore, EntityType } from "@triplex-build/triplex/config";
import { ConfigApi } from "@triplex-build/triplex-http";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import {
  DatomicClient,
  DatomicHttpError,
  makeDatomicQueryExecutor,
  makeDatomicStorageAdapter,
  traceScheduler,
  withoutTrace,
  withDatomicImportClock,
} from "@triplex-build/triplex-datomic";
import { Effect, Layer, ManagedRuntime, Scheduler } from "effect";
import { type Action, ActionError, type Payload, type Result } from "./actions.ts";
import { attrs, currentAt, earlyAt, personAt, type Fixture, type Person } from "./fixture.ts";
import { observe, requestSamples } from "./timings.ts";
import { hash } from "./stack.ts";
import { personId, personName, type Profile, type Subject } from "./model.ts";
import type { Frame, Manifest } from "./bundle.ts";
import {
  snapshotProfiles,
  snapshotSamples,
  type Checkpoint,
  type Restore,
  type SeedFrame,
  type SeedPlan,
} from "./snapshot.ts";

type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
const PersonSchema = EntityType.make("Person", {
  attributes: {
    name: Attribute.use(Attribute.text(attrs.name), { required: true }),
    status: Attribute.use(Attribute.text(attrs.status), { required: true }),
    role: Attribute.use(Attribute.text(attrs.role)),
    note: Attribute.use(Attribute.text(attrs.note)),
  },
});

type Policy = { label: string; reviewStatus: string };
type StackUrls = { write: string; read: string };
export type Source =
  | { fixture: Fixture; checksum: string }
  | { manifest: Manifest; checksum: string; frames: () => AsyncGenerator<Frame> }
  | {
      fixtureInfo: Pick<Manifest, "accounts" | "earlyAt" | "currentAt">;
      checksum: string;
      frames: () => AsyncGenerator<SeedFrame>;
    }
  | Restore;

export const ERASE_UNAVAILABLE =
  "The merged gateway protects reads with an erasure frontier, but its native Datalog route refuses protected scopes. A marker across every playground read path is unavailable on this base.";

function stringFact(
  person: string,
  attribute: string,
  value: string,
  validFrom: number,
  validTo?: number,
): TransactOp {
  return {
    op: "assert",
    entityId: EntityId.make(person),
    attribute,
    value: { type: "string", value },
    validFrom,
    ...(validTo === undefined ? {} : { validTo }),
  };
}

function subjectOps(subject: Subject, at: number): TransactOp[] {
  return subject.facts.map(([attribute, value, kind]) => ({
    op: "assert",
    entityId: EntityId.make(subject.id),
    attribute,
    validFrom: at,
    value:
      kind === "ref"
        ? { type: "ref", value: EntityId.make(value) }
        : kind === "integer"
          ? { type: "integer", value }
          : kind === "boolean"
            ? { type: "boolean", value: value === "true" }
            : { type: "string", value },
  }));
}

function receipt(r: { txId: string; position: number; instant: number }, commandId?: string) {
  return {
    txId: r.txId,
    position: r.position,
    recordedAt: r.instant,
    ...(commandId ? { commandId } : {}),
  };
}
const fields = (rows: readonly Row[]) =>
  rows
    .map((r) => ({
      entityId: r.entity_id,
      attribute: r.attribute,
      value: r.value_string ?? r.value_number ?? r.value_boolean ?? r.value_json,
      validFrom: r.valid_from,
      validTo: r.valid_to,
      assertionId: r.id,
      recordedPosition: r.recorded_position,
    }))
    .sort((a, b) => a.entityId.localeCompare(b.entityId) || a.attribute.localeCompare(b.attribute));

function replace(
  person: string,
  old: readonly Row[],
  changes: Record<string, string>,
  at: number,
): TransactOp[] {
  const byAttribute = new Map(old.map((r) => [r.attribute, r]));
  return Object.entries(changes)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([attribute, value]) => {
      const prior = byAttribute.get(attribute);
      const next = stringFact(person, attribute, value, at);
      if (!prior) return [next];
      return [
        { op: "retract", id: TripleId.make(prior.id) } as const,
        ...(prior.valid_from < at
          ? [stringFact(person, attribute, prior.value_string!, prior.valid_from, at)]
          : []),
        next,
      ];
    });
}

function nativeExamples(personId: string) {
  return [
    {
      label: "Person names",
      query: `[:find ?id ?name :in $ $rules :where [?p :triplex.entity/id ${JSON.stringify(personId)}] [?p :triplex.entity/id ?id] [?f :f/live ?p] [?f :f/attr ?attr] [?attr :triplex.attr/key ":person/name"] [?f :f.v/string ?name]]`,
    },
    {
      label: "Person status assertions",
      query: `[:find ?status ?from :in $ $rules :where [?p :triplex.entity/id ${JSON.stringify(personId)}] [?f :f/subject ?p] [?f :f/attr ?attr] [?attr :triplex.attr/key ":person/status"] [?f :f.v/string ?status] [?f :f/valid-from ?from]]`,
    },
    {
      label: "Commit positions",
      query: "[:find ?p :in $ $rules :where [?tx :triplex.tx/position ?p]]",
    },
  ];
}

function runtime(client: DatomicClient, scope: ReturnType<typeof DatabaseScope.test>) {
  const definition = Runtime.define({
    name: "datomic",
    storage: Layer.succeed(
      StorageAdapter,
      makeDatomicStorageAdapter(client, scope, { layout: "legacy", serverRecordTime: true }),
    ),
    queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
  });
  const triplex = definition.layer({ scope, capabilities: Capabilities.none });
  return ManagedRuntime.make(Layer.merge(triplex, ConfigStore.layer.pipe(Layer.provide(triplex))));
}

type Release = {
  id: string;
  account: Profile;
  policy: Policy;
  schema: ConfigApi.ConfigApiDescriptor;
  receipt: ReturnType<typeof receipt>;
  written: number;
  writePosition: number;
  startedAt: number;
  lastWriteMs: number | null;
  state: "writing" | "complete" | "failed";
  firstAnswerMs: number;
  firstPerson: string;
  backgroundMs?: number;
  error?: string;
};

export class Playground {
  readonly writer: DatomicClient;
  readonly reader: DatomicClient;
  readonly store: ReturnType<typeof runtime>;
  readonly db: string;
  readonly scope: ReturnType<typeof DatabaseScope.test>;
  readonly accounts: Map<string, Profile>;
  readonly fixture: Pick<Manifest, "accounts" | "earlyAt" | "currentAt">;
  readonly releases = new Map<string, Release>();
  readonly running = new Map<string, Promise<void>>();
  readonly publishing = new Set<string>();
  readonly #abort = new AbortController();
  readonly loadPerson = "load:playground:isolated";
  private loadActive = false;
  private earlyPosition = 0;
  private middlePosition = 0;
  private firstRelease: Result | undefined;
  readonly seedCounts = { initialFacts: 0, saves: 0 };

  readonly source: Source;
  constructor(source: Source, urls: StackUrls, run: string) {
    this.source = source;
    this.fixture =
      "inputs" in source
        ? { accounts: snapshotProfiles(source.manifest.plan), earlyAt, currentAt }
        : "fixture" in source
          ? source.fixture
          : "fixtureInfo" in source
            ? source.fixtureInfo
            : source.manifest;
    const scope = DatabaseScope.test(
      "import-history-" + ("inputs" in source ? source.manifest.run : run),
    );
    this.scope = scope;
    this.db = "s2-" + Buffer.from(scope).toString("base64url");
    this.writer = new DatomicClient(urls.write, 8000);
    this.reader = new DatomicClient(urls.read, 8000);
    this.writer.onRequest = this.reader.onRequest = observe;
    this.store = runtime(this.writer, scope);
    this.accounts = new Map(this.fixture.accounts.map((a) => [a.id, a]));
  }

  run<A, E>(effect: Effect.Effect<A, E, Triples | ConfigStore.ConfigStore>) {
    return this.store.runPromise(effect, {
      scheduler: traceScheduler(new Scheduler.MixedScheduler()),
    });
  }

  async head() {
    return Number((await this.writer.basis(this.db)).position.v);
  }

  async rows(id: string, p: number, at = this.fixture.currentAt, client = this.reader) {
    return client.rows(this.db, {
      entityIds: [id],
      basis: { recordedPosition: p, validAt: at },
      basisWaitMs: 2000,
    });
  }

  transact(ops: TransactOp[], meta: TransactionMeta) {
    return this.run(Effect.flatMap(Triples, (store) => store.transact(ops, meta)));
  }

  private import(ops: TransactOp[], commandId: string, at: number) {
    return this.run(
      withDatomicImportClock(
        this.scope,
        at,
        Effect.flatMap(Triples, (store) =>
          store.transact(ops, { actor: "playground-seed", commandId }),
        ),
      ),
    );
  }

  private initial(person: Person) {
    const facts = Object.entries(person.edits[0]!.changes).map(([a, v]) =>
      a === attrs.account ? ([a, v, "ref"] as const) : ([a, v] as const),
    );
    return [
      ...subjectOps({ id: person.id, facts }, this.fixture.earlyAt),
      ...person.owned.flatMap((subject) => subjectOps(subject, this.fixture.earlyAt)),
    ];
  }

  async seed(signal?: AbortSignal) {
    if ("inputs" in this.source) return this.verifySnapshot(this.source);
    await this.run(Effect.asVoid(Triples));
    if ("fixture" in this.source) await this.seedSmall(this.source.fixture, signal);
    else await this.seedBundle(this.source.frames, signal);
    await this.transact(
      [stringFact(this.loadPerson, attrs.note, "Ready", this.fixture.currentAt)],
      { actor: "playground-seed", commandId: "seed:load" },
    );
  }

  private async seedBundle(
    frames: () => AsyncGenerator<SeedFrame>,
    signal: AbortSignal | undefined,
  ) {
    let ops: TransactOp[] = [];
    let batch = 0;
    const flush = async () => {
      if (!ops.length) return;
      this.seedCounts.initialFacts += ops.length;
      this.earlyPosition = (
        await this.import(ops, "seed:bundle:" + batch++, this.fixture.earlyAt)
      ).position;
      ops = [];
    };
    for await (const frame of frames()) {
      signal?.throwIfAborted();
      if (frame.kind === "catalog" || frame.kind === "person") {
        const next =
          frame.kind === "catalog"
            ? subjectOps(frame.subject, this.fixture.earlyAt)
            : this.initial(frame.person);
        if (ops.length + next.length > 360) await flush();
        ops.push(...next);
      } else if (frame.kind === "save") {
        await flush();
        const p = await this.head();
        const old = await this.rows(frame.target, p, frame.validAt, this.writer);
        if (!old.length) throw new Error("Bundle save target was not imported");
        await this.import(
          replace(frame.target, old, frame.changes, frame.validAt),
          "seed:" + frame.id,
          frame.validAt,
        );
        this.seedCounts.saves++;
      } else if (frame.kind === "middle") {
        await flush();
        this.middlePosition = await this.head();
      } else if (frame.kind === "release") {
        await flush();
        const account = this.accounts.get(frame.account);
        if (!account) throw new Error("Bundle release names an unknown account");
        await this.seedRelease(
          account,
          { label: frame.label, reviewStatus: frame.reviewStatus },
          frame.validAt,
        );
      } else {
        throw new Error("Unexpected bundle operation");
      }
    }
    await flush();
  }

  private async seedRelease(account: Profile, policy: Policy, at: number) {
    this.firstRelease = await this.publish(account, personAt(account, 0), policy, at);
    await this.running.get(account.id);
    const release = this.releases.get(String(this.firstRelease["releaseId"]));
    if (release?.state !== "complete")
      throw new Error("Fixture release did not materialize: " + release?.error);
    this.firstRelease = await this.readRelease(account, personAt(account, 0), release.id);
  }

  private async seedSmall(fixture: Fixture, signal: AbortSignal | undefined) {
    const batch = (ops: TransactOp[], section: string, index: number, at: number) => {
      signal?.throwIfAborted();
      if (at === this.fixture.earlyAt) this.seedCounts.initialFacts += ops.length;
      return this.import(ops, `seed:${section}:${index}`, at);
    };

    for (const acct of fixture.accounts) {
      for (let i = 0; i < acct.catalog.length; i += 48) {
        const ops = acct.catalog
          .slice(i, i + 48)
          .flatMap((subject) => subjectOps(subject, this.fixture.earlyAt));
        this.earlyPosition = (
          await batch(ops, acct.id + ":catalog", i, this.fixture.earlyAt)
        ).position;
      }
      const size = acct.shape === "deep" ? 2 : 16;
      for (let i = 0; i < acct.people.length; i += size) {
        const ops = acct.people.slice(i, i + size).flatMap((person) => this.initial(person));
        this.earlyPosition = (await batch(ops, acct.id, i, this.fixture.earlyAt)).position;
      }
    }
    const roster = fixture.accounts.flatMap((a) => a.people);
    const byTime = new Map<number, { person: Person; changes: Record<string, string> }[]>();
    for (const person of roster)
      for (const edit of person.edits.slice(1)) {
        const group = byTime.get(edit.validAt) ?? [];
        group.push({ person, changes: edit.changes });
        byTime.set(edit.validAt, group);
      }
    const deep = fixture.accounts[0]!;
    let releases = 0;
    for (const [validAt, edits] of [...byTime].sort(([a], [b]) => a - b)) {
      for (let i = 0; i < edits.length; i += 16) {
        signal?.throwIfAborted();
        const group = edits.slice(i, i + 16);
        const p = await this.head();
        const old = await this.writer.rows(this.db, {
          entityIds: group.map(({ person }) => person.id),
          basis: { recordedPosition: p, validAt },
        });
        const byEntity = new Map<string, Row[]>();
        for (const row of old) {
          const rows = byEntity.get(row.entity_id) ?? [];
          rows.push(row);
          byEntity.set(row.entity_id, rows);
        }
        await batch(
          group.flatMap(({ person, changes }) =>
            replace(person.id, byEntity.get(person.id) ?? [], changes, validAt),
          ),
          "edit-" + validAt,
          i,
          validAt,
        );
      }
      const day = (validAt - this.fixture.earlyAt) / 86_400_000;
      this.seedCounts.saves += edits.length;
      if (day <= 17) this.middlePosition = await this.head();
      if (day === 14 || day === 28) {
        await this.seedRelease(
          deep,
          {
            label: "Circuit " + ++releases,
            reviewStatus: releases === 1 ? "Review" : "Active",
          },
          validAt + 1,
        );
      }
    }
  }

  async snapshotCheckpoint(plan: SeedPlan): Promise<Checkpoint> {
    const early = this.earlyPosition;
    const middle = this.middlePosition;
    if (!early || middle <= early) throw new Error("The snapshot must have two earlier cuts");
    const contents = JSON.stringify({
      plan,
      early,
      middle,
      firstRelease: this.firstRelease,
      releases: [...this.releases.values()],
    });
    const committed = await this.transact(
      [
        stringFact(
          "playground:snapshot",
          ":playground/checkpoint",
          contents,
          this.fixture.currentAt,
        ),
      ],
      { actor: "playground-seed", commandId: "seed:snapshot-checkpoint" },
    );
    return { early, middle, head: committed.position };
  }

  private async verifySnapshot(source: Restore) {
    const { plan, checkpoint } = source.manifest;
    const { early, middle, head } = checkpoint;
    if ((await this.head()) !== head)
      throw new Error("Restored Datomic scope or head differs from the snapshot");
    const marker = await this.rows("playground:snapshot", head, undefined, this.writer);
    if (marker.length !== 1 || marker[0]!.attribute !== ":playground/checkpoint")
      throw new Error("Restored Datomic snapshot checkpoint is missing");
    const data = JSON.parse(marker[0]!.value_string!) as {
      plan: SeedPlan;
      early: number;
      middle: number;
      firstRelease: Result;
      releases: Release[];
    };
    if (
      hash(JSON.stringify(data.plan)) !== hash(JSON.stringify(plan)) ||
      data.early !== early ||
      data.middle !== middle
    )
      throw new Error("Restored generator checkpoint differs from the snapshot manifest");
    // [DX-PLAY1] Why: every cut compares all sampled person and child values independently of the dump.
    // Rejected: trusting the database name, the checkpoint fact or a successful pg_restore as proof of correctness.
    for (const [i, cut] of snapshotSamples(plan).entries()) {
      const position = [early, middle, head][i]!;
      for (const [id, expected] of cut.byPerson) {
        const rows = fields(
          await this.reader.rows(this.db, {
            entityIds: [...expected.keys()],
            basis: { recordedPosition: position, validAt: cut.at },
          }),
        );
        let expectedCount = 0;
        for (const attrs of expected.values()) expectedCount += attrs.size;
        const keys = new Set(rows.map((r) => JSON.stringify([r.entityId, r.attribute])));
        if (
          rows.length !== expectedCount ||
          keys.size !== expectedCount ||
          rows.some((r) => expected.get(r.entityId)?.get(r.attribute) !== r.value)
        )
          throw new Error(
            "Restored values differ from the generator for " + id + " at " + position,
          );
      }
    }
    this.earlyPosition = early;
    this.middlePosition = middle;
    for (const release of data.releases) this.releases.set(release.id, release);
    this.firstRelease = data.firstRelease;
  }

  personRows(person: Person, position: number, validAt = this.fixture.currentAt) {
    return this.reader.rows(this.db, {
      entityIds: [person.id, ...person.owned.map((subject) => subject.id)],
      basis: { recordedPosition: position, validAt },
      basisWaitMs: 2000,
    });
  }

  private account(input: Payload) {
    const a = this.accounts.get(input.accountId!);
    if (!a) throw new ActionError(404, "AccountNotFound", "Choose a fixture account");
    return a;
  }

  private person(input: Payload) {
    const account = this.account(input);
    const index = Number(input.personId?.slice(-7)) - 1;
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= account.count ||
      personId(account, index) !== input.personId
    )
      throw new ActionError(404, "PersonNotFound", "Choose a person in this account");
    return { account, person: personAt(account, index) };
  }

  private async save(id: string, expected: number, changes: Record<string, string>, key: string) {
    const commandId = "playground-save:" + key;
    const intent = hash(JSON.stringify([id, expected, Object.entries(changes).sort()]));
    const find = () =>
      this.run(Effect.flatMap(Triples, (store) => store.transactionByCommand(commandId)));
    const recover = async () => {
      const existing = await find();
      if (!existing) return;
      if (existing.correlationId !== intent)
        throw new ActionError(
          409,
          "CommandReused",
          "This command ID already belongs to a different save",
        );
      return { result: existing, duplicate: true };
    };
    // [DX-PLAY1] Why: compare the complete observed person state atomically and bind retries to the durable intent.
    // Rejected: process-memory deduplication or comparing a global head that other accounts can advance.
    const commit = async () => {
      const previous = await recover();
      if (previous) return previous;
      if (expected > (await this.head()))
        throw new ActionError(
          409,
          "FuturePosition",
          "The requested save position is ahead of this database",
        );
      const old = await this.rows(id, expected, this.fixture.currentAt, this.writer);
      if (!old.length)
        throw new ActionError(
          409,
          "StaleSave",
          "This person did not exist at the supplied position",
        );
      // Historical valid intervals remain live rows too. Capture all active assertions at the
      // same record cut for EntityState and filter by business time only when building operations.
      const live = await this.writer.rows(this.db, {
        entityIds: [id],
        basis: { recordedPosition: expected },
      });
      try {
        const result = await this.transact(replace(id, old, changes, this.fixture.currentAt), {
          commandId,
          correlationId: intent,
          actor: "playground",
          preconditions: [
            {
              _tag: "EntityState",
              entityId: EntityId.make(id),
              tripleIds: live.map((r) => TripleId.make(r.id)),
            },
          ],
        });
        return { result, duplicate: false };
      } catch (failure) {
        const previous = await recover();
        if (previous) return previous;
        const error = failure as { _tag?: string; cause?: { code?: string } };
        if (
          error._tag === "TransactionConflictError" ||
          error._tag === "DatomicSerializationConflict" ||
          error.cause?.code === "CasConflict"
        )
          throw new ActionError(
            409,
            "StaleSave",
            "The person's facts changed after this read. Read current values and retry.",
          );
        throw failure;
      }
    };
    const { result, duplicate } = await commit();
    const records = fields(await this.rows(id, result.position));
    return { records, receipt: receipt(result, key), position: result.position, duplicate };
  }

  private async answers(people: readonly Person[], p: number, policy: Policy) {
    const basis = { recordedPosition: p, validAt: this.fixture.currentAt };
    const rows = await this.reader.rows(this.db, {
      entityIds: people.map((person) => person.id),
      pattern: { attribute: attrs.status },
      basis,
      basisWaitMs: 2000,
    });
    const status = new Map(rows.map((r) => [r.entity_id, r.value_string]));
    return people.map((person) => {
      const observed = status.get(person.id);
      if (!observed) throw new Error("Release input is missing a person status");
      return {
        personId: person.id,
        status: observed,
        decision: observed === policy.reviewStatus ? "Review required" : "Clear",
      };
    });
  }

  private releasePerson(release: Release, person: Person) {
    return `release:${release.id}:${person.id}`;
  }

  private async publish(
    account: Profile,
    person: Person,
    policy: Policy,
    importAt?: number,
  ): Promise<Result> {
    if (this.publishing.has(account.id) || this.running.has(account.id))
      throw new ActionError(409, "PublishBusy", "This account already has a release in progress");
    this.publishing.add(account.id);
    const startedAt = performance.now();
    try {
      // [DX-PLAY1] Why: reuse the public content-addressed release and atomic ref move.
      // Rejected: starting a background job from an uncommitted release or reading a moving cut.
      const node = await this.run(
        ConfigNode.make({ kind: "playground-policy", key: account.id, attrs: policy }),
      );
      const commit = Effect.gen(function* () {
        const store = yield* ConfigStore.ConfigStore;
        const personNodes = yield* PersonSchema.nodes;
        return yield* store.commit({
          label: policy.label,
          objects: [...personNodes, node],
          ref: "playground-" + account.id,
        });
      });
      const published = await this.run(
        importAt === undefined ? commit : withDatomicImportClock(this.scope, importAt, commit),
      );
      const schema = await this.run(
        ConfigApi.compile(published.snapshot, { operations: { Person: ["read"] } }),
      );
      const position = published.transaction.position;
      const id = published.snapshot.id + "-" + position;
      const records = await this.answers([person], position, policy);
      const release: Release = {
        id,
        account,
        policy,
        schema,
        receipt: receipt(published.transaction),
        written: 0,
        writePosition: position,
        startedAt,
        lastWriteMs: null,
        state: "writing",
        firstAnswerMs: performance.now() - startedAt,
        firstPerson: person.id,
      };
      this.releases.set(release.id, release);
      const task = requestSamples.exit(() =>
        withoutTrace(async () => {
          await delay(25);
          try {
            for (let i = 0; i < account.count; i += 16) {
              this.#abort.signal.throwIfAborted();
              const page = Array.from({ length: Math.min(16, account.count - i) }, (_, j) =>
                personAt(account, i + j),
              );
              const answers = await this.answers(page, position, policy);
              const started = performance.now();
              const ops = answers.map((answer, j) =>
                stringFact(
                  this.releasePerson(release, page[j]!),
                  attrs.answer,
                  JSON.stringify(answer),
                  this.fixture.currentAt,
                ),
              );
              const meta = { actor: "playground-publish", commandId: `publish:${id}:${i}` };
              const write =
                importAt === undefined
                  ? await this.transact(ops, meta)
                  : await this.run(
                      withDatomicImportClock(
                        this.scope,
                        importAt + 1 + i,
                        Effect.flatMap(Triples, (store) => store.transact(ops, meta)),
                      ),
                    );
              release.writePosition = write.position;
              release.written += answers.length;
              release.lastWriteMs = performance.now() - started;
            }
            release.state = "complete";
          } catch (error) {
            release.state = "failed";
            release.error = error instanceof Error ? error.name : "BackgroundWriteError";
          } finally {
            release.backgroundMs = performance.now() - startedAt - release.firstAnswerMs;
            this.running.delete(account.id);
          }
        }),
      );
      this.running.set(account.id, task);
      return {
        records,
        receipt: release.receipt,
        position,
        releaseId: id,
        schema,
        firstAnswerMs: release.firstAnswerMs,
        progress: { state: release.state, written: 0, total: account.count },
      };
    } finally {
      this.publishing.delete(account.id);
    }
  }

  private async readRelease(account: Profile, person: Person, id: string): Promise<Result> {
    const release = this.releases.get(id);
    if (!release || release.account.id !== account.id)
      throw new ActionError(404, "ReleaseNotFound", "Choose a release from this account");
    const { state, written, writePosition, lastWriteMs, firstAnswerMs, backgroundMs, error } =
      release;
    const rows = written ? await this.rows(this.releasePerson(release, person), writePosition) : [];
    const records = rows.map((r) => JSON.parse(r.value_string!));
    return {
      records,
      receipt: release.receipt,
      position: writePosition,
      releaseId: id,
      schema: release.schema,
      firstAnswerMs,
      progress: { state, written, total: account.count, lastWriteMs, backgroundMs, error },
    };
  }

  private async load(saves: number, reads: number, seconds: number): Promise<Result> {
    if (this.loadActive)
      throw new ActionError(409, "LoadBusy", "A laptop load run is already active");
    if (saves + reads === 0)
      throw new ActionError(400, "EmptyLoad", "Choose a save or read rate above zero");
    this.loadActive = true;
    const person = personId(this.fixture.accounts[0]!, 0);
    const start = performance.now();
    const exercise = async (kind: "save" | "read", rate: number) => {
      const samples: number[] = [];
      let errors = 0;
      for (let i = 0; i < rate * seconds; i++) {
        this.#abort.signal.throwIfAborted();
        const due = start + (1000 * i) / rate;
        await delay(Math.max(0, due - performance.now()), undefined, {
          signal: this.#abort.signal,
        });
        try {
          if (kind === "save")
            await this.save(
              this.loadPerson,
              await this.head(),
              { [attrs.note]: `Load ${i + 1}` },
              randomUUID(),
            );
          else await this.rows(person, await this.head());
          samples.push(performance.now() - due);
        } catch {
          errors++;
        }
      }
      const sorted = samples.toSorted((a, b) => a - b);
      const percentile = (fraction: number) =>
        sorted[Math.ceil(fraction * sorted.length) - 1] ?? null;
      return {
        kind,
        requested: rate * seconds,
        completed: samples.length,
        errors,
        p50Ms: percentile(0.5),
        p99Ms: percentile(0.99),
      };
    };
    try {
      return {
        records: await Promise.all([exercise("save", saves), exercise("read", reads)]),
        position: await this.head(),
        label: "Laptop diagnostic",
        elapsedMs: performance.now() - start,
      };
    } finally {
      this.loadActive = false;
    }
  }

  async execute(action: Action, input: Payload): Promise<Result> {
    switch (action) {
      case "accounts": {
        const first = personId(this.fixture.accounts[0]!, 0);
        return {
          records: this.fixture.accounts.map(({ id, name, shape, count }) => ({
            id,
            name,
            shape,
            people: count,
          })),
          position: await this.head(),
          fixtureSha256: this.source.checksum,
          earlyPosition: this.earlyPosition,
          earlyAt: this.fixture.earlyAt,
          currentAt: this.fixture.currentAt,
          firstRelease: this.firstRelease,
          examples: nativeExamples(first),
          eraseUnavailable: ERASE_UNAVAILABLE,
        };
      }
      case "people": {
        const account = this.account(input);
        const offset = input.offset ?? 0,
          limit = input.limit ?? 100;
        return {
          records: Array.from(
            { length: Math.max(0, Math.min(limit, account.count - offset)) },
            (_, i) => ({
              id: personId(account, offset + i),
              name: personName(account, offset + i),
            }),
          ),
          position: await this.head(),
          nextOffset: offset + limit < account.count ? offset + limit : null,
        };
      }
      case "current": {
        const { person } = this.person(input);
        const position = await this.head();
        return {
          records: fields(await this.personRows(person, position)),
          position,
          validAt: this.fixture.currentAt,
        };
      }
      case "earlier": {
        const { person } = this.person(input);
        const position = input.position ?? this.earlyPosition;
        const validAt = input.validAt ?? this.fixture.earlyAt;
        const currentPosition = await this.head();
        const [historical, current] = await Promise.all([
          this.personRows(person, position, validAt),
          this.personRows(person, currentPosition),
        ]);
        const before = new Map(
          fields(historical).map((r) => [JSON.stringify([r.entityId, r.attribute]), r.value]),
        );
        const now = new Map(
          fields(current).map((r) => [JSON.stringify([r.entityId, r.attribute]), r.value]),
        );
        const diff = [...new Set([...before.keys(), ...now.keys()])]
          .sort()
          .filter((a) => before.get(a) !== now.get(a))
          .map((key) => {
            const [entityId, attribute] = JSON.parse(key) as [string, string];
            return {
              entityId,
              attribute,
              earlier: before.get(key) ?? null,
              current: now.get(key) ?? null,
            };
          });
        return { records: fields(historical), position, validAt, currentPosition, diff };
      }
      case "history": {
        const { person } = this.person(input);
        if (input.beforePosition !== undefined && input.snapshotPosition === undefined)
          throw new ActionError(
            400,
            "MissingSnapshotPosition",
            "Pass snapshotPosition with beforePosition",
          );
        const page = await this.run(
          Effect.flatMap(Triples, (store) =>
            store.transactionsForEntity(EntityId.make(person.id), {
              limit: 24,
              ...(input.snapshotPosition === undefined
                ? {}
                : { snapshotPosition: input.snapshotPosition }),
              ...(input.beforePosition === undefined
                ? {}
                : { beforePosition: input.beforePosition }),
            }),
          ),
        );
        return {
          records: page.transactions.map((tx) => ({
            ...tx,
            changes: tx.changes.filter((c) => c.entityId === person.id),
          })),
          position: page.snapshotPosition,
          nextBeforePosition: page.nextBeforePosition ?? null,
        };
      }
      case "feed": {
        const start = await this.writer.basis(this.db);
        const fromT = input.fromT ?? String(BigInt(start.t.v) + 1n);
        if (BigInt(fromT) > 9223372036854775807n)
          throw new ActionError(
            400,
            "InvalidCursor",
            "The native cursor exceeds a signed 64-bit tick",
          );
        // [DX-PLAY1] Why: the reader owns the feed notification queue while saves and releases use the write peer.
        // Rejected: repeatedly opening and closing a native watch on the same peer that commits interactive writes.
        const page = await this.reader.log(this.db, fromT, 40, input.waitMs ?? 0);
        return { records: page.rows, position: Number(start.position.v), fromT, nextT: page.nextT };
      }
      case "save":
      case "duplicate": {
        const { person } = this.person(input);
        const first = await this.save(
          person.id,
          input.expectedPosition!,
          input.changes!,
          input.commandId!,
        );
        if (action === "save") return first;
        const second = await this.save(
          person.id,
          input.expectedPosition!,
          input.changes!,
          input.commandId!,
        );
        return {
          ...second,
          attempts: [
            { receipt: first.receipt, duplicate: first.duplicate },
            { receipt: second.receipt, duplicate: second.duplicate },
          ],
        };
      }
      case "publish": {
        const { account, person } = this.person(input);
        return this.publish(account, person, {
          label: input.label!,
          reviewStatus: input.reviewStatus!,
        });
      }
      case "release": {
        const { account, person } = this.person(input);
        return this.readRelease(account, person, input.releaseId!);
      }
      case "erase": {
        this.person(input);
        throw new ActionError(503, "ErasureUnavailable", ERASE_UNAVAILABLE);
      }
      case "native": {
        const position = input.position ?? (await this.head());
        try {
          const result = await this.reader.request<{ rows: unknown[][]; route: string }>(
            "POST",
            `/v1/db/${this.db}/q`,
            {
              edn: input.query,
              basis: { recordedPosition: position, validAt: this.fixture.currentAt },
              timeoutMs: 1500,
              basisWaitMs: 2000,
            },
          );
          return {
            records: result.rows.slice(0, 200),
            position,
            route: result.route,
            totalRows: result.rows.length,
            truncated: result.rows.length > 200,
          };
        } catch (error) {
          if (error instanceof DatomicHttpError && [400, 409, 422].includes(error.status))
            throw new ActionError(
              400,
              error.code,
              "The Datomic gateway rejected this query or basis",
            );
          throw error;
        }
      }
      case "load":
        return this.load(input.savesPerSecond!, input.readsPerSecond!, input.seconds!);
    }
  }

  async close() {
    this.#abort.abort();
    await Promise.allSettled(this.running.values());
    await this.store.dispose();
    this.writer.close();
    this.reader.close();
  }
}
