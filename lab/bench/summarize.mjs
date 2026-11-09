#!/usr/bin/env node
// node lab/bench/summarize.mjs <ns-report.json | NS receipt.json>: one line per bar plus correctness, for humans.
import fs from 'node:fs';
import { latencyReceipt } from '../receipts/latency.mjs';
const doc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const r = doc.format?.startsWith('tx2-gate-receipt') ? { ...doc.ns, priorities: Object.fromEntries(Object.entries(doc.ns?.bars ?? {}).map(([k, v]) => [k, { bars: v }])) } : doc;
const mode = latencyReceipt({ qleverConnectionMode: doc.qleverConnectionMode }).qleverConnectionMode;
const emit = (...args) => console.log(`qleverConnectionMode=${mode ?? "not-applicable"}`, ...args);
const c = r.correctness ?? {};
emit(`status ${doc.status ?? doc.verdict} reads ${c.reads} correct ${c.correct} violations ${c.violations} errors ${c.errors} ${JSON.stringify(c.violationKinds ?? {})}`);
if (r.seed) emit(`seed ${r.seed.seededSubjects}/${r.seed.plannedSubjects} subjects, ${r.seed.assertions} assertions (closed form ${r.seed.assertionsMatchClosedForm}), ${r.seed.factsPerS?.toFixed?.(0)} facts/s`);
if (r.oracle) emit(`oracle ${r.oracle.status} verdict ${r.oracle.oracleVerdict} reads ${r.oracle.reads} queries ${r.oracle.entityQueries} mismatches ${r.oracle.mismatchCount} model-agrees ${r.oracle.modelCorrectOnSameReads} receipts ${r.oracle.receiptConsistency}`);
for (const [p, v] of Object.entries(r.priorities ?? {})) for (const b of v?.bars ?? []) emit(`${p} ${b.pass === true ? 'PASS' : b.pass === false ? 'MISS' : 'n/a '} ${b.id}: ${JSON.stringify(b.value)?.slice(0, 90)} (bar ${b.bar})`);
if (c.violationSample?.length) emit('violation sample', JSON.stringify(c.violationSample.slice(0, 2)).slice(0, 1200));
if (r.oracle?.mismatches?.length) emit('oracle mismatch', JSON.stringify(r.oracle.mismatches.slice(0, 2)).slice(0, 1200));
if (r.oracle?.stderr) emit('oracle stderr', r.oracle.stderr.slice(0, 800));
