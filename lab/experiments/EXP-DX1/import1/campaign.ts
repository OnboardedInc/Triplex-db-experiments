import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { snapshot, bytes, sha } from "./source.ts";
import { ImportRun, ImportLane, pace } from "./lane.ts";
import { openNative } from "./native.ts";
import { actor, type TrafficSpec } from "./traffic.ts";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { execFileSync } from "node:child_process";
import { verifySnapshot, touchedWitness } from "./verify.ts";
export const profiles = [
  { facts: 32, duty: 0.25 },
  { facts: 128, duty: 0.5 },
  { facts: 512, duty: 0.75 },
  { facts: 2000, duty: 1 },
];
type Arm = {
  name: string;
  profile: "deep" | "thin";
  subjects: number;
  facts: number;
  duty: number;
};
type Reading = {
  name: string;
  id: string;
  ms: number;
  facts: number;
  groups: number;
  frames: number;
  sourceSeal?: string;
  complete: boolean;
  exactFacts: number;
  verificationMs: number;
  maxService: number;
  maxBatch: number;
  rate: number;
  scopes: any[];
  raw: string;
};
const output = (file: string, x: unknown) => writeFileSync(file, bytes(x) + "\n", { flag: "wx" });
async function hashFile(path: string) {
  const h = createHash("sha256");
  for await (const c of createReadStream(path)) h.update(c);
  return h.digest("hex");
}
async function arm(
  dir: string,
  config: Arm,
  full: boolean,
  controlMs: number | undefined,
  fixed: number,
): Promise<Reading> {
  mkdirSync(dir);
  const id = randomUUID(),
    scope = (i: number) => "import-live-" + id + "-" + i,
    scopes = full ? 10 : 2,
    readers = full ? 256 : 2;
  const p = pace(config.facts, config.duty),
    lane = new ImportLane(p.duty),
    actors: ReturnType<typeof actor>[] = [];
  const fail = Promise.withResolvers<never>();
  void fail.promise.catch(() => {});
  const specs: TrafficSpec[] = Array.from({ length: scopes }, (_, i) => ({
    scope: scope(i),
    index: i,
    scopes,
    readers: Math.floor(readers / scopes) + Number(i < readers % scopes),
    full,
    dir,
    tag: "traffic-" + id + "-" + i,
    offset: 120000,
    smallWindow: fixed,
  }));
  let run: ImportRun | undefined, target: Awaited<ReturnType<typeof openNative>> | undefined;
  let witnessReader: CompositionHandle | undefined;
  const witnesses: any[] = [];
  try {
    // [DX-ACT1] Why: each scope has its own writer/reader process and an independent native database on the same storage stack. Rejected: timing a single JS loop's contention across ten accounts.
    for (const spec of specs) {
      const a = actor(spec, (d) => lane.observeLive(d));
      actors.push(a);
      a.done.catch(fail.reject);
      await a.ready;
    }
    const ready = await Promise.all(actors.map((a) => a.ready));
    if (controlMs === undefined) {
      target = await openNative(scope(0), "snapshot");
      run = await ImportRun.open(
        target,
        snapshot(config.profile, config.subjects, "incoming/", id),
        p,
        join(dir, "import.sqlite"),
        lane,
      );
    }
    if (run) {
      witnessReader = await openComposition("reach-touched", "datomic", scope(0));
      witnesses.push(
        await touchedWitness(
          witnessReader,
          run.source,
          0,
          await run.target.currentPosition(),
          false,
        ),
      );
    }
    const start = Date.now() + 400;
    const predetermined = controlMs ?? (fixed || Infinity);
    for (const a of actors)
      a.send({
        type: "start",
        at: start,
        ...(Number.isFinite(predetermined) ? { end: start + predetermined } : {}),
      });
    await delay(Math.max(0, start - Date.now()));
    let cutoff: number,
      facts = 0,
      groups = 0,
      frames = 0,
      maxService = 0,
      maxBatch = 0,
      complete = false,
      exactFacts = 0;
    if (run) {
      const r = run;
      const loop = async () => {
        while (Date.now() < start + predetermined) {
          const e = await r.step();
          if (!e) {
            complete = true;
            break;
          }
          const end = Date.now();
          if (end <= start + predetermined) {
            facts += e.facts;
            groups += e.end - e.first;
            frames++;
          }
          maxService = Math.max(maxService, e.serviceMs);
          maxBatch = Math.max(maxBatch, e.facts);
          if (
            !e.first ||
            (e.first <= Math.floor(config.subjects / 2) &&
              e.end > Math.floor(config.subjects / 2)) ||
            e.end === config.subjects
          )
            witnesses.push(
              await touchedWitness(witnessReader!, r.source, e.end - 1, e.position, true),
            );
        }
      };
      await Promise.race([loop(), fail.promise]);
      cutoff = Math.min(Date.now() - start, predetermined);
      if (!Number.isFinite(predetermined))
        for (const a of actors) a.send({ type: "stop", at: start + cutoff });
    } else cutoff = controlMs!;
    const terminals = await Promise.all(actors.map((a) => a.done));
    const verifyStart = performance.now();
    if (run) {
      const fresh = await openNative(scope(0), "snapshot");
      let v;
      try {
        const reopened = await ImportRun.open(fresh, run.source, p, join(dir, "import.sqlite"));
        try {
          v = await verifySnapshot(reopened, complete, "incoming/");
        } finally {
          reopened.close();
        }
      } finally {
        await fresh.close();
      }
      assert(v.facts >= facts && v.groups >= groups);
      if (complete) assert.equal(v.facts, facts);
      exactFacts = v.facts;
      output(join(dir, "verification.json"), { ...v, witnesses });
    }
    const results = [];
    for (const [i, s] of specs.entries()) {
      const terminal = terminals[i];
      assert(
        terminal.tag === s.tag &&
          terminal.scope === s.scope &&
          terminal.digest === "aa8a7636ff027ab3" &&
          terminal.committed === terminal.offered &&
          terminal.seedFacts === ready[i].seedFacts,
      );
      const file = join(dir, "traffic-" + i + ".sqlite"),
        db = new DatabaseSync(file, { readOnly: true });
      let metrics;
      try {
        const quant = (kind: string) => {
          const n = Number(
            db
              .prepare("SELECT count(*) AS n FROM samples WHERE kind=? AND offset>=0 AND offset<?")
              .get(kind, cutoff)!.n,
          );
          const pct = (q: number) =>
            n
              ? Number(
                  db
                    .prepare(
                      "SELECT ms FROM samples WHERE kind=? AND offset>=0 AND offset<? ORDER BY ms LIMIT 1 OFFSET ?",
                    )
                    .get(kind, cutoff, Math.ceil(n * q) - 1)!.ms,
                )
              : null;
          return { n, p50: pct(0.5), p99: pct(0.99) };
        };
        const keys = createHash("sha256");
        for (const x of db
          .prepare(
            "SELECT key,offset FROM samples WHERE kind='commit' AND offset>=0 AND offset<? ORDER BY offset,key",
          )
          .iterate(cutoff))
          keys.update(bytes([String(x.key).slice(s.tag.length), x.offset]) + "\n");
        metrics = { read: quant("read"), commit: quant("commit"), offers: keys.digest("hex") };
      } finally {
        db.close();
      }
      results.push({
        ...terminal,
        ...metrics,
        rawSha256: await hashFile(file),
        people: ready[i].people,
        readers: s.readers,
      });
    }
    const reading = {
      name: config.name,
      id,
      ms: cutoff,
      facts,
      groups,
      frames,
      ...(run ? { sourceSeal: run.source.header.seal } : {}),
      complete,
      exactFacts,
      verificationMs: run ? performance.now() - verifyStart : 0,
      maxService,
      maxBatch,
      rate: (facts * 1000) / cutoff,
      scopes: results,
      raw: dir,
    };
    output(join(dir, "reading.json"), reading);
    return reading;
  } finally {
    for (const a of actors) a.close();
    await witnessReader?.close();
    run?.close();
    await target?.close();
  }
}
export function compare(b: Reading, r: Reading, server: boolean) {
  assert.equal(b.ms, r.ms);
  assert(
    b.id !== r.id && b.scopes.length === r.scopes.length && r.facts >= 0 && r.exactFacts >= r.facts,
  );
  const scopes = r.scopes.map((v, i) => {
    const base = b.scopes[i];
    assert(
      v.scope !== base.scope &&
        v.people === base.people &&
        v.readers === base.readers &&
        v.seedFacts === base.seedFacts &&
        v.digest === base.digest &&
        v.offers === base.offers &&
        v.commit.n === base.commit.n,
    );
    const ratio = (k: "read" | "commit") =>
      base[k].p99 > 0 && v[k].p99 > 0 ? v[k].p99 / base[k].p99 : null;
    return {
      i,
      read: ratio("read"),
      commit: ratio("commit"),
      readN: [base.read.n, v.read.n],
      commitN: [base.commit.n, v.commit.n],
      baseline: { read: base.read, commit: base.commit },
      during: { read: v.read, commit: v.commit },
    };
  });
  const enough = scopes.every(
    (s) => s.read !== null && s.commit !== null && Math.min(...s.readN, ...s.commitN) >= 500,
  );
  return {
    arm: r.name,
    source: r.sourceSeal,
    rate: r.rate,
    groups: r.groups,
    facts: r.facts,
    complete: r.complete,
    ms: r.ms,
    verificationMs: r.verificationMs,
    maxService: r.maxService,
    maxBatch: r.maxBatch,
    baseline: b.id,
    loaded: r.id,
    scopes,
    classification: server && r.complete && enough ? "measured" : "diagnostic",
    withinProvisional:
      server && r.complete && enough
        ? r.rate >= 3000 && scopes.slice(1).every((s) => s.read! <= 1.5 && s.commit! <= 1.5)
        : null,
  };
}
export async function campaign(
  root: string,
  mode: "local" | "screen" | "deep" | "thin",
  chosen = 1,
  localMs = 2400,
  controlFirst = false,
) {
  mkdirSync(root);
  const full = mode !== "local";
  assert(Number.isInteger(chosen) && profiles[chosen]);
  assert(["local", "screen", "deep", "thin"].includes(mode));
  let binding: string | undefined;
  if (full) {
    assert.equal(process.platform, "linux");
    const file = process.env.DX_IMPORT_BENCH_STAGE!;
    const raw = readFileSync(file),
      stage = JSON.parse(raw.toString()),
      stack = readFileSync(stage.stackFile);
    assert.equal(
      stage.source,
      execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    );
    assert.equal(stage.stage, mode === "screen" ? "screen" + chosen : mode);
    assert.equal(sha(stack), stage.stackHash);
    const s = JSON.parse(stack.toString());
    assert(
      s.prefix === stage.prefix &&
        s.writeUrl === process.env.DATOMIC_URL &&
        s.readUrl === process.env.DATOMIC_READ_URLS,
    );
    binding = sha(raw);
  }
  const arms: Arm[] =
    mode === "local" || mode === "screen"
      ? profiles.map((p, i) => ({
          ...p,
          profile: "thin",
          name: "p" + i,
          subjects: full ? 500000 : 12000,
        }))
      : [
          {
            ...profiles[chosen]!,
            profile: mode,
            name: mode,
            subjects: mode === "deep" ? 100000 : 4500000,
          },
        ];
  const rows = [];
  for (const a of arms.filter((a) => mode !== "screen" || a.name === "p" + chosen)) {
    const before =
      !full && controlFirst
        ? await arm(join(root, a.name + "-control"), a, false, localMs, localMs)
        : undefined;
    const loaded = await arm(join(root, a.name + "-load"), a, full, undefined, full ? 0 : localMs);
    const baseline =
      before ??
      (await arm(join(root, a.name + "-control"), a, full, loaded.ms, full ? 0 : localMs));
    const row = compare(baseline, loaded, full);
    rows.push(row);
    output(join(root, a.name + ".json"), row);
    console.log(
      JSON.stringify({
        name: row.arm,
        rate: row.rate,
        scopes: row.scopes.map((s) => [s.read, s.commit]),
      }),
    );
  }
  const qualifies = rows
    .filter((r) => r.withinProvisional === true)
    .sort((a, b) => b.rate - a.rate);
  output(join(root, "comparison.json"), {
    mode,
    ...(binding ? { binding } : {}),
    rows,
    selected: qualifies[0]?.arm ?? null,
  });
}
if (process.argv[1] === import.meta.filename)
  await campaign(
    process.argv[3]!,
    process.argv[2] as any,
    Number(process.argv[4] ?? 1),
    Number(process.argv[5] ?? 2400),
    process.argv.includes("--control-first"),
  );
