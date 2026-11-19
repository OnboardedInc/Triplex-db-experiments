import { createHash } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { W0 } from "./w0-world.ts";
import { typed } from "./canonical.ts";

export interface ImportChange {
  op: "assert" | "retract";
  entityId: string;
  attribute: string;
  tripleId: string;
  value?: { type: string; value: unknown };
  validFrom?: number;
  validTo?: number;
}
export interface ImportJournal {
  position: number;
  txId: string;
  instant: number;
  commandId?: string;
  changes: readonly ImportChange[];
}
interface Member {
  id: string;
  dirty: number | null;
}
interface Coverage {
  count: number;
  sha256: string;
}
const digest = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
// [DX-THIN1] Why: these exact release documents were checked against the independent evaluator on original answer worlds.
// Rejected: the whole release registry, which may gain a release that reads an answer.
const answerIndependentReleases = new Set([
  "sha256:fd57551afda2da8e660685b587d1c2da6a2d18790ead2fb0762e69931d34b031",
  "sha256:7d2f4008e55f43458ae1288cb65a4cf92f3f04a40a1c6eeafb3fc754435807a9",
  "sha256:f345d9fe4291803259021ad30ff00afecc1f48af4d4b403860b3ace52315312e",
]);

export function rosterDigest(ids: Iterable<string>): Coverage {
  const hash = createHash("sha256").update("[");
  let count = 0,
    previous = "";
  for (const id of ids) {
    if (!W0.isPlacementId(id) || id <= previous) throw Error("Invalid or unordered roster member");
    hash.update((count++ ? "," : "") + JSON.stringify(id));
    previous = id;
  }
  return { count, sha256: hash.update("]").digest("hex") };
}

function answersOnly(subject: string, changes: readonly ImportChange[], tx: number) {
  const facts: W0.World["facts"][number][] = [];
  for (const c of changes) {
    const v = c.value;
    if (c.op !== "assert" || !v || typeof v.value !== "string") return false;
    const allowed =
      c.entityId === subject
        ? c.attribute === "answers" && v.type === "ref"
        : W0.allowedKind(c.entityId, subject) === "answer" &&
          (c.attribute === "field" || c.attribute === "value") &&
          v.type === "string";
    if (!allowed) return false;
    facts.push({ e: c.entityId, a: c.attribute, v: v.value, tx });
  }
  return typeof W0.indexWorld({ subject, facts }, tx) !== "string";
}

