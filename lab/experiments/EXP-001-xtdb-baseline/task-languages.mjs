// EXP-001: per-task language accounting from a G2 receipt (cases[].languages, answerLanguages, languageClass)
// and the raw report's queryTrace (step kinds). Usage: node langs.mjs <receipt.json> <g2-report.json>
import fs from 'node:fs';
const receipt = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const report = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const byTask = new Map();
for (const c of receipt.cases) {
  const t = byTask.get(c.caseId) ?? { modes: {} };
  t.modes[c.mode] = c;
  byTask.set(c.caseId, t);
}
const cls = (set) => (set.size === 0 ? 'none' : set.size > 1 ? 'hybrid' : [...set][0]);
const tally = { answer: {}, strict: {} };
const rows = [];
let modeDisagree = 0;
for (const [task, t] of byTask) {
  const all = Object.values(t.modes);
  const answer = new Set(all.flatMap((c) => c.answerLanguages));
  const strict = new Set([...answer, ...all.flatMap((c) => c.languages)]);
  const a = cls(answer), s = cls(strict);
  if (new Set(all.map((c) => c.languageClass.answer)).size > 1) modeDisagree++;
  tally.answer[a] = (tally.answer[a] ?? 0) + 1;
  tally.strict[s] = (tally.strict[s] ?? 0) + 1;
  rows.push({ task, answer: a, strict: s, substeps: all[0].languages.join(','), modes: Object.keys(t.modes).join('+') });
}
// step kinds per language from the raw traces
const kinds = {};
for (const w of report.workloads) for (const c of w.cases) for (const q of (c.queryTrace ?? []).filter((i) => i?.operation === 'public-native-query')) {
  for (const st of q.steps ?? []) {
    const k = `${st.kind ?? st.name ?? st.role ?? '?'}:${st.language}`;
    kinds[k] = (kinds[k] ?? 0) + 1;
  }
  const k = `answer(${q.language})`;
  kinds[k] = (kinds[k] ?? 0) + 1;
}
console.log(JSON.stringify({ tasks: byTask.size, modeDisagree, tally, kinds }, null, 1));
for (const r of rows.filter((r) => r.answer !== 'xtdb-sql')) console.log(r.task, r.answer, r.strict, r.substeps);
