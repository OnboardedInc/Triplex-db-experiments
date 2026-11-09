// [EXP-P5N-R2] Why: attribute the publisher chain from V8 CPU profiles (node --cpu-prof): self time per function and inclusive time for named functions, per thread file.
// Rejected: eyeballing a flame graph (the numbers must be committed and recomputable). Pure read of .cpuprofile files.
// usage: node p5n-profile.mjs <profile.cpuprofile> [pages] [top]
import fs from "node:fs";
const [file, pagesArg, topArg] = process.argv.slice(2);
const pages = Number(pagesArg ?? 157), top = Number(topArg ?? 25);
const p = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const self = new Map();
for (let i = 0; i < p.samples.length; i++) self.set(p.samples[i], (self.get(p.samples[i]) ?? 0) + (p.timeDeltas[i] ?? 0));
const key = (n) => `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.replace(/^file:\/\/.*\/(worktrees\/p5b|node_modules)\//, "$1/")}:${n.callFrame.lineNumber + 1}`;
const parent = new Map();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const selfByKey = new Map(), inclByKey = new Map();
for (const [id, t] of self) {
  const n = byId.get(id);
  selfByKey.set(key(n), (selfByKey.get(key(n)) ?? 0) + t);
  const seen = new Set();
  for (let c = id; c !== undefined; c = parent.get(c)) {
    const k = key(byId.get(c));
    if (seen.has(k)) continue; // recursion: count once per sample
    seen.add(k);
    inclByKey.set(k, (inclByKey.get(k) ?? 0) + t);
  }
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
const ms = (us) => (us / 1000).toFixed(1);
const row = ([k, t]) => `${ms(t).padStart(9)} ms  ${(t / 1000 / pages).toFixed(2).padStart(7)} ms/page  ${k}`;
console.log(`profile ${file}: total sampled ${ms(total)} ms over ${pages} pages (idle included: ${ms([...byId.values()].filter((n) => n.callFrame.functionName === "(idle)").reduce((a, n) => a + (self.get(n.id) ?? 0), 0))} ms)`);
console.log("--- top self time");
for (const e of [...selfByKey].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(row(e));
console.log("--- inclusive time, selected functions");
const want = /^(transact|commitGroup|check|finalize|encodeCommitGroup|verifyGroup|publishRecords|sync|publishWatermark|purgeFrames|lookup|commandWitness|append|readback|readbackClaims|pullMany|transactionByCommand|canonicalPlain|canonical|decodeCommitGroup|addOverlay|record|submit|withTransaction|buildTransaction|metadataInputs|writeGroup|JSON\.parse|parse|stringify) /;
for (const e of [...inclByKey].filter(([k]) => want.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(row(e));
// callers of a function (optional 4th argument): inclusive time of the named function attributed to the nearest non-recursive caller chain (3 frames up)
const target = process.argv[5];
if (target) {
  const callers = new Map();
  for (const [id, t] of self) {
    const chain = [];
    for (let c = id; c !== undefined; c = parent.get(c)) chain.push(key(byId.get(c)));
    const at = chain.findIndex((k) => k.startsWith(target + " "));
    if (at < 0) continue;
    const rest = chain.slice(at + 1).filter((k) => !k.includes("/w0/dist/json.js"));
    const up = rest.slice(0, 3).map((k) => k.split(" ")[0] + "@" + k.split("/").pop()).join(" <- ");
    callers.set(up, (callers.get(up) ?? 0) + t);
  }
  console.log(`--- callers of ${target}`);
  for (const [k, t] of [...callers].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${ms(t).padStart(9)} ms ${(t / 1000 / pages).toFixed(2).padStart(7)} ms/page  ${k}`);
}
