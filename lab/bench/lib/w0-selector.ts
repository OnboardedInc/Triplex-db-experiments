import { createHash } from "node:crypto";
import { openSync, closeSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { W0, canonical, sha256, worldSha256 } from "./w0-world.ts";

const PAGE = 256;
export interface SelectorCut {
  scope: string;
  generation: string;
  basis: W0.Basis;
  frontier: number;
  erasure: string;
  source: string;
}
export interface IndexSeal {
  cut: SelectorCut;
  roster: string;
  ordered: string;
  prior: string;
  pages: string[];
}
interface Member {
  ordinal: number;
  subject: string;
  world: string;
  ead: number;
  prior: string;
}
export interface Selection {
  ordinal: number;
  subject: string;
  mode: "candidate" | "excluded" | "full";
  world: string;
  output: W0.Output;
}
export function eadRelease(days = 90): W0.CompiledRelease {
  const doc = structuredClone(W0.R1.doc);
  const rule = doc.rules.find((r) => r.id === "DOCEXP")!;
  return W0.compileRelease({
    ...doc,
    name: "R2",
    rules: doc.rules.map((r) =>
      r !== rule
        ? r
        : {
            ...r,
            params: { leadDays: { ...W0.R1.entries.DOCEXP.params.leadDays, ead: days } },
          },
    ),
  });
}
function eligible(next: W0.CompiledRelease) {
  const days = next.entries.DOCEXP.params.leadDays.ead;
  return (
    Number.isSafeInteger(days) &&
    days !== W0.R1.entries.DOCEXP.params.leadDays.ead &&
    next.hash === eadRelease(days).hash &&
    next.hash === W0.compileRelease(next.doc).hash
  );
}
function rosterHashes(roster: readonly string[]) {
  const ordered = createHash("sha256");
  roster.forEach((id, i) => {
    if (i && W0.cmpCodePoints(roster[i - 1]!, id) >= 0)
      throw Error("Roster duplicates or out of order");
    const size = Buffer.alloc(4);
    size.writeUInt32BE(Buffer.byteLength(id));
    ordered.update(size).update(id);
  });
  return { roster: sha256(canonical(roster)), ordered: ordered.digest("hex") };
}
function fresh(path: string) {
  closeSync(openSync(path, "wx"));
  const db = new DatabaseSync(path);
  db.exec("PRAGMA synchronous=FULL");
  return db;
}
function evaluated(world: W0.World, release: W0.CompiledRelease, basis: W0.Basis) {
  const result = W0.evaluateWorld(world, release, basis);
  if ("error" in result) throw Error(result.error + " " + world.subject);
  return result;
}
function hasReachableEad(world: W0.World) {
  const linked = new Set(
    world.facts.filter((f) => f.e === world.subject && f.a === "documents").map((f) => f.v),
  );
  return world.facts.some((f) => linked.has(f.e) && f.a === "docType" && f.v === "ead");
}
const membersQuery =
  "SELECT ordinal,subject,world,ead,prior FROM members WHERE ordinal>=? AND ordinal<? ORDER BY ordinal";
const sealDomain = "W0-1.1.2/subject-documents-docType/v1";
const pageDigest = (rows: readonly Member[]) => sha256(canonical(rows));

// [DX-ACT1] Why: negative membership needs every source world, validated at the same two clocks, including subjects with no facts. Rejected: treating absence from a positive-only feed as proof.
export function buildIndex(
  file: string,
  cut: SelectorCut,
  roster: readonly string[],
  worlds: Iterable<W0.World>,
): IndexSeal {
  if (cut.frontier !== cut.basis.tx || !cut.scope || !cut.generation || !cut.erasure || !cut.source)
    throw Error("Incomplete index cut");
  const seal = {
    cut: structuredClone(cut),
    ...rosterHashes(roster),
    prior: W0.R1.hash,
    pages: [] as string[],
  };
  const db = fresh(file);
  try {
    db.exec(
      "CREATE TABLE members(ordinal INTEGER PRIMARY KEY,subject TEXT NOT NULL UNIQUE,world TEXT NOT NULL,ead INTEGER NOT NULL,prior TEXT NOT NULL); CREATE INDEX ead_owners ON members(ead,ordinal); BEGIN",
    );
    const add = db.prepare("INSERT INTO members VALUES(?,?,?,?,?)");
    let ordinal = 0;
    const page: Member[] = [];
    for (const world of worlds) {
      if (world.subject !== roster[ordinal])
        throw Error("Source differs from independent roster at " + ordinal);
      const old = evaluated(world, W0.R1, cut.basis);
      const row = {
        ordinal,
        subject: world.subject,
        world: worldSha256(world),
        ead: Number(hasReachableEad(world)),
        prior: canonical(old),
      };
      add.run(row.ordinal, row.subject, row.world, row.ead, row.prior);
      page.push(row);
      if (++ordinal % PAGE === 0) {
        seal.pages.push(pageDigest(page));
        page.length = 0;
      }
    }
    if (ordinal !== roster.length) throw Error("Source roster coverage incomplete");
    if (page.length) seal.pages.push(pageDigest(page));
    db.exec("COMMIT");
    return seal;
  } finally {
    db.close();
  }
}

function reversion(old: W0.Output, next: W0.CompiledRelease, cut: SelectorCut) {
  if (old.release !== W0.R1.hash || canonical(old.basis) !== canonical(cut.basis))
    throw Error("Previous output did not come from this cut");
  // [DX-ACT1] Why: an excluded subject retains its rule answers, but every work version includes the new release hash (W0 §8.4). Rejected: copying an old public output verbatim.
  return {
    ...old,
    release: next.hash,
    workItems: old.workItems.map((w) => ({
      ...w,
      version:
        "wv:" +
        sha256(canonical({ inputs: w.inputs, payload: JSON.parse(w.payload), release: next.hash })),
    })),
  };
}

export interface SelectOptions {
  index?: { file: string; seal: IndexSeal };
  checkpoint: string;
  resume?: boolean;
  attempt: string;
  cut: SelectorCut;
  roster: readonly string[];
  release: W0.CompiledRelease;
  world: (id: string) => W0.World;
  onPage: (rows: readonly Selection[]) => void;
  interrupt?: (first: number, point: "bytes" | "checkpoint") => void;
}
export function selectRelease(o: SelectOptions) {
  const hashes = rosterHashes(o.roster);
  const seal = o.index?.seal;
  const use =
    !!seal &&
    existsSync(o.index!.file) &&
    eligible(o.release) &&
    canonical(seal.cut) === canonical(o.cut) &&
    seal.prior === W0.R1.hash &&
    o.cut.frontier === o.cut.basis.tx &&
    seal.roster === hashes.roster &&
    seal.ordered === hashes.ordered &&
    seal.pages.length === Math.ceil(o.roster.length / PAGE);
  const binding = sha256(
    canonical({
      domain: sealDomain,
      attempt: o.attempt,
      cut: o.cut,
      ...hashes,
      prior: W0.R1.hash,
      next: o.release.hash,
      seal: use ? seal : null,
    }),
  );
  const index = use ? new DatabaseSync(o.index!.file, { readOnly: true }) : undefined;
  const db = o.resume ? new DatabaseSync(o.checkpoint, { open: true }) : fresh(o.checkpoint);
  let candidates = 0,
    excluded = 0,
    full = 0,
    replayed = 0,
    reused = 0;
  try {
    if (!o.resume) {
      db.exec(
        "CREATE TABLE cursor(binding TEXT PRIMARY KEY,n INTEGER NOT NULL); CREATE TABLE pages(first INTEGER PRIMARY KEY,bytes TEXT NOT NULL, digest TEXT NOT NULL)",
      );
      db.prepare("INSERT INTO cursor VALUES(?,0)").run(binding);
    }
    const cursor = db.prepare("SELECT binding,n FROM cursor").all();
    const n = Number(cursor[0]?.n);
    if (
      cursor.length !== 1 ||
      cursor[0]!.binding !== binding ||
      !Number.isSafeInteger(n) ||
      n < 0 ||
      n > o.roster.length ||
      (n !== o.roster.length && n % PAGE)
    )
      throw Error("Foreign or invalid selector checkpoint");
    const starts = db
      .prepare("SELECT first FROM pages ORDER BY first")
      .all()
      .map((r) => r.first);
    const claimed = Math.ceil(n / PAGE);
    if (
      starts.length < claimed ||
      starts.length > claimed + Number(n < o.roster.length) ||
      starts.some((v, i) => v !== i * PAGE)
    )
      throw Error("Selector page overlap or gap");
    const read = db.prepare("SELECT bytes,digest FROM pages WHERE first=?");
    const insert = db.prepare("INSERT INTO pages VALUES(?,?,?)");
    const advance = db.prepare("UPDATE cursor SET n=? WHERE binding=? AND n=?");
    const lookup = index?.prepare(membersQuery);
    const positives = index?.prepare(
      "SELECT ordinal FROM members WHERE ead=1 AND ordinal>=? AND ordinal<? ORDER BY ordinal",
    );
    for (let start = 0; start < o.roster.length; start += PAGE) {
      const end = Math.min(start + PAGE, o.roster.length);
      const saved = read.get(start);
      const digest = (bytes: string) => sha256(binding + "/" + start + "/" + bytes);
      if (saved && (typeof saved.bytes !== "string" || saved.digest !== digest(saved.bytes)))
        throw Error("Selector page digest mismatch");
      let rows: Selection[];
      if (start < n) {
        rows = JSON.parse(saved!.bytes as string);
        reused += rows.length;
      } else {
        let members = lookup?.all(start, end) as unknown as Member[] | undefined;
        if (
          members &&
          (members.length !== end - start || pageDigest(members) !== seal!.pages[start / PAGE])
        )
          members = undefined;
        const matches = new Set(positives?.all(start, end).map((r) => r.ordinal));
        rows = o.roster.slice(start, end).map((subject, j) => {
          const ordinal = start + j,
            m = members?.[j];
          if (
            m &&
            (m.ordinal !== ordinal || m.subject !== subject || matches.has(ordinal) !== !!m.ead)
          )
            throw Error("Membership proof differs from roster");
          if (m && !matches.has(ordinal))
            return {
              ordinal,
              subject,
              mode: "excluded",
              world: m.world,
              output: reversion(JSON.parse(m.prior), o.release, o.cut),
            };
          const world = o.world(subject),
            hash = worldSha256(world);
          if (world.subject !== subject || (m && hash !== m.world))
            throw Error("Wrong source at cut");
          return {
            ordinal,
            subject,
            mode: m ? "candidate" : "full",
            world: hash,
            output: evaluated(world, o.release, o.cut.basis),
          };
        });
        const bytes = canonical(rows);
        if (saved) {
          if (bytes !== saved.bytes) throw Error("Recomputed selector page differs");
          replayed += rows.length;
        } else insert.run(start, bytes, digest(bytes));
        o.interrupt?.(start, "bytes");
        if (advance.run(end, binding, start).changes !== 1) throw Error("Selector cursor conflict");
        o.interrupt?.(start, "checkpoint");
      }
      if (
        rows.length !== end - start ||
        rows.some(
          (r, j) =>
            r.ordinal !== start + j ||
            r.subject !== o.roster[start + j] ||
            r.output.subject !== r.subject ||
            r.output.release !== o.release.hash ||
            canonical(r.output.basis) !== canonical(o.cut.basis),
        )
      )
        throw Error("Selector output coverage or cut mismatch");
      for (const r of rows) {
        if (r.mode === "candidate") candidates++;
        else if (r.mode === "excluded") excluded++;
        else if (r.mode === "full") full++;
        else throw Error("Unknown coverage decision");
      }
      o.onPage(rows);
    }
    return {
      candidates,
      excluded,
      full,
      reused,
      replayed,
      subjects: o.roster.length,
      ...hashes,
      binding,
    };
  } finally {
    db.close();
    index?.close();
  }
}
