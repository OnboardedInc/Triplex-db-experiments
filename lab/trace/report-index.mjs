// @ts-nocheck -- The reporter validates decoded trace records before indexing them.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const primaryNames = new Set(["driver.commit", "driver.expired", "reader.pull", "driver.ryow"]);
const requestTier = (name) =>
  primaryNames.has(name)
    ? 0
    : name === "replica.follow" || /^http .*\/(transactions|journal)$/.test(name)
      ? 1
      : name.startsWith("http ")
        ? 2
        : 3;
const rootCriteria = `(r.tier = 0 OR (r.tier = 1 AND NOT EXISTS
  (SELECT 1 FROM requests owner WHERE owner.trace_id = r.trace_id AND owner.tier = 0)))`;

function* decode(rows) {
  for (const row of rows) yield JSON.parse(row.data);
}

// [DX-BM1] Why: exact joins, interval lookups and ranked quantiles need seekable storage beyond the V8 heap.
// Rejected: retaining every decoded request or dropping overlapping observations to fit a long run.
export class TraceReportIndex {
  constructor(directory, anchor, measures) {
    this.directory = fs.mkdtempSync(path.join(directory, ".trace-report-"));
    this.anchor = anchor;
    this.measures = measures;
    try {
      this.db = new DatabaseSync(path.join(this.directory, "index.sqlite"));
      this.db.exec(`
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        PRAGMA cache_size = -16384;
        PRAGMA temp_store = FILE;
        CREATE TABLE requests (id INTEGER PRIMARY KEY, trace_id TEXT, tier INTEGER, kind TEXT, data TEXT);
        CREATE INDEX requests_by_trace ON requests (trace_id, tier);
        CREATE INDEX requests_by_tier ON requests (tier, id);
        CREATE TABLE events (
          id INTEGER PRIMARY KEY, start REAL, end REAL, layer TEXT, process TEXT, thread INTEGER,
          name TEXT, native_type TEXT, database_hash TEXT, native_t TEXT, data TEXT
        );
        CREATE VIRTUAL TABLE event_windows USING rtree (id, start, end);
        CREATE VIRTUAL TABLE pause_windows USING rtree (id, start, end);
        CREATE VIRTUAL TABLE work_windows USING rtree (id, start, end);
        CREATE INDEX events_by_name ON events (name);
        CREATE INDEX events_by_native ON events (native_type, database_hash, native_t);
        CREATE TABLE resources (id INTEGER PRIMARY KEY, at REAL, process TEXT, name TEXT,
          qualified INTEGER, data TEXT);
        CREATE INDEX resources_by_time ON resources (at);
        CREATE INDEX resources_by_process ON resources (process, name, at);
        CREATE TABLE publications (position INTEGER PRIMARY KEY, data TEXT);
        CREATE TABLE writers (trace_id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE commit_details (id INTEGER PRIMARY KEY, data TEXT);
        CREATE TABLE metrics (group_id INTEGER, ${measures.map((_, i) => "m" + i + " REAL").join(", ")});
        CREATE INDEX metrics_by_group ON metrics (group_id);
        BEGIN;
      `);
      this.statements = new Map();
    } catch (error) {
      this.close();
      throw error;
    }
  }

  prepare(sql) {
    let statement = this.statements.get(sql);
    if (!statement) {
      statement = this.db.prepare(sql);
      this.statements.set(sql, statement);
    }
    return statement;
  }

  addRequest(row) {
    this.prepare("INSERT INTO requests (trace_id, tier, kind, data) VALUES (?, ?, ?, ?)").run(
      row.traceId,
      requestTier(row.name),
      row.kind ?? null,
      JSON.stringify(row),
    );
  }

