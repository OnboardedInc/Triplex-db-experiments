import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { activePerson } from "./cohort.ts";
import { DatabaseSync } from "node:sqlite";
import { Option } from "effect";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { answersOnly } from "../../../bench/lib/thin-activation.ts";
import { seedOps } from "../../../bench/lib/commands.ts";
import type {
  Basis,
  CompositionHandle,
  Receipt,
  PullResult,
} from "../../../bench/lib/composition.ts";
import { policyWorld } from "../../../bench/lib/deep-activation.ts";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { W0, V_W0, worldOf, type WorldRow } from "../../../bench/lib/w0-world.ts";
import { ids, SEED_VALID_FROM, subjectOf } from "../../../bench/lib/world.ts";
import { tenantRows, tenantQueries, type Account as TenantAccount } from "../scale1/tenants.ts";
import { MembershipProof } from "../scale1/tenant-proof.ts";
import { intent, person } from "../thin1/population.ts";
export const digest = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export type Shape = "thin" | "deep";
export const policyId = (i: number) => W0.placementId(i);
export const rootOf = (shape: Shape, i: number) =>
  shape === "deep" ? ids.placement(i) : policyId(i);
export function seedFacts(shape: Shape, i: number, first = 0, tenant?: TenantAccount) {
  if (tenant) {
    assert(shape === "deep" && first === tenant.first);
    return seedOps(tenantRows(tenant, i - first));
  }
  if (shape === "deep") {
    const local = i - first,
      rows = seedOps(deepOwnFacts(local));
    if (!first) return rows;
    // [DX-INT1] Why: both placements use the same account-local deep fixture, with disjoint public IDs when accounts share a physical scope.
    // Rejected: changing field values and task distributions by generating later accounts at global ordinals.
    const remap = (id: string) => {
      assert.equal(subjectOf(id), local);
      return id.replace(/:\d{8}/, ":" + String(i).padStart(8, "0"));
    };
    return rows.map((op) => ({
      ...op,
      entityId: remap(op.entityId),
      value:
        op.value.type === "ref" ? { ...op.value, value: remap(String(op.value.value)) } : op.value,
    }));
  }
  const to = (s: string) => s.replace(person(i), policyId(i));
  return intent(i).map((op) => ({
    ...op,
    entityId: to(op.entityId),
    value: op.value.type === "ref" ? { type: "ref", value: to(op.value.value) } : op.value,
    validFrom: SEED_VALID_FROM,
  }));
}
const key = (r: any) =>
  JSON.stringify([
    r.entityId,
    r.attribute,
    r.value.type,
    r.value.value,
    r.validFrom,
    r.validTo?._tag === "Some"
      ? r.validTo.value
      : r.validTo?._tag === "None"
        ? null
        : (r.validTo ?? null),
  ]);
