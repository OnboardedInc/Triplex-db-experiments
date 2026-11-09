// [EXP-QH1] Why: an owned, closed, content-verified HS01 fixture is copied for matched diagnostics.
// Rejected: changing the original fixture, or silently migrating application stores at open.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1";
const source = path.join(base, "baseline-w0-10k/store"),
  dest = path.join(base, "candidate-w0-10k/store");
if (fs.existsSync(dest)) throw Error("Refuse to overwrite retained fixture");
const disk = fs.statfsSync(base),
  free = disk.bavail * disk.bsize,
  logical = fs.statSync(path.join(source, "broker.db")).size;
if (free < 5 * 1024 ** 3 + logical * 1.3)
  throw Error("Resource admission refused: clone/rebuild reserve plus 5 GiB floor");
fs.mkdirSync(dest, { recursive: true });
for (const file of ["broker.db", "ACKED"])
  if (fs.existsSync(path.join(source, file)))
    fs.copyFileSync(path.join(source, file), path.join(dest, file), fs.constants.COPYFILE_FICLONE);
const D = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const db = new D(path.join(dest, "broker.db"));
db.pragma("journal_mode=DELETE");
const counts = {},
  beforeBytes = fs.statSync(path.join(dest, "broker.db")).size;
db.transaction(() => {
  db.exec(
    "INSERT OR IGNORE INTO ents(name) SELECT DISTINCT substr(name,1,instr(name,'/')-1) FROM ents WHERE typeof(name)='text' AND instr(name,'/')>0",
  );
  for (const table of ["facts", "history", "journal"]) {
    const columns = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((r) => r.name);
    const before = db.prepare(`SELECT count(*) n FROM ${table}`).get().n;
    db.exec(`ALTER TABLE ${table} RENAME TO qh1_old_${table}`);
    db.exec(
      `CREATE TABLE ${table}(o INT NOT NULL,e INT NOT NULL,${table === "history" ? "rpos INT NOT NULL," : ""}id BLOB NOT NULL,a INT NOT NULL,pos INT NOT NULL,t INT NOT NULL,v,vf INT,vto INT,c INT,y INT,sv INT,x BLOB,PRIMARY KEY(o,e,${table === "history" ? "rpos," : ""}id)) WITHOUT ROWID`,
    );
    db.exec(
      `INSERT INTO ${table} SELECT owner.eid,${columns.map((c) => "old." + c).join(",")} FROM qh1_old_${table} old JOIN ents e ON e.eid=old.e JOIN ents owner ON owner.name=CASE WHEN instr(e.name,'/')>0 THEN substr(e.name,1,instr(e.name,'/')-1) ELSE e.name END`,
    );
    const after = db.prepare(`SELECT count(*) n FROM ${table}`).get().n;
    if (before !== after) throw Error("Owner migration lost rows");
    // Compare all source columns both ways, not merely counts, before releasing the control copy.
    const selected = columns.join(",");
    for (const [a, b] of [
      [table, `qh1_old_${table}`],
      [`qh1_old_${table}`, table],
    ])
      if (
        db
          .prepare(
            `SELECT 1 FROM (SELECT ${selected} FROM ${a} EXCEPT SELECT ${selected} FROM ${b}) LIMIT 1`,
          )
          .get()
      )
        throw Error("Fixture column mismatch");
    db.exec(
      `DROP TABLE qh1_old_${table}; CREATE ${table === "history" ? "" : "UNIQUE "}INDEX ${table}_id ON ${table}(id)`,
    );
    counts[table] = { before, after };
  }
}).immediate();
db.close();
const sha = (file) => {
  const h = createHash("sha256");
  const fd = fs.openSync(file, "r"),
    buf = Buffer.alloc(4 * 1024 ** 2);
  let n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null))) h.update(buf.subarray(0, n));
  fs.closeSync(fd);
  return h.digest("hex");
};
fs.writeFileSync(
  path.join(base, "fixture-clone.json"),
  JSON.stringify(
    {
      source,
      dest,
      counts,
      beforeBytes,
      afterBytes: fs.statSync(path.join(dest, "broker.db")).size,
      sourceSha256: sha(path.join(source, "broker.db")),
      candidateSha256: sha(path.join(dest, "broker.db")),
      scope: "owned diagnostic fixture only; no application migration",
    },
    null,
    2,
  ),
);
