// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-J01: where two arms of a journal-equivalence raw file differ, surface by surface.
// Usage: node equivalence-diff.mjs <raw.json> [surface]
import fs from 'node:fs';

const [file, only] = process.argv.slice(2);
const arms = JSON.parse(fs.readFileSync(file, 'utf8'));
const parsed = arms.map((a) => ({ encoding: a.encoding, reads: JSON.parse(a.reads) }));
for (const surface of Object.keys(parsed[0].reads)) {
  if (only && surface !== only) continue;
  const texts = parsed.map((a) => JSON.stringify(a.reads[surface]));
  if (new Set(texts).size === 1) continue;
  const sorted = parsed.map((a) => {
    const v = a.reads[surface];
    const rows = Array.isArray(v?.results) ? v.results : Array.isArray(v) ? v : null;
    return rows ? JSON.stringify({ ...v, results: rows.map((r) => JSON.stringify(r)).sort() }) : JSON.stringify(v);
  });
  console.log(`${surface}: ${new Set(texts).size} distinct as returned; ${new Set(sorted).size} distinct after sorting result rows`);
  if (new Set(sorted).size > 1) {
    const [a, b] = sorted;
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    console.log(`  first difference at ${i}:\n  ${parsed[0].encoding}: ${a.slice(Math.max(0, i - 120), i + 200)}\n  ${parsed[1].encoding}: ${b.slice(Math.max(0, i - 120), i + 200)}`);
  } else {
    const keys = Object.keys(parsed[0].reads[surface] ?? {});
    console.log(`  keys: ${keys.join(', ')}`);
  }
}
