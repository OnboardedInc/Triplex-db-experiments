// [EXP-QH1-R3] Why: step-to-step differences of a few percent sit inside the round-to-round spread of one ABAB run on this loaded host,
// so paired per-round ratios (same roots, same host window, one process per arm) are pooled across every run that contains both arms.
// usage: node pooled.mjs <arm> <refArm> <dir>...   prints the per-round ratios arm/refArm and their median, min, max and n
import fs from "node:fs";
import path from "node:path";
const [arm, ref, ...dirs] = process.argv.slice(2);
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor((s.length - 1) / 2)];
};
const cpu = (f) => med(JSON.parse(fs.readFileSync(f)).segments.map((s) => s.cpuUsPerPull));
const ratios = [];
for (const d of dirs)
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(`-${arm}.json`))) {
    const r = f.split("-")[0];
    const g = path.join(d, `${r}-${ref}.json`);
    if (fs.existsSync(g)) ratios.push(cpu(path.join(d, f)) / cpu(g));
  }
ratios.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    arm,
    ref,
    n: ratios.length,
    median: +med(ratios).toFixed(3),
    min: +ratios[0].toFixed(3),
    max: +ratios.at(-1).toFixed(3),
    mean: +(ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(3),
  }),
);
