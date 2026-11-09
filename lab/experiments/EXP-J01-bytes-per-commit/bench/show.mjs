// EXP-J01: print the essentials of an attribution output file (xtdb-attribution or qlever-attribution).
// Usage: node show.mjs <output-file>...
import fs from 'node:fs';

for (const file of process.argv.slice(2)) {
  const text = fs.readFileSync(file, 'utf8');
  const o = JSON.parse(text.slice(text.indexOf('{')));
  console.log(`== ${file}\n${o.receipt} ${o.lane} ${o.commitEncoding}`);
  if (o.lane === 'xtdb') {
    console.log('real (facts, bytes, params):', JSON.stringify(o.real.map((x) => [x.facts, x.recordBytes, x.params])), 'closure:', JSON.stringify(o.closure));
    for (const x of o.increments) console.log(`  ${String(x.bytes).padStart(6)}  ${x.source}`);
    for (const v of o.variants) console.log(`  variant saves ${v.savedVsFull}: ${v.variant}`);
  } else {
    console.log('closure:', JSON.stringify(o.closure));
    for (const c of o.perCommand) console.log(`  facts ${c.facts}: ${JSON.stringify(c.bySource)} text ${c.updateTextBytes} B`);
  }
}
