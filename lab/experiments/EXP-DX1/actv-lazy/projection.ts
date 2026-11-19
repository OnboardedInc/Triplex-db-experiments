import { bytes as wireBytes } from "../import1/source.ts";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { canonical, sha256, W0 } from "../../../bench/lib/w0-world.ts";
import { subjectOf } from "../../../bench/lib/world.ts";
import { epoch, millis, type Event } from "./store.ts";
import type { Format } from "./decision.ts";

type Entry = { e: string; a: string; v: string; from: number; to: number };
export interface Slice {
  cut: number;
  at: string;
  subjects: string[];
  reason: string;
  examined: number;
}
export interface Plan {
  event: number;
  id: string;
  slices: Slice[];
  digest: string;
  antecedent: string;
}
const indexed = new Set([
  "location",
  "jurisdiction",
  "localMinWageCents",
  "stateMinWageCents",
  "payRateCents",
  "documents",
  "decisions",
  "answers",
  "expiresOn",
]);
const validIso = (ms: number) =>
  new Date(Math.floor(ms))
    .toISOString()
    .replace(
      /(\.\d{3})Z$/,
      (_, p) => p + String(Math.round((ms - Math.floor(ms)) * 1000)).padStart(3, "0") + "Z",
    );
export class Projection {
  private readonly db = new DatabaseSync("");
  readonly format: Format;
  private rosterSeal: string | undefined;
  seen = 0;
  at = epoch;
  chain = "";
  readonly scope: string;
  constructor(scope: string, format: Format) {
    this.scope = scope;
    this.format = format;
    this.db.exec(`CREATE TABLE raw(id TEXT PRIMARY KEY,e TEXT,a TEXT,v TEXT,lo REAL,hi REAL);
      CREATE INDEX ea ON raw(e,a); CREATE INDEX reverse_edge ON raw(a,v,e);
      CREATE TABLE roster(s TEXT PRIMARY KEY); CREATE TABLE person(s TEXT PRIMARY KEY,loc TEXT,pay INTEGER); CREATE INDEX rate ON person(loc,pay,s);
      CREATE TABLE place(l TEXT PRIMARY KEY,j TEXT,floor INTEGER,higher INTEGER); CREATE INDEX qualifies ON place(higher,l); CREATE INDEX jurisdiction ON place(j,l);
      CREATE TABLE releases(p INTEGER PRIMARY KEY,f TEXT,h TEXT); CREATE INDEX winners ON releases(f,p,h);
      CREATE TABLE calendar(t TEXT,e TEXT,PRIMARY KEY(t,e));`);
  }
  close() {
    this.db.close();
  }
  private strings(sql: string, ...args: (string | number)[]) {
    return this.db
      .prepare(sql)
      .all(...args)
      .map((x) => String(Object.values(x)[0]));
  }
  private affected(e: string, at: string) {
    if (this.format === "act2-deep") {
      if (/^pl:s[0-9]{8}$/.test(e)) return [e];
      const i = subjectOf(e);
      return i === null ? [] : [W0.placementId(i)];
    }
    if (e.startsWith("pl:") && !e.includes("/")) return [e];
    if (e.startsWith("loc:")) return this.strings("SELECT s FROM person WHERE loc=?", e);
    if (e.startsWith("jur:"))
      return this.strings("SELECT s FROM place JOIN person ON loc=l WHERE j=?", e);
    const v = millis(at);
    return this.strings(
      "SELECT DISTINCT e FROM raw WHERE a IN ('documents','decisions','answers') AND v=? AND lo<=? AND hi>?",
      e,
      v,
      v,
    );
  }
  private attr(e: string, a: string, at: string) {
    const v = millis(at),
      rows = this.strings("SELECT v FROM raw WHERE e=? AND a=? AND lo<=? AND hi>?", e, a, v, v);
    assert(rows.length <= 1, "Ambiguous posting leaves this event open");
    return rows[0] ?? null;
  }
  private refresh(e: string, at: string) {
    if (e.startsWith("jur:")) {
      for (const l of this.strings("SELECT DISTINCT e FROM raw WHERE a='jurisdiction' AND v=?", e))
        this.refresh(l, at);
    } else if (e.startsWith("loc:")) {
      const j = this.attr(e, "jurisdiction", at),
        l = this.attr(e, "localMinWageCents", at),
        state = j ? this.attr(j, "stateMinWageCents", at) : null;
      this.db
        .prepare("INSERT OR REPLACE INTO place VALUES(?,?,?,?)")
        .run(
          e,
          j,
          l === null ? null : Number(l),
          Number(l !== null && (state === null || Number(l) > Number(state))),
        );
    } else if (e.startsWith("pl:") && !e.includes("/")) {
      const pay = this.attr(e, "payRateCents", at);
      this.db
        .prepare("INSERT OR REPLACE INTO person VALUES(?,?,?)")
        .run(e, this.attr(e, "location", at), pay === null ? null : Number(pay));
    }
  }
  private release(at: string) {
    return this.strings(
      "SELECT h FROM releases WHERE f<=? ORDER BY f DESC,p DESC,h DESC LIMIT 1",
      at,
    )[0];
  }
  private transition(
    old: string | undefined,
    now: string | undefined,
  ): { ids: string[]; reason: string; examined: number } {
    if (old === now || [old, now].every((r) => r === W0.R2.hash || r === W0.R3.hash))
      return { ids: [], reason: "no-work-item-rule-change", examined: 0 };
    if (!old || !now)
      return {
        ids: this.strings("SELECT s FROM roster ORDER BY s"),
        reason: "initial-enumeration",
        examined: this.count,
      };
    const ids: string[] = [];
    let leaves = 0;
    for (const l of this.db
      .prepare("SELECT l,floor FROM place INDEXED BY qualifies WHERE higher=1")
      .iterate()) {
      leaves++;
      const hits = this.strings(
        "SELECT s FROM person INDEXED BY rate WHERE loc=? AND pay<?",
        String(l.l),
        Number(l.floor),
      );
      leaves += hits.length;
      ids.push(...hits);
    }
    return { ids, reason: "indexed-wage-delta", examined: leaves };
  }
  get count() {
    return Number(this.db.prepare("SELECT count(*) AS n FROM roster").get()!.n);
  }
  get queryPlans() {
    return [
      "SELECT l,floor FROM place WHERE higher=1",
      "SELECT s FROM person WHERE loc='l' AND pay<1700",
    ].map((q) =>
      this.db
        .prepare("EXPLAIN QUERY PLAN " + q)
        .all()
        .map((x) => x.detail),
    );
  }
  private mapped(change: any): Entry[] {
    const { entityId: e, attribute: a, value: v } = change,
      interval = { from: change.validFrom, to: change.validTo ?? 8.64e15 };
    if (this.format === "w0")
      return indexed.has(a) ? [{ e, a, v: String(v.value), ...interval }] : [];
    const i = subjectOf(e);
    if (i === null) return [];
    const s = W0.placementId(i),
      l = "loc:l" + i,
      j = "jur:j" + i;
    const raw =
      a === ":person/custom-pay-cents"
        ? [[s, "payRateCents", v.value]]
        : a === ":person/custom-local-floor"
          ? [
              [s, "location", l],
              [l, "localMinWageCents", v.value],
            ]
          : a === ":person/custom-state-floor"
            ? [
                [l, "jurisdiction", j],
                [j, "stateMinWageCents", v.value],
              ]
            : a === ":file/expiresOn"
              ? [[s, "expiresOn", v.value]]
              : [];
    return raw.map(([e, a, v]) => ({ e, a, v: String(v), ...interval }));
  }
  private boundary(at: string, e: string) {
    if (at > this.at) this.db.prepare("INSERT OR IGNORE INTO calendar VALUES(?,?)").run(at, e);
  }
  nextDue() {
    return this.strings("SELECT t FROM calendar ORDER BY t LIMIT 1")[0];
  }
  advance(tx: any): Plan | undefined {
    assert.equal(tx.position, this.seen + 1, "Projection requires an unbroken source prefix");
    const prefix = this.chain,
      nextChain = sha256(canonical([prefix, tx.txId, tx.position, tx.correlationId ?? null]));
    if (tx.actor !== "lazy/input") {
      assert(
        ["lazy/event", "lazy/ack", "lazy/live", "lazy/bootstrap"].includes(tx.actor),
        "Unqualified writer in lazy scope",
      );
      this.seen = tx.position;
      this.chain = nextChain;
      return;
    }
    const { event, intent } = JSON.parse(tx.correlationId).context as {
      event: Event;
      intent: string;
    };
    assert(W0.isInstant(event.at) && event.at >= this.at && /^[a-f0-9]{64}$/.test(intent));
    const claimed = JSON.parse(tx.correlationId).context;
    assert.equal(claimed.profile, this.format, "Foreign projection generation");
    const original = tx.changes
      .filter((r: any) => !r.entityId.startsWith("lazy/"))
      .map((r: any) =>
        r.op === "retract"
          ? { op: "retract", id: r.tripleId }
          : {
              op: "assert",
              entityId: r.entityId,
              attribute: r.attribute,
              value: r.value,
              validFrom: r.validFrom,
              ...(r.validTo == null ? {} : { validTo: r.validTo }),
            },
      );
    assert.equal(
      sha256(wireBytes([this.scope, tx.commandId, event, original])),
      intent,
      "Source projection differs from original command",
    );
    const parts: Slice[] = [];
    const append = (
      cut: number,
      at: string,
      set: Iterable<string>,
      reason: string,
      examined: number,
    ) => {
      const subjects = [...new Set(set)].sort();
      parts.push({ cut, at, subjects, reason, examined });
    };
    this.db.exec("BEGIN IMMEDIATE");
    const priorAt = this.at,
      priorSeal = this.rosterSeal;
    try {
      for (let due = this.nextDue(); due && due <= event.at; due = this.nextDue()) {
        const entries = this.strings("SELECT e FROM calendar WHERE t=? ORDER BY e", due);
        const old = this.release(this.at),
          touched = new Set<string>();
        for (const e of entries) {
          for (const s of this.affected(e, this.at)) touched.add(s);
          this.refresh(e, due);
          for (const s of this.affected(e, due)) touched.add(s);
        }
        const delta = this.transition(old, this.release(due));
        for (const s of delta.ids) touched.add(s);
        append(
          tx.position - 1,
          due,
          touched,
          "business-boundary/" + delta.reason,
          entries.length + delta.examined,
        );
        this.db.prepare("DELETE FROM calendar WHERE t=?").run(due);
        this.at = due;
      }
      this.at = event.at;
      const old = this.release(this.at),
        entities = new Set<string>(),
        dirty = new Set<string>();
      if (event.kind === "activation") {
        assert(this.rosterSeal, "Incomplete independent roster");
        assert.equal(tx.changes.length, 1);
        const a = tx.changes[0];
        assert(
          a.op === "assert" &&
            a.entityId === "lazy/account/releases" &&
            canonical(JSON.parse(a.value.value)) === canonical({ ...event, profile: this.format }),
        );
        this.db
          .prepare("INSERT INTO releases VALUES(?,?,?)")
          .run(tx.position, event.from!, event.release!);
        this.boundary(event.from!, "@activation");
      }
      for (const c of tx.changes) {
        if (c.entityId === "members/seal") {
          const seal = JSON.parse(c.value.value),
            members = this.strings("SELECT s FROM roster ORDER BY s");
          assert(
            c.op === "assert" &&
              c.attribute === "lazy/roster-seal" &&
              seal.n === members.length &&
              seal.hash === sha256(canonical(members)),
            "Incomplete independent roster",
          );
          this.rosterSeal = seal.hash;
          continue;
        }
        if (c.entityId.startsWith("members/page/")) {
          assert(c.op === "assert" && c.attribute === "lazy/members");
          this.rosterSeal = undefined;
          const list: string[] = JSON.parse(c.value.value);
          assert.deepEqual(list, [...new Set(list)].sort());
          for (const s of list) {
            assert(typeof s === "string" && s.startsWith("pl:"));
            this.db.prepare("INSERT INTO roster VALUES(?)").run(s);
            dirty.add(s);
          }
          continue;
        }
        if (c.entityId.startsWith("lazy/")) continue;
        if (c.op === "assert") {
          if (c.validFrom > millis(this.at)) this.boundary(validIso(c.validFrom), c.entityId);
          if (c.validTo != null && c.validTo > millis(this.at))
            this.boundary(validIso(c.validTo), c.entityId);
        }
        entities.add(c.entityId);
        for (const s of this.affected(c.entityId, event.at)) dirty.add(s);
        const entries = this.mapped(c);
        for (const [n, r] of entries.entries()) {
          const id = c.tripleId + "/" + n;
          entities.add(r.e);
          if (c.op === "retract") {
            assert.equal(this.db.prepare("DELETE FROM raw WHERE id=?").run(id).changes, 1);
            continue;
          }
          assert.equal(c.op, "assert");
          this.db
            .prepare("INSERT INTO raw VALUES(?,?,?,?,?,?)")
            .run(id, r.e, r.a, r.v, r.from, r.to);
          if (r.from > millis(this.at)) this.boundary(validIso(r.from), r.e);
          if (r.to < 8.64e15 && r.to > millis(this.at)) this.boundary(validIso(r.to), r.e);
          if (r.a === "expiresOn" && W0.parseDate(r.v) >= 0)
            this.boundary(W0.endOfDay(W0.parseDate(r.v)), r.e);
        }
      }
      for (const e of entities) this.refresh(e, event.at);
      for (const e of entities) for (const s of this.affected(e, event.at)) dirty.add(s);
      const current = this.release(this.at),
        delta = this.transition(old, current);
      if (event.kind === "erase" && event.subject)
        for (const s of this.affected(event.subject, event.at)) dirty.add(s);
      if (current) {
        assert(this.rosterSeal, "An active membership edit needs a verified roster");
        const member = this.db.prepare("SELECT 1 AS found FROM roster WHERE s=?");
        for (const s of [...dirty, ...delta.ids])
          assert(member.get(s), "Unproved candidate membership");
      }
      append(
        tx.position,
        event.at,
        current ? [...dirty, ...delta.ids] : [],
        delta.reason,
        dirty.size + delta.examined,
      );
      for (const sl of parts) {
        Object.freeze(sl.subjects);
        Object.freeze(sl);
      }
      Object.freeze(parts);
      this.db.exec("COMMIT");
      this.seen = tx.position;
      this.chain = nextChain;
      return {
        event: tx.position,
        id: tx.txId,
        slices: parts,
        antecedent: prefix,
        digest: sha256(
          canonical([this.scope, this.format, this.rosterSeal ?? null, tx.txId, nextChain, parts]),
        ),
      };
    } catch (e) {
      this.at = priorAt;
      this.rosterSeal = priorSeal;
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
}
