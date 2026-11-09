#!/usr/bin/env node
// Print receipts without identity blocks, one JSON line each. Usage: node dump.mjs <receiptsDir> <substring>...
import fs from 'node:fs';
import path from 'node:path';
const [dir, ...needles] = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  if (needles.length && !needles.some((n) => f.includes(n))) continue;
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  delete r.identity; delete r.format; delete r.armLabel;
  console.log(JSON.stringify(r) + '\n');
}