// [DX-THIN1] Why: immutable first-change positions let a release finish at its original cut after a live correction.
// Rejected: a process-local active bit, a last-write timestamp, or assuming a never-read person has no work.
export class ThinRoster {
  private readonly db: DatabaseSync;
  private readonly lookup;
  private readonly addMember;
  private readonly addJournal;
  private readonly last;
  private readonly members;
  readonly binding: string;
  constructor(file: string, binding: string, create = true) {
    if (!binding) throw Error("Missing scope/generation binding");
    this.binding = binding;
    if (create) closeSync(openSync(file, "wx"));
    this.db = new DatabaseSync(file);
    try {
      this.db.exec("PRAGMA cache_size=-4096; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL");
      if (create) {
        this.db.exec(`CREATE TABLE scope (binding TEXT NOT NULL);
          CREATE TABLE journal (p INTEGER PRIMARY KEY, tx TEXT UNIQUE NOT NULL, hash TEXT NOT NULL);
          CREATE TABLE people (id TEXT PRIMARY KEY, born INTEGER, dirty INTEGER) WITHOUT ROWID`);
        this.db.prepare("INSERT INTO scope VALUES (?)").run(binding);
      }
      if (this.db.prepare("SELECT binding FROM scope").get()?.binding !== binding)
        throw Error("Roster binding differs");
      this.lookup = this.db.prepare("SELECT hash FROM journal WHERE p=?");
      this.addJournal = this.db.prepare("INSERT INTO journal VALUES (?, ?, ?)");
      this.addMember = this.db
        .prepare(`INSERT INTO people VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET
        born=coalesce(people.born,excluded.born), dirty=coalesce(people.dirty,?)`);
      this.last = this.db.prepare("SELECT coalesce(max(p),0) AS p FROM journal");
      this.members = this.db.prepare(
        "SELECT id,dirty FROM people WHERE born<=? AND id>? ORDER BY id LIMIT 64",
      );
    } catch (e) {
      this.db.close();
      throw e;
    }
  }
  get head() {
    return Number(this.last.get()!.p);
  }
  close() {
    this.db.close();
  }
  apply(binding: string, tx: ImportJournal) {
    if (
      binding !== this.binding ||
      !Number.isSafeInteger(tx.position) ||
      tx.position < 1 ||
      !tx.txId ||
      !Number.isFinite(tx.instant) ||
      !Array.isArray(tx.changes)
    )
      throw Error("Invalid scoped journal");
    const hash = digest(JSON.stringify(typed(tx)));
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (tx.position <= this.head) {
        if (this.lookup.get(tx.position)?.hash !== hash) throw Error("Replayed journal differs");
      } else {
        if (tx.position !== this.head + 1) throw Error("Roster feed gap");
        const groups = new Map<string, ImportChange[]>();
        for (const c of tx.changes) {
          if (
            !c.tripleId ||
            typeof c.entityId !== "string" ||
            typeof c.attribute !== "string" ||
            (c.op !== "assert" && c.op !== "retract")
          )
            throw Error("Malformed journal change");
          const owner = W0.classify(c.entityId)?.owner;
          if (!owner) continue;
          const group = groups.get(owner);
          if (group) group.push(c);
          else groups.set(owner, [c]);
        }
        for (const [id, changes] of groups) {
          const born = changes.some((c) => c.entityId === id && c.op === "assert")
            ? tx.position
            : null;
          this.addMember.run(
            id,
            born,
            born && answersOnly(id, changes, tx.position) ? null : tx.position,
            tx.position,
          );
        }
        this.addJournal.run(tx.position, tx.txId, hash);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private *scan(p: number): Generator<Member> {
    let after = "";
    for (;;) {
      const page = this.members.all(p, after);
      if (!page.length) return;
      for (const row of page) {
        after = String(row.id);
        yield { id: after, dirty: row.dirty === null ? null : Number(row.dirty) };
      }
    }
  }
  async activate(options: {
    binding: string;
    mode: "full" | "dependencies";
    basis: W0.Basis;
    release: W0.CompiledRelease;
    expected: Coverage;
    world: (subject: string, basis: W0.Basis) => Promise<W0.World>;
    publish: (records: readonly W0.EvaluationRecord[]) => Promise<void>;
  }) {
    const { basis, expected } = options;
    if (options.binding !== this.binding || W0.checkBasis(basis) || basis.tx > this.head)
      throw Error("Unavailable activation cut");
    const release = W0.compileRelease(options.release.doc);
    if (release.hash !== options.release.hash) throw Error("Release content hash differs");
    const roster = this;
    const coverage = rosterDigest(
      (function* () {
        for (const row of roster.scan(basis.tx)) yield row.id;
      })(),
    );
    if (coverage.count !== expected.count || coverage.sha256 !== expected.sha256)
      throw Error("Activation coverage differs");
    const known = answerIndependentReleases.has(release.hash);
    const hash = createHash("sha256");
    let dismissed = 0,
      evaluated = 0,
      batch: W0.EvaluationRecord[] = [];
    for (const { id, dirty } of this.scan(basis.tx)) {
      const cheap =
        options.mode === "dependencies" && known && (dirty === null || dirty > basis.tx);
      // [DX-THIN1] Why: absence itself triggers W0's bgc.order, with an ID derived from this subject.
      // Rejected: omitting the record or reusing an empty world's work-item ID across subjects.
      const world = cheap ? { subject: id, facts: [] } : await options.world(id, basis);
      if (world.subject !== id) throw Error("Activation subject differs");
      const result = W0.sweepSubject(world, release, basis);
      if ("error" in result) throw Error(result.error);
      const record = result.record;
      if (cheap) dismissed++;
      else evaluated++;
      hash.update(W0.canonicalPlain(record) + "\n");
      batch.push(record);
      if (batch.length === 64) {
        await options.publish(batch);
        batch = [];
      }
    }
    if (batch.length) await options.publish(batch);
    return {
      binding: this.binding,
      basis,
      release: release.hash,
      coverage,
      evaluated,
      dismissed,
      recordsSha256: hash.digest("hex"),
    };
  }
}
