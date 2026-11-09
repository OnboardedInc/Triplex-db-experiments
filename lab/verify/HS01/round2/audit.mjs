// [CX-VHS01-R2] Why: independently recompute retained size and gate claims from source-bound bytes. Rejected: adopting the report or an exit-only receipt as acceptance.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { execFileSync } from "node:child_process";
const out = process.env.VHS01_OUT;
if (!out) throw Error("bound runner required");
const base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01",
  series = "r2-final-cf17f7ba-4dc3-4e5f-8e90-2f491ed9a0c4";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hashFile = async (p) => {
  const h = createHash("sha256");
  for await (const b of fs.createReadStream(p)) h.update(b);
  return h.digest("hex");
};
const indexFile = "lab/experiments/EXP-HS01/evidence-r2.json",
  index = JSON.parse(fs.readFileSync(indexFile));
const expectedIndexHash = fs
  .readFileSync("lab/experiments/EXP-HS01/SHA256SUMS-r2", "utf8")
  .split("\n")
  .find((s) => s.endsWith(indexFile))
  .slice(0, 64);
assert.equal(sha(fs.readFileSync(indexFile)), expectedIndexHash);
const manifestFile = path.join(base, "SHA256SUMS-r2.durable"),
  manifest = fs.readFileSync(manifestFile, "utf8");
const expectedManifestHash = fs
  .readFileSync("lab/experiments/EXP-HS01/SHA256SUMS-r2", "utf8")
  .split("\n")
  .find((s) => s.endsWith("SHA256SUMS-r2.durable"))
  .slice(0, 64);