const publicRow = (op: any, id: string, r: Receipt) => ({
  id,
  entityId: op.entityId,
  attribute: op.attribute,
  value: op.value,
  recordedAt: r.instant,
  validFrom: op.validFrom,
  validTo: Option.none(),
  retractedAt: Option.none(),
  createdBy: Option.some("import"),
  schemaVersion: Option.some(1),
  entityType: Option.none(),
  txId: Option.some(r.txId),
  retractTxId: Option.none(),
});
export class Account {
  private readonly deferSeedFeed: boolean;
  readonly comp: CompositionHandle;
  readonly shape: Shape;
  readonly binding: string;
  readonly first: number;
  readonly count: number;
  readonly db: DatabaseSync;
  readonly cursor: { position: number };
  readonly tenant?: TenantAccount;
  readonly membership?: MembershipProof;
  private readonly seedInputs = createHash("sha256");
  get seedIntent() {
    return this.tenant ? this.seedInputs.copy().digest("hex") : undefined;
  }
  constructor(
    comp: CompositionHandle,
    shape: Shape,
    binding: string,
    first: number,
    count: number,
    db: DatabaseSync,
    cursor = { position: 0 },
    tenant?: TenantAccount,
    membership?: MembershipProof,
    deferSeedFeed = false,
  ) {
    this.deferSeedFeed = deferSeedFeed;
    this.tenant = tenant;
    this.membership = tenant ? (membership ?? new MembershipProof()) : undefined;
    if (tenant) assert(tenant.first === first && tenant.people === count && shape === "deep");
    this.comp = comp;
    this.shape = shape;
    this.binding = binding;
    this.first = first;
    this.count = count;
    this.db = db;
    this.cursor = cursor;
    db.exec(
      "PRAGMA cache_size=-2048; PRAGMA journal_mode=WAL; CREATE TABLE people(i INTEGER PRIMARY KEY, born INTEGER NOT NULL, policy TEXT, dirty INTEGER, hash TEXT NOT NULL); CREATE TABLE wanted(i INTEGER,p INTEGER,body TEXT,PRIMARY KEY(i,p)); CREATE TABLE tx(p INTEGER PRIMARY KEY,cmd TEXT NOT NULL,instant REAL NOT NULL,body TEXT)",
    );
    if (this.deferSeedFeed) db.exec("CREATE TABLE seed_feed(p INTEGER PRIMARY KEY, txid TEXT NOT NULL, changes INTEGER NOT NULL, hash TEXT NOT NULL)");
  }
  get head() {
    return this.cursor.position;
  }
  set head(value: number) {
    this.cursor.position = value;
  }
  facts = 0;
  commits: number[] = [];
  seedWallMs = 0;
  seedAckMs = 0;
  sourceWorldReads = 0;
  reads = 0;
  ryow = 0;
  timeline: any[] = [];
  isTouched(i: number) {
    const local = i - this.first;
    return local === activePerson(Math.floor(local / 50), this.count, process.env.DX_INT1_COHORT === "spread");
  }
  private original(i: number, rows: WorldRow[], p: number) {
    return this.shape === "deep"
      ? policyWorld(i, this.tenant ? rows.filter((r) => subjectOf(r.entityId) === i) : rows, {
          position: p,
          validAt: V_W0,
        })
      : worldOf(policyId(i), rows);
  }
  async seed(members: number[]) {
    const started = performance.now();
    const groups = members.map((i) => seedFacts(this.shape, i, this.first, this.tenant));
    const { receipt, assigned, ops, tx } = await this.issue(groups.flat(), true);
    this.db.exec("BEGIN");
    try {
      const add = this.db.prepare("INSERT INTO people VALUES(?,?,?,NULL,?)");
      let offset = 0;
      for (const [n, i] of members.entries()) {
        const g = groups[n]!,
          seen = g.map((op, j) => ({
            ...op,
            id: assigned[offset + j]!,
            position: receipt.position,
          }));
        // [DX-INT1] Why: certify complete ordered source assertions before persisting the policy projection. Unknown later writes require a pinned source read.
        // Rejected: rebuilding a cold person's entire closure in every reader at activation.
        if (this.tenant) this.seedInputs.update(JSON.stringify([i, g]) + "\n");
        const certified =
          this.shape === "thin" &&
          answersOnly(
            policyId(i),
            seen.map((op) => ({ ...op, op: "assert" as const, tripleId: op.id })),
            receipt.position,
          );
        const data = certified ? null : JSON.stringify(this.original(i, seen, receipt.position));
        add.run(
          i,
          receipt.position,
          data,
          digest(JSON.stringify([this.binding, i, receipt.position, data])),
        );
        if (this.isTouched(i) || this.sample(i))
          this.saveRows(i, g, assigned.slice(offset, offset + g.length), receipt);
        offset += g.length;
      }
      this.saveTx(
        receipt,
        tx,
        ops,
        assigned,
        members.some((i) => this.sample(i)),
      );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    this.membership?.bind(receipt);
    this.facts += ops.length;
    this.seedWallMs += performance.now() - started;
  }
  sample(i: number) {
    return (
      i === this.first ||
      i === this.first + 1 ||
      i === this.first + activePerson(Math.floor((this.count - 1) / 50), this.count, process.env.DX_INT1_COHORT === "spread") ||
      (process.env.DX_INT1_COHORT === "spread" && this.shape === "deep" &&
        i - this.first === activePerson(39, this.count, true) && this.count >= 2000)
    );
  }
  private saveTx(r: Receipt, cmd: string, ops: any[], ids: string[], keep: boolean) {
    this.db.prepare("INSERT INTO tx VALUES(?,?,?,?)").run(
      r.position,
      cmd,
      r.instant,
      keep
        ? JSON.stringify({
            commandId: cmd,
            operations: ops,
            actor: "import",
            preconditions: [],
            receipt: {
              position: r.position,
              instant: r.instant,
              txId: r.txId,
              assertionIds: ids,
            },
          })
        : null,
    );
  }
  private saveRows(i: number, ops: any[], ids: string[], r: Receipt) {
    this.db
      .prepare("INSERT INTO wanted VALUES(?,?,?)")
      .run(
        i,
        r.position,
        JSON.stringify(
          ops
            .map((op, j) => ({ op, id: ids[j], instant: r.instant, txId: r.txId }))
            .filter((row) => !this.tenant || subjectOf(row.op.entityId) === i),
        ),
      );
  }
  private async issue(ops: any[], seed: boolean) {
    const tx = this.binding.slice(0, 18) + "-" + (this.head + 1);
    const t = performance.now();
    const ack = await this.comp.transact(ops, { commandId: tx, actor: "import" });
    if (!ack.ok) {
      const cause = ack.error as { message?: string; cause?: { message?: string } };
      throw Error(
        `Import at position ${this.head + 1} with ${ops.length} operations: ${ack.tag} ${cause?.message ?? ""} ${cause?.cause?.message ?? ""}`,
      );
    }
    if (!seed) this.commits.push(performance.now() - t);
    else this.seedAckMs += performance.now() - t;
    const receipt = ack.value;
    assert.equal(receipt.position, this.head + 1);
    assert(Number.isFinite(receipt.instant) && receipt.txId);
    assert.equal(receipt.triples.length, ops.length);
    const ids = new Map(receipt.triples.map((r) => [key(r), r.id]));
    const assigned = ops.map((op) => {
      const id = ids.get(key(op));
      assert(id);
      return id;
    });
    assert.equal(ids.size, ops.length);
    assert.equal(new Set(assigned).size, ops.length);
    const changes = ops.map((op,j) => JSON.stringify(["assert", key(op), assigned[j]])).sort();
    if (seed && this.deferSeedFeed) {
      // [DX-THIN1] Why: price a writer that imports without also serving the verifier's full transaction feed. Rejected: omitting the independent feed check or retaining all expected changes in RAM.
      this.db.prepare("INSERT INTO seed_feed VALUES(?,?,?,?)").run(receipt.position,receipt.txId,changes.length,digest(JSON.stringify(changes)));
    } else {
      const actual = await this.feedChanges(receipt.position,receipt.txId,tx,receipt.instant);
      assert.deepEqual(actual,changes);
    }
    this.head = receipt.position;
    return { receipt, assigned, ops, tx };
  }
  private async feedChanges(p: number, txid: string, command: string, instant: number): Promise<string[]> {
    const page = await this.comp.feedPage(p-1,1);
    const actual = page.transactions[0];
    assert(page.transactions.length === 1 && actual && actual.position === p && actual.txId === txid &&
      actual.commandId === command && actual.instant === instant);
    return actual.changes.map((c: any) => JSON.stringify([c.op,key(c),c.tripleId])).sort();
  }
  async verifySeedFeed(checkpoint: () => Promise<void>) {
    if (!this.deferSeedFeed) return undefined;
    let count = 0, facts = 0;
    const seal = createHash("sha256");
    for (const row of this.db.prepare("SELECT s.*,t.cmd,t.instant FROM seed_feed s JOIN tx t ON t.p=s.p ORDER BY s.p").iterate()) {
      await checkpoint();
      const actual = await this.feedChanges(Number(row.p),String(row.txid),String(row.cmd),Number(row.instant));
      const hash = digest(JSON.stringify(actual));
      assert.equal(actual.length,row.changes);
      assert.equal(hash,row.hash);
      seal.update(JSON.stringify([this.binding,row.p,row.txid,row.cmd,row.instant,hash])+"\n");
      count++; facts += actual.length;
    }
    assert.equal(count, this.db.prepare("SELECT count(DISTINCT born) AS n FROM people").get()!.n);
    assert.equal(facts,this.facts);
    return { count, facts, sha256: seal.digest("hex") };
  }
  async update(i: number) {
    const op = {
      op: "assert",
      entityId: rootOf(this.shape, i),
      attribute: this.shape === "thin" ? "bgcStatus" : ":int1/activity",
      value: { type: "string", value: "consider" },
      validFrom: SEED_VALID_FROM + 1,
    };
    const { receipt, assigned, ops, tx } = await this.issue([op], false);
    this.db.exec("BEGIN");
    try {
      this.saveRows(i, ops, assigned, receipt);
      assert.equal(
        this.db
          .prepare("UPDATE people SET dirty=coalesce(dirty,?) WHERE i=?")
          .run(receipt.position, i).changes,
        1,
      );
      this.saveTx(receipt, tx, ops, assigned, this.sample(i));
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return receipt;
  }
  expected(i: number, p: number, v: number) {
    return this.db
      .prepare("SELECT body FROM wanted WHERE i=? AND p<=? ORDER BY p")
      .all(i, p)
      .flatMap((x) =>
        JSON.parse(String(x.body))
          .filter((r: any) => r.op.validFrom <= v)
          .map((r: any) => publicRow(r.op, r.id, { instant: r.instant, txId: r.txId } as Receipt)),
      );
  }
  verify(i: number, p: number, v: number, result: PullResult) {
    const want = this.expected(i, p, v);
    assert.equal(canonicalWorld(result.triples), canonicalWorld(want));
    this.reads++;
    if (this.sample(i) && this.timeline.length < 18) {
      const tx = this.db.prepare("SELECT instant FROM tx WHERE p=?").get(p);
      if (tx)
        this.timeline.push({
          p,
          subject: i,
          basis: { recordedAt: Number(tx.instant), validAt: v },
          roots: [
            ...new Set([
              rootOf(this.shape, i),
              ...seedFacts(this.shape, i, this.first).map((x) => x.entityId),
              ...seedFacts(this.shape, i, this.first)
                .filter((x) => x.value.type === "ref")
                .map((x) => String(x.value.value)),
            ]),
          ],
          rows: result.triples.map((r) => [
            r.entityId,
            r.attribute,
            r.value,
            r.validFrom ?? null,
            r.validTo?._tag === "Some" ? r.validTo.value : null,
            r.id,
          ]),
        });
    }
  }
  roster() {
    const h = createHash("sha256").update("[");
    let n = 0;
    for (const r of this.db.prepare("SELECT i FROM people ORDER BY i").iterate()) {
      assert.equal(Number(r.i), this.first + n);
      h.update((n++ ? "," : "") + JSON.stringify(policyId(Number(r.i))));
    }
    assert.equal(n, this.count);
    return h.update("]").digest("hex");
  }
  async world(i: number, p: number, original = false) {
    const r = this.db.prepare("SELECT * FROM people WHERE i=? AND born<=?").get(i, p);
    assert(r);
    const b = Number(r.born),
      data = r.policy;
    assert.equal(r.hash, digest(JSON.stringify([this.binding, i, b, data])));
    if (r.dirty !== null && Number(r.dirty) <= p) {
      this.sourceWorldReads++;
      const cut = { position: p, validAt: V_W0 };
      const page = await this.comp.sweepPage([rootOf(this.shape, i)], cut);
      assert.deepEqual(page.reportedBasis, cut);
      return this.original(i, [...page.rows], p);
    }
    if (data !== null) return JSON.parse(String(data)) as W0.World;
    if (original)
      return this.original(
        i,
        seedFacts("thin", i).map((op, j) => ({ ...op, id: "expected" + j, position: b })),
        p,
      );
    return { subject: policyId(i), facts: [] } as W0.World;
  }
  oracleWorld(i: number, p: number) {
    const r = this.db.prepare("SELECT born,dirty FROM people WHERE i=?").get(i)!;
    const b = Number(r.born);
    const rows: WorldRow[] = seedFacts(this.shape, i, this.first, this.tenant).map((op, j) => ({
      ...op,
      id: "intent-" + j,
      position: b,
    }));
    if (r.dirty !== null && Number(r.dirty) <= p)
      rows.push({
        id: "change",
        entityId: rootOf(this.shape, i),
        attribute: this.shape === "thin" ? "bgcStatus" : ":int1/activity",
        value: { type: "string", value: "consider" },
        validFrom: SEED_VALID_FROM + 1,
        position: Number(r.dirty),
      });
    return this.original(i, rows, p);
  }
  async pinned(i: number, p: number, v = V_W0) {
    return this.comp.pull(rootOf(this.shape, i), { recordedPosition: p, validAt: v } as Basis);
  }
}

export async function verifyTenants(accounts: Account[]) {
  const groups = new Map<CompositionHandle, Account[]>();
  for (const a of accounts)
    if (a.tenant) {
      const group = groups.get(a.comp);
      if (group) group.push(a);
      else groups.set(a.comp, [a]);
    }
  const receipts = [];
  for (const [comp, members] of groups) {
    const head = await comp.currentPosition();
    const tenantList = members.map((a) => a.tenant!);
    const result = await tenantQueries(comp, tenantList, { position: head, validAt: V_W0 });
    assert.deepEqual(result.receiptProjection, members[0]!.membership!.value());
    const counts = Object.fromEntries(tenantList.map((a) => [a.key, a.people]));
    assert.deepEqual(result.counts, counts);
    receipts.push({
      scope: comp.scopeName,
      basis: result.basis,
      counts,
      total: result.total,
      receiptProjection: result.receiptProjection,
      ordered: result.membershipSha256,
    });
  }
  return receipts;
}
