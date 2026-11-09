// [EXP-RQ01-QA3] Why: rerun all original and inherited reviewer tests against the merged source with owned caches.
// Rejected: adopting builder receipts as new verifier execution.
import {fileURLToPath} from 'node:url';
import base from '../round2/suite.config';
export default {...base,cacheDir:fileURLToPath(new URL('../cache/round3-suite',import.meta.url))};
