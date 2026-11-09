// [EXP-RQ01-QA2] Why: discover only this attempt's derived D-C1 assertion and keep caches owned.
// Rejected: a permanently failing test in normal repository discovery.
import { fileURLToPath } from 'node:url';
const mode=process.env.VRQ01_GUARD;
if(!['original','repair'].includes(mode))throw Error('Explicit guard mode required');
export default {
 cacheDir:fileURLToPath(new URL('../cache/round2-guard',import.meta.url)),
 resolve:{alias:[{find:'@triplex-build/triplex/content',replacement:fileURLToPath(new URL('../content-shim.mjs',import.meta.url))}]},
 test:{include:[`lab/verify/RQ01/round2/guard-${mode}/case.probe.ts`],fileParallelism:false},
};
