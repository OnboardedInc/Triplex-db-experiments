// [CX-VQNODELAY-R2] Why: use the declared immutable local dependency without installing or editing package directories.
// Rejected: resolving another Undici version or mutating the main dependency tree.
import { register } from 'node:module';
register('./resolve.mjs', import.meta.url);