assert.equal(sha(Buffer.from(manifest)), expectedManifestHash);
const sealed = new Map(
  manifest
    .trimEnd()
    .split("\n")
    .map((s) => [s.slice(s.indexOf("  ") + 2), s.slice(0, s.indexOf("  "))]),
);
const sealedJson = (p) => {
  const bytes = fs.readFileSync(path.join(base, p));
  assert.equal(sha(bytes), sealed.get(p), "sealed object " + p);
  return JSON.parse(bytes);
};
const productFiles = execFileSync(
  "git",
  ["diff", "13ce4978", "dfddd916", "--name-only", "--", "packages"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const product = Object.fromEntries(
  productFiles.map((p) => [p, sha(execFileSync("git", ["show", "dfddd916:" + p]))]),
);
const gateRecords = [];
for (const [name, entry] of Object.entries(index.attempts)) {
  if (
    !name.startsWith(series) ||
    !entry.command ||
    !(name.includes("-hs01-") || name.includes("-kill80-") || name.includes("-evaluator-"))
  )
    continue;
  const r = sealedJson(name + "/receipt.json");
  assert.equal(sha(fs.readFileSync(path.join(base, name, "receipt.json"))), entry.receiptSha256);
  assert.equal(r.sourceStillMatches, true);
  const log = fs.readFileSync(path.join(base, name, "command.log"));
  assert.equal(sha(log), r.logSha256);
  assert.equal(sha(log), sealed.get(name + "/command.log"));
  for (const [p, h] of Object.entries(product))
    assert.equal(r.inputs[p], h, name + " product " + p);
  assert.equal(
    execFileSync("git", ["diff", "dfddd916", r.head, "--", "packages"], { encoding: "utf8" }),
    "",
  );
  gateRecords.push({
    name,
    head: r.head,
    result: r.result,
    sourceStillMatches: r.sourceStillMatches,
    logSha256: r.logSha256,
  });
  if (name.includes("-evaluator-") && r.result.code === 0) {
    assert.match(log.toString(), /# tests 108/);
    assert.match(log.toString(), /# pass 108/);
    assert.match(log.toString(), /# fail 0/);
  }
  if (name.includes("-hs01-") && r.result.code === 0) {
    const m = sealedJson(name + "/measurements.json");
    assert.equal(m.equivalence.reads, 50000);
    assert.equal(m.equivalence.mismatches, 0);
    assert.equal(m.codec.rows, 100000);
    assert.equal(m.codec.fallback, 15508);
    assert.equal(
      Object.values(m.codec.idClasses).reduce((s, n) => s + n, 0),
      m.codec.rows,
    );
  }
  if (name.includes("-kill80-") && r.result.code === 0) {
    const m = sealedJson(name + "/measurements.json");
    assert.equal(m.rounds.length, 81);
    assert.deepEqual(m.errors, []);
    assert.equal(m.acknowledged, 255);
    assert.equal(new Set(m.feedSeen).size, m.feedSeen.length);
    for (const [, p] of m.acks) assert(m.feedSeen.includes(p));
    const rowText = fs.readFileSync("packages/qlever/src/broker/row-codec.ts", "utf8"),
      workerText = fs.readFileSync("packages/qlever/src/broker/sqlite-worker.ts", "utf8");
    const codec = new Function(
      rowText.replace("export const rowCodec", "const rowCodec") + "\nreturn rowCodec",
    )();
    const worker = new Function(
      "rowCodec",
      workerText
        .replace(/import \{ rowCodec \} from "\.\/row-codec.js";/, "")
        .replace("export const sqliteWorker", "const sqliteWorker") + "\nreturn sqliteWorker",
    )(codec);
    for (let i = 0; i < 80; i++) {
      const x = m.rounds[i];
      assert.equal(x.cycle, i);
      assert.equal(x.result.signal, "SIGKILL");
      assert.equal(x.timedOut, false);
      assert.equal(x.barrier, x.mode);
      const event = x.events.find((e) => e.event === "worker-instrumentation");
      assert(event);
      for (const q of event.instrumentation)
        assert.equal(q.originalSha256, sha(Buffer.from(worker)));
    }
    assert.equal(m.rounds[80].result.code, 0);
    gateRecords.at(-1).recovery = {
      stops: 80,
      acknowledgements: m.acknowledged,
      feedPositions: m.feedSeen.length,
      purgeBarriers: m.rounds.filter((x) => x.mode === "purge").length,
      dictionaryBarriers: m.rounds.filter((x) => x.mode === "dictionary-growth").length,
    };
  }
}
assert.equal(
  execFileSync("git", ["diff", "13ce4978", "a9ebe759", "--", "lab/bin", "lab/acceptance"], {
    encoding: "utf8",
  }),
  "",
);
const missing = [...sealed]
  .filter(([p, h]) => !h.startsWith("LINK:") && !fs.existsSync(path.join(base, p)))
  .map(([p, hash]) => ({ path: p, sha256: hash }));
const sizes = [];
for (const name of [series + "-w0-10000", "r2-ulid-diag-w0-10000"]) {
  const m = sealedJson(name + "/seed-manifest.json");
  assert.equal(m.N, 10000);
  assert.equal(m.reference, 434768);
  assert.equal(m.assertions, 4468284);
  assert.equal(m.retractions, 1954);
  assert.equal(m.status, "SEEDED-CONTENT-VERIFIED");
  assert.equal(m.buildsStillMatch, true);
  const gzipFile = path.join(base, name, "seed.ndjson.gz"),
    intent = createHash("sha256");
  const stream = fs.createReadStream(gzipFile).pipe(createGunzip());
  stream.on("data", (b) => intent.update(b));
  let commands = 0,
    assertions = 0,
    retractions = 0;
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    const c = JSON.parse(line);
    assert.equal(c.reference, ++commands);
    assert.equal(c.meta.commandId, "p5:seed:" + c.reference);
    let own = 0;
    for (const op of c.operations) {
      if (op.op === "assert") {
        assertions++;
        own++;
      } else {
        assert.equal(op.op, "retract");
        retractions++;
      }
    }
    assert.equal(c.receipt.triples.length, own);
  }
  assert.equal(intent.digest("hex"), m.intentSha256);
  assert.equal(commands, m.reference);
  assert.equal(assertions, m.assertions);
  assert.equal(retractions, m.retractions);
  const original = path.join(base, name, "store/broker.db");
  let file = original,
    restored = false;
  if (!fs.existsSync(file)) {
    file = process.argv[2] ?? path.join(out, "w0-restored.db");
    if (!fs.existsSync(file)) {
      const space = fs.statfsSync(out);
      if (space.bavail * space.bsize < 5 * 1024 ** 3 + m.logicalBytes + 128 * 1024 ** 2)
        throw Error("restore would cross disk reserve");
      const fd = fs.openSync(file, "wx");
      try {
        execFileSync("/opt/homebrew/bin/zstd", ["-d", "--stdout", original + ".zst"], {
          stdio: ["ignore", fd, "pipe"],
        });
      } finally {
        fs.closeSync(fd);
      }
    }
    restored = true;
  }
  const originalHashFile = name + "/store/ORIGINAL-SHA256SUMS.txt";
  const expectedDbHash =
      sealed.get(name + "/store/broker.db") ??
      (() => {
        const record = fs.readFileSync(path.join(base, originalHashFile));
        assert.equal(sha(record), sealed.get(originalHashFile));
        return record.toString().trim().split(/\s+/)[0];
      })(),
    observedDbHash = await hashFile(file);
  assert.equal(observedDbHash, expectedDbHash);
  // Python's immutable URI avoids any write to the original evidence's WAL/SHM files.
  const script = `import sqlite3,json,sys,urllib.parse\nd=sqlite3.connect('file:'+urllib.parse.quote(sys.argv[1])+'?mode=ro&immutable=1',uri=True)\nr={'sqlite':sqlite3.sqlite_version,'pageCount':d.execute('pragma page_count').fetchone()[0],'pageSize':d.execute('pragma page_size').fetchone()[0],'free':d.execute('pragma freelist_count').fetchone()[0]}\nr['dbstat']=[{'name':a,'bytes':b,'payload':c} for a,b,c in d.execute('select name,sum(pgsize),sum(payload) from dbstat group by name order by name')]\nr['counts']={t:d.execute('select count(*) from '+t).fetchone()[0] for t in ['facts','history','journal','hds']}\nr['idClasses']={t:[list(x) for x in d.execute('select typeof(id),count(*) from '+t+' group by typeof(id)')] for t in ['facts','history','journal']}\nr['frames']=list(d.execute('select count(*),sum(end-offset) from frames').fetchone())\nr['heads']=[list(x) for x in d.execute('select hid,name from hds order by hid')]\nprint(json.dumps(r));d.close()`;
  const observed = JSON.parse(execFileSync("python3", ["-c", script, file], { encoding: "utf8" }));
  const logical = observed.pageCount * observed.pageSize,
    bytesPerFact = logical / assertions;
  assert.equal(logical, m.logicalBytes);
  // [CX-VHS01-R2] Why: SQLite reserves its pending-byte lock page at 1 GiB; btree allocation skips it.
  // Source: pinned sqlite3.c PENDING_BYTE_PAGE and allocation at lines 79886/79904. Rejected: treating this reserved page as missing evidence or a free B-tree page.
  const lockPageBytes =
    observed.pageCount > Math.floor(0x40000000 / observed.pageSize) ? observed.pageSize : 0;
  observed.lockPageBytes = lockPageBytes;
  assert.equal(
    logical,
    observed.dbstat.reduce((s, x) => s + x.bytes, 0) +
      observed.free * observed.pageSize +
      lockPageBytes,
  );
  for (const x of observed.dbstat) {
    const expected = m.dbstat.find((y) => y.name === x.name);
    assert(expected);
    assert.equal(x.bytes, expected.bytes);
    assert.equal(x.payload, expected.payload);
  }
  assert.equal(observed.counts.facts + observed.counts.history, assertions);
  const verdict = logical <= 1400000000 && bytesPerFact <= 300 ? "PASS" : "FAIL";
  assert.equal(verdict, m.sizeVerdict);
  sizes.push({
    name,
    gzipSha256: await hashFile(gzipFile),
    intentChecked: true,
    commands,
    assertions,
    retractions,
    file,
    restored,
    databaseSha256: observedDbHash,
    logical,
    bytesPerFact,
    verdict,
    observed,
  });
}
const predictionDate = execFileSync("git", ["show", "-s", "--format=%cI", "dfddd916"], {
  encoding: "utf8",
}).trim();
const result = {
  reviewedHead: "a9ebe759",
  product: "dfddd916",
  builderIndexSha256: expectedIndexHash,
  builderManifestSha256: expectedManifestHash,
  predictionCommitDate: predictionDate,
  gateRecords,
  postSealMissing: missing,
  sizes,
  evaluatorAndVerifyFilesUnchanged: true,
};
fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify(result, null, 2), { flag: "wx" });
console.log(
  JSON.stringify({
    gates: gateRecords.length,
    missingOriginalPaths: missing.length,
    sizes: sizes.map((x) => ({
      name: x.name,
      assertions: x.assertions,
      bytesPerFact: x.bytesPerFact,
      verdict: x.verdict,
      restored: x.restored,
    })),
  }),
);
