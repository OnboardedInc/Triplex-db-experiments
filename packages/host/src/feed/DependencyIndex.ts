import type { DatabaseSync } from "node:sqlite";
import { feedBytes } from "@triplex-build/triplex/feed";
import type {
  AffectedSubject,
  FeedPage,
  FeedCursor,
  FeedCrashPoint,
} from "@triplex-build/triplex/feed";
import { SqliteConsumerStore, type ConsumerDeriver } from "./ConsumerStore.js";

export type DependencyPath = "subject" | "location" | "jurisdiction" | "documents" | "decisions";
export interface DependencyPlan {
  readonly release: string;
  readonly pairs: readonly (readonly [DependencyPath, string])[];
}
export interface ReferenceRow {
  readonly entity: string;
  readonly attribute: string;
  readonly value: string;
  readonly position: number;
  readonly validFrom: number;
  readonly validTo?: number;
  readonly retractedPosition?: number;
}
export type ReferenceReader = (
  entities: readonly string[],
  position: number,
  validAt: number,
) => Promise<readonly ReferenceRow[]>;
const references = new Set(["location", "jurisdiction", "documents", "decisions"]);
const placement = (s: string) => /^pl:[a-z0-9-]{1,32}$/.test(s);
export interface Boundary {
  readonly subject: string;
  readonly at: number;
  readonly kind: string;
}

