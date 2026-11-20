import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { seedOps } from "./commands.ts";
import type { CompositionHandle } from "./composition.ts";
import { deepOwnFacts } from "./deep-world.ts";
import { ids, SEED_VALID_FROM, subjectOf, type Fact } from "./world.ts";
import { canonical, W0, type WorldRow, type PositionBasis } from "./w0-world.ts";
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const key = (c: any) =>
  canonical([c.entityId, c.attribute, c.value, c.validFrom, c.validTo ?? null]);
type Project = (i: number, rows: readonly WorldRow[], basis: PositionBasis) => W0.World;
// [DX-INT1] Why: a complete deep import has only owned edges. Its policy projection stays exact until the first later change to any owned entity.
// Rejected: populating the live replica for a sweep, or assuming partial imports and later corrections preserve the certificate.
export class DeepProjectionIndex {
  private readonly db: DatabaseSync;
  readonly binding: string;
  sourceWorldPulls = 0;
  get diskBytes() {
    return (
      Number(this.db.prepare("PRAGMA page_count").get()!.page_count) *
      Number(this.db.prepare("PRAGMA page_size").get()!.page_size)
    );
  }
  private readonly project: Project;
  private readonly seedFor: (person: number) => Fact[] | undefined;
  constructor(
    file: string,
    binding: string,
    project: Project,
    seedFor: (person: number) => Fact[] | undefined = deepOwnFacts,
  ) {
    this.seedFor = seedFor;
    this.binding = binding;
    this.project = project;
    this.db = new DatabaseSync(file);
    try {
      this.db.exec(
        "PRAGMA cache_size=-2048; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS cursor(binding TEXT PRIMARY KEY, p INTEGER NOT NULL, last_tx TEXT, last_hash TEXT); CREATE TABLE IF NOT EXISTS members(i INTEGER PRIMARY KEY, born INTEGER NOT NULL, dirty INTEGER, policy TEXT, digest TEXT)",
      );
      this.db
        .prepare("INSERT INTO cursor SELECT ?,0,NULL,NULL WHERE NOT EXISTS(SELECT 1 FROM cursor)")
        .run(binding);
      assert.equal(this.db.prepare("SELECT binding FROM cursor").get()?.binding, binding);
    } catch (e) {
      this.close();
      throw e;
    }
  }
  async catchUp(comp: CompositionHandle, cut: PositionBasis) {
    const cursor = this.db.prepare("SELECT * FROM cursor").get()!;
    const from = Number(cursor.p);
    let p = from,
      certifiedImports = 0;
    if (p) {
      const page = await comp.feedPage(p - 1, 1),
        prior = page.transactions[0];
      assert(
        prior &&
          prior.position === p &&
          prior.txId === cursor.last_tx &&
          hash(prior) === cursor.last_hash,
        "Stored prefix differs from the live source",
      );
    }
    while (p < cut.position) {
      const limit = Math.min(16, cut.position - p),
        page = await comp.feedPage(p, limit);
      assert(page.transactions.length > 0 && page.transactions.length <= limit);
      this.db.exec("BEGIN IMMEDIATE");
      try {
        for (const tx of page.transactions) {
          assert.equal(tx.position, ++p);
          assert(tx.txId && Number.isFinite(tx.instant) && Array.isArray(tx.changes));
          const groups = new Map<number, any[]>();
          for (const c of tx.changes) {
            assert(c.tripleId && typeof c.entityId === "string");
            const i = subjectOf(c.entityId);
            if (i === null) continue;
            const rows = groups.get(i);
            if (rows) rows.push(c);
            else groups.set(i, [c]);
          }
          for (const [i, rows] of groups) {
            if (
              this.db.prepare("UPDATE members SET dirty=coalesce(dirty,?) WHERE i=?").run(p, i)
                .changes
            )
              continue;
            const seed = this.seedFor(i);
            if (!seed) continue;
            const expected = seedOps(seed);
            let policy: string | null = null;
            if (
              rows.length === expected.length &&
              rows.every(
                (c) => c.op === "assert" && c.validFrom === SEED_VALID_FROM && c.validTo == null,
              ) &&
              new Set(rows.map((c) => c.tripleId)).size === rows.length &&
              canonical(rows.map(key).sort()) === canonical(expected.map(key).sort())
            ) {
              certifiedImports++;
              policy = canonical(
                this.project(
                  i,
                  rows.map((c) => ({ ...c, id: c.tripleId, position: p })),
                  { position: p, validAt: SEED_VALID_FROM },
                ),
              );
            }
            this.db
              .prepare("INSERT INTO members VALUES(?,?,?,?,?)")
              .run(i, p, policy === null ? p : null, policy, hash([this.binding, i, p, policy]));
          }
        }
        const last = page.transactions.at(-1)!;
        this.db
          .prepare("UPDATE cursor SET p=?,last_tx=?,last_hash=? WHERE binding=?")
          .run(p, last.txId, hash(last), this.binding);
        this.db.exec("COMMIT");
      } catch (e) {
        this.db.exec("ROLLBACK");
        throw e;
      }
    }
    return { from, through: p, certifiedImports };
  }
  async worlds(comp: CompositionHandle, group: readonly number[], cut: PositionBasis) {
    const worlds = new Map<number, W0.World>(),
      missing: number[] = [];
    for (const i of group) {
      const row = this.db.prepare("SELECT * FROM members WHERE i=?").get(i);
      if (
        !row ||
        !row.policy ||
        Number(row.born) > cut.position ||
        (row.dirty !== null && Number(row.dirty) <= cut.position) ||
        cut.validAt < SEED_VALID_FROM
      ) {
        missing.push(i);
        continue;
      }
      assert.equal(row.digest, hash([this.binding, i, Number(row.born), row.policy]));
      worlds.set(i, JSON.parse(String(row.policy)));
    }
    for (let offset = 0; offset < missing.length; offset += 32) {
      const batch = missing.slice(offset, offset + 32);
      this.sourceWorldPulls += batch.length;
      const page = await comp.sweepPage(batch.map(ids.placement), cut);
      assert.deepEqual(page.reportedBasis, cut);
      for (const i of batch)
        worlds.set(
          i,
          this.project(
            i,
            page.rows.filter((r) => subjectOf(r.entityId) === i),
            cut,
          ),
        );
    }
    return worlds;
  }
  close() {
    this.db.close();
  }
}
