// [EXP-W02-R2] Why: select and bind the real lane before opening any source, with fresh layout observations.
// Rejected: an environment label on an XTDB handle or a transported old QLever count receipt.
import path from 'node:path';
import type { CompositionHandle } from '../../bench/lib/composition.ts';
import type { Lane } from '../../bench/lib/triplex.ts';
// @ts-ignore -- shared policy is ESM JavaScript.
import { brokerEnv, GS_LANES } from '../lib/policy.mjs';
export interface LaneBinding { lane: Lane; endpoint: string; scope: string; attempt: string; sourceSha256: string; }
export interface Layout {
  baseTriples: number; deltaTriples: number; touchedBlockDelta: number; rebuildThreshold: number; baseGeneration: string;
}
export type LayoutReader = (binding: LaneBinding) => Promise<{ binding: LaneBinding; counts: Layout }>;
export function requireLayout(value: { binding: LaneBinding; counts: Layout }, binding: LaneBinding): Layout {
  if (JSON.stringify(value.binding) !== JSON.stringify(binding)) throw Error('stale or foreign QLever layout observation');
  const c = value.counts;
  if (!c || !c.baseGeneration || ![c.baseTriples, c.deltaTriples, c.touchedBlockDelta, c.rebuildThreshold].every(Number.isSafeInteger) ||
      c.baseTriples < 2 || c.baseTriples <= c.deltaTriples || c.deltaTriples < 0 || c.touchedBlockDelta < 0 || c.rebuildThreshold < 0 || c.deltaTriples > c.rebuildThreshold)
    throw Error('Q91a built base or bounded delta missing');
  return c;
}
export async function openScenarioLane(binding: LaneBinding, options: {
  root: string; brokerDirectory?: string; layoutReader?: LayoutReader;
  open?: (lane: Lane, scope: string, env: Record<string, string>) => Promise<CompositionHandle>;
}) {
  if (!GS_LANES.includes(binding.lane) || !binding.attempt || !binding.sourceSha256 || !binding.endpoint || !binding.scope) throw Error('incomplete lane binding');
  const env = brokerEnv(binding.lane, options.brokerDirectory, path.join(options.root, 'runs'));
  const open = options.open ?? (async (lane, scope, env) => {
    Object.assign(process.env, env);
    return (await import('../../bench/lib/composition.ts')).openComposition('public', lane, scope);
  });
  const comp = await open(binding.lane, binding.scope, env);
  if (comp.backend.name !== binding.lane || comp.backend.url !== binding.endpoint || comp.scopeName !== binding.scope) { await comp.close(); throw Error('opened source differs from lane/endpoint/scope'); }
  const layout = async () => {
    if (binding.lane !== 'qlever') return null;
    if (!options.layoutReader) throw Error('QLever GS requires a measuring-process layout reader (Q91a)');
    const counts = requireLayout(await options.layoutReader(binding), binding);
    return { ...counts, commitPath: env.QLEVER_COMMIT_PATH, brokerDirectory: env.QLEVER_BROKER_DIR, binding };
  };
  try { return { comp, layout, initialLayout: await layout(), env }; }
  catch (error) { await comp.close(); throw error; }
}
