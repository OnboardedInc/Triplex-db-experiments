// [CX-VHS01] Why: seal retained raw stores and attempt logs only after their writers close. Rejected: committing bulky evidence or treating a checksum as semantic proof.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VHS01";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const req = createRequire(new URL("../../../../packages/qlever/package.json", import.meta.url));
const entry = req.resolve("better-sqlite3"),
  native = path.resolve(path.dirname(entry), "../build/Release/better_sqlite3.node");
const D = req("better-sqlite3"),
  db = new D(":memory:");
const environment = {
  node: process.version,
  betterSqlite3: req("better-sqlite3/package.json").version,
  sqlite: db.prepare("SELECT sqlite_version() v").get().v,
  driverEntry: entry,
  driverEntrySha256: sha(fs.readFileSync(entry)),
  native,
  nativeSha256: sha(fs.readFileSync(native)),
  engineSlot: null,
  enginesUsed: [],
};
db.close();
fs.writeFileSync(path.join(root, "environment.json"), JSON.stringify(environment, null, 2), {
  flag: "wx",
});
const pins = new Set();
function scan(x) {
  if (!x || typeof x !== "object") return;
  if (typeof x.path === "string" && typeof x.sha256 === "string" && /^[0-9a-f]{64}$/.test(x.sha256))
    pins.add(x.path);
  for (const [k, v] of Object.entries(x)) {
    if (k.includes("/") && typeof v === "string" && /^[0-9a-f]{64}$/.test(v)) pins.add(k);
    scan(v);
  }
}
scan(JSON.parse(fs.readFileSync("lab/acceptance/obligations.json", "utf8")));
const movedPins = [];
for (const p of [...pins].sort()) {
  const old = execFileSync("git", ["show", "257d4d20:" + p]);
  const now = fs.readFileSync(p);
  if (sha(old) !== sha(now)) movedPins.push({ path: p, old: sha(old), new: sha(now) });
}
fs.writeFileSync(
  path.join(root, "pin-audit.json"),
  JSON.stringify(
    {
      base: "257d4d20",
      pinnedPaths: pins.size,
      movedPins,
      contractUnchanged:
        execFileSync("git", ["diff", "13ce4978", "--", "lab/acceptance"], { encoding: "utf8" }) ===
        "",
      productUnchanged:
        execFileSync("git", ["diff", "13ce4978", "--", "packages"], { encoding: "utf8" }) === "",
    },
    null,
    2,
  ),
  { flag: "wx" },
);
const files = fs
  .readdirSync(root, { recursive: true })
  .map(String)
  .filter((p) => fs.statSync(path.join(root, p)).isFile())
  .sort();
const rows = files.map((p) => ({
  path: p,
  bytes: fs.statSync(path.join(root, p)).size,
  sha256: sha(fs.readFileSync(path.join(root, p))),
}));
const manifest = rows.map((r) => r.sha256 + "  " + r.path).join("\n") + "\n";
fs.writeFileSync(path.join(root, "SHA256SUMS"), manifest, { flag: "wx" });
fs.writeFileSync(
  "lab/verify/HS01/SHA256SUMS",
  sha(Buffer.from(manifest)) + "  " + path.join(root, "SHA256SUMS") + "\n",
);
const attempts = files
  .filter((p) => p.endsWith("/receipt.json"))
  .map((p) => {
    const r = JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
    return {
      path: path.dirname(p),
      command: r.command,
      head: r.head,
      result: r.result,
      sourceUnchanged: r.sourceUnchanged,
      start: r.start,
      end: r.end,
    };
  });
fs.writeFileSync(
  "lab/verify/HS01/evidence-index.json",
  JSON.stringify(
    {
      root,
      format: "CX-VHS01-offline-review/1",
      productCommit: "13ce4978",
      reviewedHead: "2f7b42d65976279a13436a6f5d5f7043cb0f3da4",
      files: rows.length,
      bytes: rows.reduce((n, r) => n + r.bytes, 0),
      manifestSha256: sha(Buffer.from(manifest)),
      environment,
      attempts,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    root,
    files: rows.length,
    bytes: rows.reduce((n, r) => n + r.bytes, 0),
    pinnedPaths: pins.size,
    movedPins,
  }),
);