// [EXP-DI01] Why: index only reference values and compiled read paths, never whole worlds. Rejected: pulling/evaluating every world on every feed page (P3 fanout cost).
export class DependencyIndex extends SqliteConsumerStore {
  constructor(
    file: string,
    readonly options: {
      consumer: string;
      validAt: number;
      initialRelease: string;
      plans: readonly DependencyPlan[];
      readRefs: ReferenceReader;
      resolveActivation: (
        values: readonly ReferenceRow[],
        position: number,
        validAt: number,
      ) => string;
    },
  ) {
    if (
      !Number.isFinite(options.validAt) ||
      !options.plans.some((p) => p.release === options.initialRelease)
    )
      throw Error("Invalid dependency basis/release");
    super(file);
  }
  private plan(release: string): DependencyPlan {
    const p = this.options.plans.find((p) => p.release === release);
    if (!p) throw Error("Unknown dependency release");
    return p;
  }
  private release(db: DatabaseSync): string {
    return String(
      db.prepare("SELECT release FROM di_release WHERE consumer=?").get(this.options.consumer)?.[
        "release"
      ] ?? this.options.initialRelease,
    );
  }
  private reachIn(
    db: DatabaseSync,
    pairs: readonly (readonly [string, string])[],
    release: string,
  ): string[] {
    const c = this.options.consumer,
      out = new Set<string>();
    for (const [entity, attribute] of pairs)
      for (const [path, a] of this.plan(release).pairs) {
        if (attribute !== a) continue;
        if (path === "subject") {
          if (placement(entity)) out.add(entity);
          continue;
        }
        const rows =
          path === "jurisdiction"
            ? db
                .prepare(
                  "SELECT s.entity FROM di_ref l INDEXED BY di_reverse_cover CROSS JOIN di_ref s INDEXED BY di_reverse_cover WHERE l.consumer=? AND l.attribute='jurisdiction' AND l.value=? AND s.consumer=l.consumer AND s.attribute='location' AND s.value=l.entity",
                )
                .all(c, entity)
            : db
                .prepare("SELECT entity FROM di_ref WHERE consumer=? AND attribute=? AND value=?")
                .all(c, path, entity);
        for (const r of rows) if (placement(String(r["entity"]))) out.add(String(r["entity"]));
      }
    return [...out].sort();
  }
  reach(pairs: readonly (readonly [string, string])[], release: string): string[] {
    return this.reachIn(this.db, pairs, release);
  }
  instantiated(subject: string, release: string): readonly (readonly [string, string])[] {
    const values = (entity: string, a: string) =>
      this.db
        .prepare(
          "SELECT value FROM di_ref WHERE consumer=? AND entity=? AND attribute=? ORDER BY value",
        )
        .all(this.options.consumer, entity, a)
        .map((r) => String(r["value"]));
    const loc = values(subject, "location");
    const byPath: Record<DependencyPath, readonly string[]> = {
      subject: [subject],
      location: loc,
      jurisdiction: loc.flatMap((l) => values(l, "jurisdiction")),
      documents: values(subject, "documents"),
      decisions: values(subject, "decisions"),
    };
    return [
      ...new Set(
        this.plan(release).pairs.flatMap(([path, a]) =>
          byPath[path].map((e) => JSON.stringify([e, a])),
        ),
      ),
    ]
      .map((s) => JSON.parse(s) as [string, string])
      .sort(([e, a], [f, b]) => (e < f ? -1 : e > f ? 1 : a < b ? -1 : a > b ? 1 : 0));
  }
  // [EXP-DI01] Why: pinned I/O precedes BEGIN; post-state values depend only on immutable page coordinates. Rejected: latest reads on a retry (divergent index).
  async prepare(page: FeedPage): Promise<ConsumerDeriver> {
    // [EXP-DI01] Why: a prepared reader result belongs to exact page bytes, including on retry. Rejected: matching coordinates alone after a caller changes the page.
    const entryKey = (e: FeedPage["entries"][number]) =>
      JSON.stringify([e.stream, e.epoch, e.offset]);
    const preparedBytes = new Map(page.entries.map((e) => [entryKey(e), feedBytes(e)]));
    const cursorBytes = JSON.stringify(page.cursor);
    const byPosition = new Map<
      string,
      {
        epoch: string;
        position: string;
        changes: Extract<
          FeedPage["entries"][number],
          { kind: "commit" }
        >["transactions"][number]["changes"][number][];
      }
    >();
    for (const entry of page.entries)
      if (entry.kind === "commit")
        for (const tx of entry.transactions)
          for (const position of tx.positions) {
            const key = `${entry.epoch}/${position}`;
            if (byPosition.has(key)) throw Error("Duplicate dependency position");
            byPosition.set(key, {
              epoch: entry.epoch,
              position,
              changes: tx.changes.filter((c) => c.position === position),
            });
          }
    const prepared = new Map<string, readonly ReferenceRow[]>();
    for (const [key, p] of byPosition) {
      const needed = p.changes.filter(
        (c) =>
          references.has(c.attribute) ||
          (c.entity === "p5:tenant" && c.attribute === "p5/activation"),
      );
      for (const c of needed)
        if (c.validFrom > this.options.validAt || c.validTo !== null)
          throw Error("DI01 requires fixed-valid-time references");
      if (!needed.length) continue;
      const position = Number(p.position);
      if (!Number.isSafeInteger(position)) throw Error("Reference position exceeds safe integer");
      const entities = [...new Set(needed.map((c) => c.entity))];
      const rows = await this.options.readRefs(entities, position, this.options.validAt);
      for (const r of rows)
        if (
          !entities.includes(r.entity) ||
          !Number.isSafeInteger(r.position) ||
          r.position < 1 ||
          r.position > position ||
          (r.retractedPosition !== undefined && r.retractedPosition <= position) ||
          r.validFrom > this.options.validAt ||
          r.validTo !== undefined
        )
          throw Error("Pinned reference reader returned invalid basis");
      prepared.set(
        key,
        rows.map((r) => ({ ...r })),
      );
    }
    return (db, freshPage) => {
      if (
        JSON.stringify(freshPage.cursor) !== cursorBytes ||
        freshPage.entries.some((e) => preparedBytes.get(entryKey(e)) !== feedBytes(e))
      )
        throw Error("Prepared dependency page changed");
      const c = this.options.consumer,
        affected: AffectedSubject[] = [];
      // [EXP-DI01] Why: durable state must retain its V and compiled release identity across restarts. Rejected: silently reusing an index with different options.
      const config = JSON.stringify([
        this.options.validAt,
        this.options.initialRelease,
        this.options.plans
          .map((p) => [
            p.release,
            p.pairs
              .map((pair) => [...pair])
              .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
          ])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      ]);
      const prior = db.prepare("SELECT config FROM di_config WHERE consumer=?").get(c);
      if (prior && prior["config"] !== config) throw Error("Dependency configuration changed");
      db.prepare("INSERT OR IGNORE INTO di_config VALUES(?,?)").run(c, config);
      const fresh = new Set(
        freshPage.entries.flatMap((e) =>
          e.kind === "commit"
            ? e.transactions.flatMap((t) => t.positions.map((p) => `${e.epoch}/${p}`))
            : [],
        ),
      );
      const positions = [...byPosition]
        .filter(([k]) => fresh.has(k))
        .map(([, p]) => p)
        .sort((a, b) =>
          BigInt(a.epoch) < BigInt(b.epoch)
            ? -1
            : BigInt(a.epoch) > BigInt(b.epoch)
              ? 1
              : BigInt(a.position) < BigInt(b.position)
                ? -1
                : 1,
        );
      for (const p of positions) {
        const release = this.release(db);
        const subjects = this.reachIn(
          db,
          p.changes.map((r) => [r.entity, r.attribute]),
          release,
        );
        affected.push(
          ...subjects.map((subject) => ({ epoch: p.epoch, position: p.position, subject })),
        );
        for (const change of p.changes) {
          if (change.op !== "assert")
            db.prepare("DELETE FROM di_boundary WHERE consumer=? AND kind IN (?,?)").run(
              c,
              `fact.from:${change.assertionId}`,
              `fact.to:${change.assertionId}`,
            );
          else
            for (const [edge, at] of [
              ["from", change.validFrom],
              ["to", change.validTo],
            ] as const)
              if (at !== null && at > this.options.validAt) {
                for (const subject of this.reachIn(
                  db,
                  [[change.entity, change.attribute]],
                  release,
                ))
                  db.prepare("INSERT OR IGNORE INTO di_boundary VALUES(?,?,?,?,?)").run(
                    c,
                    subject,
                    at,
                    `fact.${edge}:${change.assertionId}`,
                    p.position,
                  );
              }
        }
        const rows = prepared.get(`${p.epoch}/${p.position}`) ?? [];
        const changed = new Map(
          p.changes
            .filter((r) => references.has(r.attribute))
            .map((r) => [JSON.stringify([r.entity, r.attribute]), r]),
        );
        for (const r of changed.values()) {
          db.prepare("DELETE FROM di_ref WHERE consumer=? AND entity=? AND attribute=?").run(
            c,
            r.entity,
            r.attribute,
          );
          for (const value of rows.filter(
            (v) => v.entity === r.entity && v.attribute === r.attribute,
          ))
            db.prepare("INSERT OR IGNORE INTO di_ref VALUES(?,?,?,?)").run(
              c,
              r.entity,
              r.attribute,
              value.value,
            );
        }
        if (p.changes.some((r) => r.entity === "p5:tenant" && r.attribute === "p5/activation")) {
          const next = this.options.resolveActivation(
            rows.filter((r) => r.entity === "p5:tenant" && r.attribute === "p5/activation"),
            Number(p.position),
            this.options.validAt,
          );
          this.plan(next);
          db.prepare(
            "INSERT INTO di_release VALUES(?,?) ON CONFLICT(consumer) DO UPDATE SET release=excluded.release",
          ).run(c, next);
        }
      }
      return affected;
    };
  }
  async consume(
    expected: FeedCursor | null,
    page: FeedPage,
    crash?: (point: FeedCrashPoint) => void,
  ): Promise<void> {
    const derive = await this.prepare(page);
    this.applyDerived(this.options.consumer, expected, page, derive, crash);
  }
  affectedAt(consumer: string, epoch: string, position: string): string[] {
    return this.db
      .prepare(
        "SELECT subject FROM affected WHERE consumer=? AND epoch=? AND position=? ORDER BY subject",
      )
      .all(consumer, epoch, position)
      .map((r) => String(r["subject"]));
  }
  due(consumer: string, untilValidTime: number): Boundary[] {
    return this.db
      .prepare(
        "SELECT subject,at,kind FROM di_boundary WHERE consumer=? AND at<=? ORDER BY at,subject,kind",
      )
      .all(consumer, untilValidTime)
      .map((r) => ({
        subject: String(r["subject"]),
        at: Number(r["at"]),
        kind: String(r["kind"]),
      }));
  }
  recordObligations(
    subject: string,
    basisPosition: string,
    boundaries: readonly { at: number; kind: string }[],
  ): void {
    if (
      !/^(0|[1-9][0-9]*)$/.test(basisPosition) ||
      boundaries.some((b) => !Number.isFinite(b.at) || !b.kind)
    )
      throw Error("Invalid obligation basis/boundary");
    const c = this.options.consumer;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.db
        .prepare("SELECT position FROM di_basis WHERE consumer=? AND subject=?")
        .get(c, subject);
      if (!prior || BigInt(basisPosition) > BigInt(String(prior["position"]))) {
        this.db
          .prepare("DELETE FROM di_boundary WHERE consumer=? AND subject=? AND kind LIKE 'rule:%'")
          .run(c, subject);
        for (const b of boundaries)
          this.db
            .prepare("INSERT OR IGNORE INTO di_boundary VALUES(?,?,?,?,?)")
            .run(c, subject, b.at, `rule:${b.kind}`, basisPosition);
        this.db
          .prepare(
            "INSERT INTO di_basis VALUES(?,?,?) ON CONFLICT(consumer,subject) DO UPDATE SET position=excluded.position",
          )
          .run(c, subject, basisPosition);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
}
