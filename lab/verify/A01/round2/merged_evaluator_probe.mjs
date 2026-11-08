// [CX-VA01-R2] Why: distinguish fixed contract reference semantics from imported evaluator behavior. Rejected: inferring evaluator integration from Python-only passes.
import { readFileSync } from 'node:fs';
import { recompute, canonText } from './scratch/lab/bin/claim.mjs';
const v = JSON.parse(readFileSync(new URL('./scratch/lab/verify/A01/replay-aggregate-answer.json', import.meta.url), 'utf8'));
const b = Buffer.from(canonText(v));
console.log(JSON.stringify({ sameRealReplayPayload: recompute('CMP-BAG-ROWS', b, b), samePayloadExact: recompute('CMP-EXACT-VALUE', b, b), note: 'Pure comparator probe only; no qualification or engine run.' }, null, 2));
