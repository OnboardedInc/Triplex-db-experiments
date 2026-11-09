// [EXP-W02] Why: only an in-process read through the measured composition grants world admission.
// Rejected: owner files, last-command lookups, old G0 receipts and caller-provided observed digests.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { bounded, requireW0Fingerprint } from '../../bench/lib/g0.ts';
import { readW0Fingerprint } from '../../bench/lib/w0-fingerprint.ts';
import type { CompositionHandle } from '../../bench/lib/composition.ts';
export async function admitWorld(comp: CompositionHandle, input: {
  endpoint: string; scope: string; N: number; oracle: any;
  counts: Record<string, number>; position: number; validAt: number;
}) {
  if (!input.scope || comp.scopeName !== input.scope || comp.backend.url !== input.endpoint || input.oracle?.fingerprint?.basisTx !== input.position)
    throw Error('GS G0 endpoint/scope/basis binding missing');
  const sources = () => {
    if (!Object.keys(input.oracle.sources ?? {}).length) throw Error('GS G0 oracle source binding absent');
    for (const [file, digest] of Object.entries(input.oracle.sources)) {
      const bytes = fs.readFileSync(new URL(file, new URL('../../oracles/domain/', import.meta.url)));
      if (createHash('sha256').update(bytes).digest('hex') !== digest) throw Error('GS G0 oracle source mismatch: ' + file);
    }
  };
  sources();
  const counts = async () => {
    const actual = await comp.storeCounts();
    if (!Object.keys(input.counts).length || Object.entries(input.counts).some(([k, v]) => !Number.isSafeInteger(v) || v < 0 || actual[k] !== v))
      throw Error('GS G0 independent store counts mismatch');
    return actual;
  };
  return bounded(async signal => {
    const before = await counts();
    const observed = await readW0Fingerprint(comp, input.N, { position: input.position, validAt: input.validAt }, signal);
    requireW0Fingerprint(observed, input.oracle, input.N);
    const after = await counts();
    sources();
    return { status: 'MATCHING', endpoint: input.endpoint, scope: input.scope,
      fingerprint: observed, countsBefore: before, countsAfter: after };
  });
}