  addEvent(row) {
    const id =
      this.prepare(`INSERT INTO events (start, end, layer, process, thread, name, native_type,
      database_hash, native_t, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        row.start,
        row.end,
        row.layer,
        row.process ?? null,
        row.thread ?? null,
        row.name,
        row.nativeType ?? null,
        row.databaseHash ?? null,
        row.datomicT ?? null,
        JSON.stringify(row),
      ).lastInsertRowid;
    const interval = [id, row.start - this.anchor, row.end - this.anchor];
    this.prepare("INSERT INTO event_windows VALUES (?, ?, ?)").run(...interval);
    // [DX-BM1] Why: frequent request attribution seeks only pauses or instrumented work.
    // Rejected: scanning unrelated overlapped metrics for every sampled read.
    if (
      row.layer === "typescript-gc" ||
      row.layer === "gateway-gc" ||
      row.nativeType === "triplex.TransactionFunction"
    )
      this.prepare("INSERT INTO pause_windows VALUES (?, ?, ?)").run(...interval);
    if (row.layer === "typescript")
      this.prepare("INSERT INTO work_windows VALUES (?, ?, ?)").run(...interval);
  }

  addResource(row) {
    this.prepare(
      "INSERT INTO resources (at, process, name, qualified, data) VALUES (?, ?, ?, ?, ?)",
    ).run(
      row.at ?? null,
      row.process ?? null,
      row.name ?? null,
      row.clockAlignmentQualified !== false ? 1 : 0,
      JSON.stringify(row),
    );
  }

  finishInputs() {
    this.fallback = !this.prepare(
      "SELECT 1 AS found FROM requests r WHERE " + rootCriteria + " LIMIT 1",
    ).get();
  }

  *roots() {
    // [DX-BM1] Why: the six-core trace made SQLite sort several GiB of request payloads for the OR across tiers.
    // Rejected: changing the root order or dropping follower requests. Each fixed tier can walk its existing (tier,id) index.
    const tier = this.prepare("SELECT data FROM requests WHERE tier = ? ORDER BY id");
    if (this.fallback) {
      yield* decode(tier.iterate(2));
      return;
    }
    yield* decode(tier.iterate(0));
    yield* decode(this.prepare(`SELECT r.data FROM requests r WHERE r.tier = 1 AND NOT EXISTS
      (SELECT 1 FROM requests owner WHERE owner.trace_id = r.trace_id AND owner.tier = 0)
      ORDER BY r.id`).iterate());
  }

  commit(traceId) {
    const result = this.prepare(
      "SELECT r.data FROM requests r WHERE r.trace_id = ? AND r.kind = 'commit' AND " +
        (this.fallback ? "r.tier = 2" : rootCriteria) +
        " ORDER BY r.tier DESC, r.id DESC LIMIT 1",
    ).get(traceId);
    return result ? JSON.parse(result.data) : null;
  }

  requests(traceId) {
    return decode(
      this.prepare("SELECT data FROM requests WHERE trace_id = ? ORDER BY id").iterate(traceId),
    );
  }

  *overlap(start, end, group, filter, ...args) {
    // [DX-BM1] Why: use the R-tree to find candidates, then apply the original double-precision boundary.
    // Rejected: letting the R-tree's single-precision envelope decide whether a request overlaps.
    if (!["event", "pause", "work"].includes(group)) throw Error("unknown event window group");
    yield* decode(
      this.prepare(`SELECT e.data FROM ${group}_windows w CROSS JOIN events e ON e.id = w.id
      WHERE w.start < ? AND w.end > ? AND e.start < ? AND e.end > ? AND (${filter})
      ORDER BY e.start DESC, e.id DESC`).iterate(
        end - this.anchor,
        start - this.anchor,
        end,
        start,
        ...args,
      ),
    );
  }

  events(filter, ...args) {
    return decode(
      this.prepare("SELECT data FROM events WHERE " + filter + " ORDER BY id").iterate(...args),
    );
  }

  eventCount(filter, ...args) {
    return this.prepare("SELECT COUNT(*) AS n FROM events WHERE " + filter).get(...args).n;
  }

  resources(filter, ...args) {
    return decode(
      this.prepare("SELECT data FROM resources WHERE " + filter + " ORDER BY id").iterate(...args),
    );
  }

  pressureSamples() {
    return decode(
      this.prepare(`SELECT data FROM resources
      WHERE process = 'system-linux' ORDER BY at, id`).iterate(),
    );
  }

  setPublication(position, row) {
    this.prepare("INSERT OR REPLACE INTO publications VALUES (?, ?)").run(
      position,
      JSON.stringify(row),
    );
  }

  publication(position) {
    if (!Number.isSafeInteger(position)) return null;
    const row = this.prepare("SELECT data FROM publications WHERE position = ?").get(position);
    return row ? JSON.parse(row.data) : null;
  }

  setWriter(traceId, row) {
    this.prepare("INSERT OR REPLACE INTO writers VALUES (?, ?)").run(traceId, JSON.stringify(row));
  }

  writer(traceId) {
    const row = this.prepare("SELECT data FROM writers WHERE trace_id = ?").get(traceId);
    return row ? JSON.parse(row.data) : null;
  }

  retainCommit({ root, spans }) {
    return this.prepare("INSERT INTO commit_details (data) VALUES (?)").run(
      JSON.stringify({ root, spans }),
    ).lastInsertRowid;
  }

  commitDetails(id) {
    return JSON.parse(this.prepare("SELECT data FROM commit_details WHERE id = ?").get(id).data);
  }

  addMetrics(group, row) {
    this.prepare(
      "INSERT INTO metrics VALUES (" +
        Array(this.measures.length + 1)
          .fill("?")
          .join(", ") +
        ")",
    ).run(
      group,
      ...this.measures.map((key) => {
        const value = row.layers[key] ?? row[key];
        return Number.isFinite(value) ? value : null;
      }),
    );
  }

  quantiles(group) {
    return this.measures.map((_, i) => {
      const column = "m" + i,
        condition = `group_id = ? AND ${column} IS NOT NULL`;
      const count = this.prepare("SELECT COUNT(*) AS n FROM metrics WHERE " + condition).get(
        group,
      ).n;
      if (!count) return [null, null];
      const select = this.prepare(`SELECT ${column} AS v FROM metrics WHERE ${condition}
        ORDER BY ${column} LIMIT 1 OFFSET ?`);
      return [0.5, 0.99].map((p) => select.get(group, Math.ceil(count * p) - 1).v);
    });
  }

  close() {
    try {
      this.db?.close();
    } finally {
      fs.rmSync(this.directory, { recursive: true, force: true });
    }
  }
}
