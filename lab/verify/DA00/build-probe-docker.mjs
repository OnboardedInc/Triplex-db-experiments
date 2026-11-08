#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// [CX-VDA00] Why: stop at the real builder's Docker boundary, recording exactly what would be copied. Rejected: building or retagging the shared image.
const args = process.argv.slice(2);
if (!args.includes('build')) throw new Error('No Docker command except build is permitted by this fixture');
const context = args.at(-1);
const marker = path.join(context, 'datomic/UNVERIFIED-CX-VDA00');
const bytes = fs.readFileSync(marker);
const result = { args, context, unmanifestedPath: marker, unmanifestedSha256: createHash('sha256').update(bytes).digest('hex'),
  marker: bytes.toString(), outcome: 'Unverified extra file reached Docker build; intercepted before any real build' };
fs.writeFileSync(path.join(import.meta.dirname, 'evidence/build-context-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
process.exit(42);
